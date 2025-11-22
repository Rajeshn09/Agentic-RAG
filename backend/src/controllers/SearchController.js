import DocumentSearch from '../services/DocumentSearch.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError } from '../errors/AppError.js';
import { ErrorResponse } from '../errors/ErrorResponse.js';

export default class SearchController {
    
    static search = asyncHandler(async (req, res) => {
        const { tenantId, query, searchType = 'vector', limit = 10, threshold = 0.7, corpusId, documentId, embeddingModel } = req.body;
        
        if (!tenantId || !query) {
            throw new ValidationError('tenantId and query are required');
        }
        
        const results = await DocumentSearch.searchByQuery({
            tenantId,
            query,
            searchType,
            limit: Math.min(limit, 100),
            threshold,
            corpusId,
            documentId,
            embeddingModel
        });
        
        return ErrorResponse.success(res, {
            results,
            query,
            searchType,
            count: results.length
        }, 'Search completed successfully');
    });

    static searchWithContext = asyncHandler(async (req, res) => {
        const { tenantId, query, searchType = 'vector', limit = 10, threshold = 0.7, corpusId, documentId, embeddingModel, includeContext = true } = req.body;
        
        if (!tenantId || !query) {
            throw new ValidationError('tenantId and query are required');
        }
        
        const results = await DocumentSearch.searchWithContext({
            tenantId,
            query,
            searchType,
            limit: Math.min(limit, 100),
            threshold,
            corpusId,
            documentId,
            embeddingModel,
            includeContext
        });
        
        return ErrorResponse.success(res, {
            results,
            query,
            searchType,
            count: results.length
        }, 'Context search completed successfully');
    });

    static recommendSimilar = asyncHandler(async (req, res) => {
        const { tenantId, chunkId, limit = 5, threshold = 0.8, excludeSameDocument = false } = req.body;
        
        if (!tenantId || !chunkId) {
            throw new ValidationError('tenantId and chunkId are required');
        }
        
        const results = await DocumentSearch.recommendSimilar({
            tenantId,
            chunkId,
            limit: Math.min(limit, 50),
            threshold,
            excludeSameDocument
        });
        
        return ErrorResponse.success(res, {
            results,
            chunkId,
            count: results.length
        }, 'Similar chunks found successfully');
    });

    static advancedSearch = asyncHandler(async (req, res) => {
        const { 
            tenantId, 
            query, 
            filters = {}, 
            searchType = 'vector', 
            limit = 10, 
            threshold = 0.7, 
            embeddingModel 
        } = req.body;
        
        if (!tenantId || !query) {
            throw new ValidationError('tenantId and query are required');
        }
        
        const results = await DocumentSearch.searchWithFilters({
            tenantId,
            query,
            filters,
            searchType,
            limit: Math.min(limit, 100),
            threshold,
            embeddingModel
        });
        
        return ErrorResponse.success(res, {
            results,
            query,
            filters,
            searchType,
            count: results.length
        }, 'Advanced search completed successfully');
    });
}