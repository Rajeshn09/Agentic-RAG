import Chunk from '../models/Chunk.js';
import DocumentSearch from '../services/DocumentSearch.js';

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

    static async searchChunks(req, res) {
        try {
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

            const results = await DocumentSearch.searchChunks({
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
            });

            return res.status(200).json({
                message: 'Chunks retrieved successfully',
                results,
                count: results.length
            });
        } catch (error) {
            console.error('searchChunks error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }
}