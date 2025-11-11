import Corpora from '../models/Corpora.js';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';


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
            throw new Error('Failed to extract text from document');
        }
        const result = await response.json();
        if (!result.results.success) {
            throw new Error('Text extraction was not successful');
        }
        return result.results.text;
    }
    
    
    static async textChunk({ text }) {
        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/text/chunk`, {
            method: 'POST',
            body: JSON.stringify({ text }),
            headers: { 
                'Content-Type': 'application/json',
                'x-api-token': process.env.MICROSERVICE_API_TOKEN
            }
        });
        if (!response.ok) {
            throw new Error('Failed to chunk text');
        }
        const result = await response.json();
        if (!result.results.success) {
            throw new Error('Text chunking was not successful');
        }
        return result.results.chunks;
    }

    static async textEmbed({ chunks, model }) {
        const response = await fetch(`${process.env.MICROSERVICE_API_URL}/api/text/embed`, {
            method: 'POST',
            body: JSON.stringify({ 
                texts: chunks.slice(0, 99), // Limit to first 100 chunks to control costs
                model: model
            }),
            headers: { 
                'Content-Type': 'application/json',
                'x-api-token': process.env.MICROSERVICE_API_TOKEN
            }
        });
        if (!response.ok) {
            throw new Error('Failed to embed text chunks');
        }
        const result = await response.json();
        if (!result.results.success) {
            throw new Error('Text embedding was not successful');
        }
        return result.results.embeddings.map(item => item.embedding);
    }

    static async textAutotag({ text, model, schema }) {
        const payload = {
            text,
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
            throw new Error('Failed to autotag text');
        }
        
        const result = await response.json();
        if (!result.results.success) {
            throw new Error('Text autotagging was not successful');
        }
        
        return result.results.autotag;
    }

    static async uploadDocument({ file, file_path, tenantId, userId, corpusId, embeddingModel, autotagModel, autotagSchema, metadata }) {
        let document = null;
        
        try {
            const text = await this.textExtract({ file, file_path });
            if (metadata) {
                const metadata = { uploadedBy: userId, ...metadata };
            }

            let autotag = {};
            if (autotagModel !== false && autotagModel !== 'false') {
                try {
                    autotag = await this.textAutotag({ 
                        text, 
                        model: autotagModel, 
                        schema: autotagSchema 
                    });
                } catch (autotagError) {
                    autotag = { error: autotagError.message };
                }
            }
            
            
            document = await Document.create({
                tenantId,
                corpusId,
                originalFileName: file ? (file.originalname || file.name) : (file_path || 'unknown'),
                fileType: file ? file.mimetype : 'url',
                fileSizeBytes: file ? file.size : null,
                processingStatus: 'PROCESSING',
                metadata,
                autotag,
                rawText: text
            });
            
            const chunks = await this.textChunk({ text });
            
            const embeddings = await this.textEmbed({ chunks, model: embeddingModel });
            
            const chunkPromises = chunks.map((chunkText, index) => 
                Chunk.create({
                    tenantId,
                    corpusId,
                    documentId: document.id,
                    chunkIndex: index,
                    chunkText,
                    tokenCount: chunkText.split(' ').length,
                    embedding: embeddings[index] || null
                })
            );
            
            await Promise.all(chunkPromises);
            
            await Document.update(document.id, { 
                processingStatus: 'COMPLETED' 
            });
            
            return document;
            
        } catch (error) {
            if (document) {
                try {
                    await Document.update(document.id, { 
                        processingStatus: 'FAILED',
                        errorMessage: error.message 
                    });
                } catch (updateError) {
                    console.error('Failed to update document status:', updateError);
                }
            }
            throw error;
        }
    }

}