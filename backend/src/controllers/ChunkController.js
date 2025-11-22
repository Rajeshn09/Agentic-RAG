import Chunk from '../models/Chunk.js';
import DocumentSearch from '../services/DocumentSearch.js';
import { 
    ValidationError, 
    NotFoundError, 
    BusinessLogicError 
} from "../errors/AppError.js";
import { ErrorResponse, ValidationHelper } from "../errors/ErrorResponse.js";
import { ServiceErrorHandler } from "../utils/ServiceErrorHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export default class ChunkController {
    static async createChunk(req, res) {
        try {
            const { tenantId, corpusId, documentId, chunkIndex, chunkText, tokenCount, embedding } = req.body;
            if (!tenantId || !corpusId || !documentId || chunkIndex === undefined || !chunkText) {
                return res.status(400).json({ error: 'tenantId, corpusId, documentId, chunkIndex, and chunkText are required.' });
            }

            // // Optional: Validate that the document belongs to the tenant
            // const chunk = await Chunk.findById(docum);
            // console.log("Chunk:", chunk);
            // if (!chunk || chunk.tenantId !== tenantId) {
            //     return res.status(400).json({ error: 'Chunk does not belong to the specified tenant.' });
            // }

            const created = await Chunk.create({ tenantId, documentId, chunkIndex, chunkText, tokenCount, embedding });
            return res.status(201).json(created);
        } catch (err) {
            console.error('createChunk error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async listChunks(req, res) {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const offset = (page - 1) * limit;

            const { rows, total } = await Chunk.findAll({ limit, offset });
            return res.json({ results: rows, stats: { total, page, limit } });
        } catch (err) {
            console.error('listChunks error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async getChunk(req, res) {
        try {
            const { id } = req.params;
            const chunk = await Chunk.findById(id);
            if (!chunk) {
                return res.status(404).json({ error: 'Chunk not found.' });
            }
            return res.json({ results: chunk });
        } catch (err) {
            console.error('getChunk error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async updateChunk(req, res) {
        try {
            const { id } = req.params;
            const { chunkText, tokenCount, embedding, chunkIndex } = req.body;

            const updated = await Chunk.update(id, { chunkText, tokenCount, embedding, chunkIndex });
            if (!updated) {
                return res.status(404).json({ error: 'Chunk not found.' });
            }
            return res.json({ results: updated });
        } catch (err) {
            console.error('updateChunk error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async deleteChunk(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Chunk.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Chunk not found.' });
            }
            return res.status(204).send();
        } catch (err) {
            console.error('deleteChunk error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static searchChunks = asyncHandler(async (req, res) => {
        const { 
            tenantId, 
            corpusId,
            query,           
            queryEmbedding,  
            embeddingModel,
            rerankModel,
            llmModel,
            prompt,
            similarityThreshold = 0.30,
            filters = {},
            limit = 10 
        } = req.body;

        // Validate required fields
        const requiredErrors = ValidationHelper.validateRequired(req.body, ['tenantId', 'corpusId']);
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            tenantId: 'string',
            corpusId: 'string',
            ...(query && { query: 'string' }),
            ...(embeddingModel && { embeddingModel: 'string' }),
            ...(rerankModel && { rerankModel: 'string' }),
            ...(llmModel && { llmModel: 'string' }),
            ...(prompt && { prompt: 'string' }),
            ...(similarityThreshold !== undefined && { similarityThreshold: 'number' }),
            ...(limit !== undefined && { limit: 'number' })
        });

        const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

        // Validate UUIDs
        ['tenantId', 'corpusId'].forEach(field => {
            if (req.body[field]) {
                const uuidError = ValidationHelper.validateUUID(req.body[field], field);
                if (uuidError) validationErrors[field] = uuidError;
            }
        });

        // Validate query or queryEmbedding presence
        if (!query && !queryEmbedding) {
            validationErrors.query = 'Either query (text) or queryEmbedding is required';
        }

        // Validate queryEmbedding format if provided
        if (queryEmbedding && !Array.isArray(queryEmbedding)) {
            validationErrors.queryEmbedding = 'queryEmbedding must be an array of numbers';
        }

        if (queryEmbedding && Array.isArray(queryEmbedding)) {
            if (queryEmbedding.length === 0) {
                validationErrors.queryEmbedding = 'queryEmbedding cannot be empty';
            }
            if (!queryEmbedding.every(val => typeof val === 'number')) {
                validationErrors.queryEmbedding = 'queryEmbedding must contain only numbers';
            }
        }

        // Validate similarity threshold
        if (similarityThreshold < 0 || similarityThreshold > 1) {
            validationErrors.similarityThreshold = 'similarityThreshold must be between 0 and 1';
        }

        // Validate limit
        if (limit < 1 || limit > 100) {
            validationErrors.limit = 'limit must be between 1 and 100';
        }

        // Validate filters object
        if (filters && typeof filters !== 'object') {
            validationErrors.filters = 'filters must be an object';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        ServiceErrorHandler.logOperation('Document search started', {
            tenantId,
            corpusId,
            hasQuery: !!query,
            hasEmbedding: !!queryEmbedding,
            limit,
            similarityThreshold,
            embeddingModel,
            rerankModel,
            llmModel
        });

        const results = await ServiceErrorHandler.handleExternalService(
            () => DocumentSearch.searchChunks({
                tenantId,
                corpusId,
                query,
                queryEmbedding,
                embeddingModel,
                rerankModel,
                llmModel,
                prompt,
                similarityThreshold,
                filters,
                limit
            }),
            'document search service'
        );

        ServiceErrorHandler.logOperation('Document search completed', {
            tenantId,
            corpusId,
            resultCount: results.list ? results.list.length : 0,
            hasAnswer: !!results.answer
        });

        res.status(200).json(ErrorResponse.success({
            answer: results.answer,
            chunks: results.list,
            count: results.list ? results.list.length : 0,
            searchParams: {
                tenantId,
                corpusId,
                query: query || '[embedding provided]',
                limit,
                similarityThreshold
            }
        }, 'Search completed successfully'));
    });
}