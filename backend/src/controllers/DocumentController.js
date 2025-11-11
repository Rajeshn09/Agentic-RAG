import Document from "../models/Document.js";
import DocumentUpload from "../services/DocumentUpload.js";

export default class DocumentController {
    static async createDocument(req, res) {
        try {
            const { tenantId, corpusId, originalFileName = '', fileType, fileSizeBytes = '', rawText, metadata = {}, autotag = {} } = req.body;
            if (!tenantId || !corpusId || !fileType || !rawText) {
                return res.status(400).json({ error: 'Missing required fields.' });
            }

            const created = await Document.create({ tenantId, corpusId, originalFileName, fileType, fileSizeBytes, rawText, metadata, autotag });
            return res.status(201).json({ results: created });
        } catch (err) {
            console.error('createDocument error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async listDocuments(req, res) {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const offset = (page - 1) * limit;

            const { rows, total } = await Document.findAll({ limit, offset });
            return res.json({ results: rows, stats: { total, page, limit } });
        } catch (err) {
            console.error('listDocuments error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async getDocument(req, res) {
        try {
            const { id } = req.params;
            const document = await Document.findById(id);
            if (!document) {
                return res.status(404).json({ error: 'Document not found.' });
            }
            return res.json({ results: document });
        } catch (err) {
            console.error('getDocument error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async updateDocument(req, res) {
        try {
            const { id } = req.params;
            const { processingStatus, errorMessage, originalFileName = '', fileType, fileSizeBytes = '', rawText, metadata, autotag } = req.body;

            const updated = await Document.update(id, { processingStatus, errorMessage, originalFileName, fileType, fileSizeBytes, rawText, metadata, autotag });
            if (!updated) {
                return res.status(404).json({ error: 'Document not found.' });
            }
            return res.json({ results: updated });
        } catch (err) {
            console.error('updateDocument error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async deleteDocument(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Document.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Document not found.' });
            }
            return res.status(204).send();
        } catch (err) {
            console.error('deleteDocument error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async document_upload(req, res) {
        try {
            const { 
                tenantId, 
                userId, 
                corpusId, 
                file_path,
                embeddingModel,
                autotagModel,
                autotagSchema,
                metadata 
            } = req.body;
            const file = req.file;
            
            if (!tenantId || !userId || !corpusId) {
                return res.status(400).json({ 
                    error: 'tenantId, userId, and corpusId are required' 
                });
            }
            if (metadata && typeof metadata !== 'object') {
                return res.status(400).json({ 
                    error: 'metadata must be an object' 
                });
            }
            if (!file && !file_path) {
                return res.status(400).json({ 
                    error: 'Either file upload or file_path (URL) is required' 
                });
            }
            
            if (file && file_path) {
                return res.status(400).json({ 
                    error: 'Please provide either file or file_path, not both' 
                });
            }
            
            let parsedAutotagSchema = null;
            if (autotagSchema) {
                try {
                    parsedAutotagSchema = typeof autotagSchema === 'string' ? JSON.parse(autotagSchema) : autotagSchema;
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid autotagSchema JSON format' });
                }
            }
            
            const result = await DocumentUpload.uploadDocument({
                file,
                file_path,
                tenantId,
                userId,
                corpusId,
                embeddingModel,
                autotagModel,
                autotagSchema: parsedAutotagSchema,
                metadata
            });
            
            return res.status(201).json({ 
                message: 'Document uploaded and processed successfully',
                document: result
            });
            
        } catch (error) {
            console.error('document_upload error:', error);
            return res.status(500).json({ 
                error: 'Internal server error',
                details: error.message 
            });
        }
    }

}