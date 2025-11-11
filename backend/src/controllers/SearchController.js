import DocumentSearch from '../services/DocumentSearch.js';

export default class SearchController {
    
    static async search(req, res) {
        try {
            const { tenantId, query, searchType = 'vector', limit = 10, threshold = 0.7, corpusId, documentId, embeddingModel } = req.body;
            
            if (!tenantId || !query) {
                return res.status(400).json({ 
                    error: 'tenantId and query are required' 
                });
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
            
            return res.status(200).json({
                message: 'Search completed successfully',
                results,
                query,
                searchType,
                count: results.length
            });
            
        } catch (error) {
            console.error('search error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }

    static async searchWithContext(req, res) {
        try {
            const { tenantId, query, searchType = 'vector', limit = 10, threshold = 0.7, corpusId, documentId, embeddingModel, includeContext = true } = req.body;
            
            if (!tenantId || !query) {
                return res.status(400).json({ 
                    error: 'tenantId and query are required' 
                });
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
            
            return res.status(200).json({
                message: 'Context search completed successfully',
                results,
                query,
                searchType,
                count: results.length
            });
            
        } catch (error) {
            console.error('searchWithContext error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }

    static async recommendSimilar(req, res) {
        try {
            const { tenantId, chunkId, limit = 5, threshold = 0.8, excludeSameDocument = false } = req.body;
            
            if (!tenantId || !chunkId) {
                return res.status(400).json({ 
                    error: 'tenantId and chunkId are required' 
                });
            }
            
            const results = await DocumentSearch.recommendSimilar({
                tenantId,
                chunkId,
                limit: Math.min(limit, 50),
                threshold,
                excludeSameDocument
            });
            
            return res.status(200).json({
                message: 'Similar chunks found successfully',
                results,
                chunkId,
                count: results.length
            });
            
        } catch (error) {
            console.error('recommendSimilar error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }

    static async advancedSearch(req, res) {
        try {
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
                return res.status(400).json({ 
                    error: 'tenantId and query are required' 
                });
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
            
            return res.status(200).json({
                message: 'Advanced search completed successfully',
                results,
                query,
                filters,
                searchType,
                count: results.length
            });
            
        } catch (error) {
            console.error('advancedSearch error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }
}