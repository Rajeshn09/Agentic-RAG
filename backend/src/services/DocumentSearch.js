import Chunk from '../models/Chunk.js';
import DocumentUpload from './DocumentUpload.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';
import { ValidationError, BusinessLogicError } from '../errors/AppError.js';

export default class DocumentSearch {
    
    static async searchChunks({ tenantId, corpusId, query, queryEmbedding, embeddingModel, filters = {}, limit = 10, rerankModel = 'rerank-2.5', llmModel = 'gemini-2.5-flash', prompt = null, similarityThreshold = 0.30 }) {
        // Input validation
        ServiceErrorHandler.validateBusinessLogic(
            tenantId && corpusId,
            'tenantId and corpusId are required'
        );

        ServiceErrorHandler.validateBusinessLogic(
            query || queryEmbedding,
            'Either query (text) or queryEmbedding is required'
        );

        let embedding = queryEmbedding;

        // Generate embedding if not provided
        if (query && !queryEmbedding) {
            ServiceErrorHandler.validateBusinessLogic(
                embeddingModel,
                'embeddingModel is required when providing text query'
            );

            const embeddings = await ServiceErrorHandler.handleServiceOperation(
                () => DocumentUpload.textEmbed({ 
                    chunks: [query], 
                    model: embeddingModel 
                }),
                'embedding service',
                { query: query.substring(0, 100) + '...', model: embeddingModel }
            );
            
            ServiceErrorHandler.validateBusinessLogic(
                embeddings && embeddings.length > 0,
                'Failed to generate embedding for query'
            );
            
            embedding = embeddings[0];
        }

        // Step 1: Get initial search results
        const rawResults = await ServiceErrorHandler.handleDatabaseOperation(
            () => Chunk.ragSearch(
                tenantId,
                corpusId,
                embedding,
                filters,
                Math.min(limit * 2, 100), // Get more results for filtering
                similarityThreshold
            ),
            'vector search',
            { tenantId, corpusId, limit, similarityThreshold }
        );

        // No need to filter again since it's done in the database
        const searchResults = rawResults;

        if (searchResults.length === 0) {
            return {
                answer: "No relevant information found for your query.",
                list: []
            };
        }

        // Step 2: Re-rank the results
        const documents = searchResults.map(chunk => chunk.chunkText);
        
        let rerankedResults;
        if (query && searchResults.length > 0) {
            try {
                const rerankResponse = await ServiceErrorHandler.handleExternalService(
                    () => fetch(`${process.env.MICROSERVICE_API_URL}/api/text/rerank`, {
                        method: 'POST',
                        body: JSON.stringify({
                            query,
                            documents,
                            model: rerankModel,
                            top_k: Math.min(searchResults.length, limit)
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-token': process.env.MICROSERVICE_API_TOKEN
                        }
                    }),
                    'reranking service'
                );

                const rerankData = await rerankResponse.json();
                if (rerankData.result?.data) {
                    // Map re-ranked results back to original chunk data
                    rerankedResults = rerankData.result.data.map(item => ({
                        ...searchResults[item.index],
                        relevance_score: item.relevance_score
                    }));
                } else {
                    throw new Error('Invalid reranking response format');
                }
            } catch (rerankError) {
                console.warn('Re-ranking failed, using original order:', rerankError.message);
                rerankedResults = searchResults.slice(0, limit);
            }
        } else {
            rerankedResults = searchResults.slice(0, limit);
        }

        // Step 3: Prepare content for LLM
        const content = rerankedResults.map((chunk, index) => 
            `[Document ${index + 1}]\n${chunk.chunkText}\n`
        ).join('\n');

        // Step 4: Generate answer using LLM
        const finalPrompt = prompt || `Based on the following documents, please provide a comprehensive answer to the user's query: "${query || '[Query from embedding]'}"\n\nDocuments:\n${content}\n\nPlease provide a clear and accurate answer based solely on the information provided in the documents.`;

        let answer = "Unable to generate answer at this time.";
        try {
            const llmResponse = await ServiceErrorHandler.handleExternalService(
                () => fetch(`${process.env.MICROSERVICE_API_URL}/api/llm/service`, {
                    method: 'POST',
                    body: JSON.stringify({
                        prompt: finalPrompt,
                        content: content,
                        model: llmModel
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-token': process.env.MICROSERVICE_API_TOKEN
                    }
                }),
                'LLM service'
            );

            const llmData = await llmResponse.json();
            if (llmData.result) {
                answer = llmData.result;
            } else {
                throw new Error('No result returned from LLM service');
            }
        } catch (llmError) {
            console.error('LLM generation failed:', llmError.message);
            answer = `Based on the retrieved documents, I found ${rerankedResults.length} relevant chunks but couldn't generate a synthesized answer due to a service error. Please review the individual chunks below.`;
        }

        // Step 5: Return structured response
        return {
            answer,
            list: rerankedResults.map(chunk => ({
                id: chunk.id,
                chunkText: chunk.chunkText,
                chunkIndex: chunk.chunkIndex,
                documentId: chunk.documentId,
                similarity: chunk.similarity,
                relevance_score: chunk.relevance_score || chunk.similarity,
                autotag: chunk.autotag
            }))
        };
    }
}