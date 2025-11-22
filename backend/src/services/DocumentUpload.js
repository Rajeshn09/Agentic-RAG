import Corpora from '../models/Corpora.js';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';


export default class DocumentUpload {

    static async textExtract({ file, file_path }) {
        const formData = new FormData();
        
        if (file) {
            const blob = new Blob([file.buffer], { type: file.mimetype });
            formData.append('file', blob, file.originalname);
        }
        if (file_path) {
            formData.append('file_path', file_path);
        }
        
        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/text/extractor`, {
            method: 'POST',
            body: formData,
            headers: { 'x-api-token': process.env.MICROSERVICE_API_TOKEN }
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Text extraction service failed (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.results?.success) {
            throw new Error(`Text extraction unsuccessful: ${result.error || 'Unknown error'}`);
        }
        
        if (!result.results.text) {
            throw new Error('No text content returned from extraction service');
        }
        
        return result.results.text;
    }
    
    
    static async textChunk({ text }) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for chunking');
        }

        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/text/chunk`, {
            method: 'POST',
            body: JSON.stringify({ text }),
            headers: { 
                'Content-Type': 'application/json',
                'x-api-token': process.env.MICROSERVICE_API_TOKEN
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Text chunking service failed (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.results?.success) {
            throw new Error(`Text chunking unsuccessful: ${result.error || 'Unknown error'}`);
        }
        
        if (!Array.isArray(result.results.chunks)) {
            throw new Error('Invalid chunks format returned from chunking service');
        }
        
        return result.results.chunks;
    }

    static async textEmbed({ chunks, model }) {
        if (!Array.isArray(chunks) || chunks.length === 0) {
            throw new Error('Chunks array is required for embedding');
        }

        if (!model) {
            throw new Error('Embedding model is required');
        }

        const textsToEmbed = chunks.slice(0, 99); // Limit to first 99 chunks to control costs
        
        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/text/embed`, {
            method: 'POST',
            body: JSON.stringify({ 
                texts: textsToEmbed,
                model: model
            }),
            headers: { 
                'Content-Type': 'application/json',
                'x-api-token': process.env.MICROSERVICE_API_TOKEN
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Text embedding service failed (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.results?.success) {
            throw new Error(`Text embedding unsuccessful: ${result.error || 'Unknown error'}`);
        }
        
        if (!Array.isArray(result.results.embeddings)) {
            throw new Error('Invalid embeddings format returned from embedding service');
        }
        
        const embeddings = result.results.embeddings.map(item => {
            if (!item.embedding || !Array.isArray(item.embedding)) {
                throw new Error('Invalid embedding format in response');
            }
            return item.embedding;
        });
        
        if (embeddings.length !== textsToEmbed.length) {
            throw new Error(`Embedding count mismatch: expected ${textsToEmbed.length}, got ${embeddings.length}`);
        }
        
        return embeddings;
    }

    static async textAutotag({ text, model, schema }) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for autotagging');
        }

        const payload = {
            text: text.trim(),
            model: model || process.env.AUTOTAG_MODEL || 'gemini-2.5-flash'
        };
        
        if (schema) {
            payload.schema = schema;
        }
        
        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/structured/autotag`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 
                'Content-Type': 'application/json',
                'x-api-token': process.env.MICROSERVICE_API_TOKEN
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Autotagging service failed (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.results?.success) {
            throw new Error(`Autotagging unsuccessful: ${result.error || 'Unknown error'}`);
        }
        
        return result.results.autotag || {};
    }

    static async uploadDocument({ file, file_path, tenantId, userId, corpusId, embeddingModel, autotagModel, autotagSchema, metadata }) {
        let document = null;
        
        try {
            // Extract text from document
            const text = await ServiceErrorHandler.handleFileProcessing(
                () => this.textExtract({ file, file_path }),
                file ? file.originalname : file_path,
                'text extraction'
            );

            // Validate extracted text
            ServiceErrorHandler.validateBusinessLogic(
                text && text.length > 0,
                'No text content could be extracted from the document',
                { fileName: file ? file.originalname : file_path }
            );

            // Prepare metadata with user context
            const documentMetadata = metadata ? { uploadedBy: userId, ...metadata } : { uploadedBy: userId };

            // Generate autotags if enabled
            let autotag = {};
            if (autotagModel !== false && autotagModel !== 'false') {
                try {
                    autotag = await ServiceErrorHandler.handleServiceOperation(
                        () => this.textAutotag({ 
                            text, 
                            model: autotagModel, 
                            schema: autotagSchema 
                        }),
                        'autotagging service'
                    );
                } catch (autotagError) {
                    console.warn('Autotagging failed, continuing without tags:', autotagError.message);
                    autotag = { error: autotagError.message, fallback: true };
                }
            }
            
            // Create document record
            document = await ServiceErrorHandler.handleDatabaseOperation(
                () => Document.create({
                    tenantId,
                    corpusId,
                    originalFileName: file ? (file.originalname || file.name) : (file_path || 'unknown'),
                    fileType: file ? file.mimetype : 'url',
                    fileSizeBytes: file ? file.size : null,
                    processingStatus: 'PROCESSING',
                    metadata: documentMetadata,
                    autotag,
                    rawText: text
                }),
                'document creation',
                { tenantId, corpusId, fileName: file ? file.originalname : file_path }
            );
            
            ServiceErrorHandler.logOperation('Document created', { 
                documentId: document.id, 
                fileName: document.originalFileName,
                textLength: text.length
            });
            
            // Process text into chunks
            const chunks = await ServiceErrorHandler.handleServiceOperation(
                () => this.textChunk({ text }),
                'text chunking service',
                { documentId: document.id }
            );

            ServiceErrorHandler.validateBusinessLogic(
                chunks && chunks.length > 0,
                'Text chunking produced no results',
                { documentId: document.id, textLength: text.length }
            );
            
            // Generate embeddings for chunks (limit to prevent cost overrun)
            const chunksToProcess = chunks.slice(0, 99);
            if (chunks.length > 99) {
                console.warn(`Document ${document.id}: Processing only first 99 chunks of ${chunks.length} to control costs`);
            }

            const embeddings = await ServiceErrorHandler.handleServiceOperation(
                () => this.textEmbed({ chunks: chunksToProcess, model: embeddingModel }),
                'embedding service',
                { documentId: document.id, chunkCount: chunksToProcess.length }
            );

            ServiceErrorHandler.validateBusinessLogic(
                embeddings && embeddings.length === chunksToProcess.length,
                'Embedding count mismatch with chunks',
                { 
                    documentId: document.id, 
                    expectedEmbeddings: chunksToProcess.length, 
                    receivedEmbeddings: embeddings ? embeddings.length : 0 
                }
            );
            
            // Create chunk records in parallel
            const chunkPromises = chunksToProcess.map((chunkText, index) => 
                ServiceErrorHandler.handleDatabaseOperation(
                    () => Chunk.create({
                        tenantId,
                        corpusId,
                        documentId: document.id,
                        chunkIndex: index,
                        chunkText,
                        tokenCount: chunkText.split(' ').length,
                        embedding: embeddings[index] || null
                    }),
                    'chunk creation',
                    { documentId: document.id, chunkIndex: index }
                )
            );
            
            const createdChunks = await Promise.all(chunkPromises);
            
            ServiceErrorHandler.logOperation('Chunks created', { 
                documentId: document.id,
                chunkCount: createdChunks.length,
                totalChunks: chunks.length
            });
            
            // Update document status to completed
            await ServiceErrorHandler.handleDatabaseOperation(
                () => Document.update(document.id, { 
                    processingStatus: 'COMPLETED' 
                }),
                'document status update',
                { documentId: document.id }
            );
            
            ServiceErrorHandler.logOperation('Document processing completed', { 
                documentId: document.id,
                fileName: document.originalFileName,
                chunkCount: createdChunks.length
            });
            
            return document;
            
        } catch (error) {
            ServiceErrorHandler.logOperation('Document processing failed', { 
                documentId: document?.id,
                fileName: file ? file.originalname : file_path,
                error: error.message
            }, 'error');

            // Update document status if it was created
            if (document) {
                try {
                    await Document.update(document.id, { 
                        processingStatus: 'FAILED',
                        errorMessage: error.message 
                    });
                } catch (updateError) {
                    console.error('Failed to update document status to FAILED:', updateError);
                }
            }
            
            throw error;
        }
    }

}