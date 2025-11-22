import { ValidationHelper } from '../errors/ErrorResponse.js';

/**
 * Validation Schemas for API Endpoints
 * Define reusable validation rules for different endpoints
 */

export const TenantValidation = {
    create: {
        body: {
            required: ['name'],
            types: {
                name: 'string',
                plan: 'string'
            },
            custom: (data) => {
                const errors = {};
                
                if (data.name && data.name.trim().length < 2) {
                    errors.name = 'Name must be at least 2 characters long';
                }
                
                if (data.plan && !['trial', 'basic', 'premium', 'enterprise'].includes(data.plan)) {
                    errors.plan = 'Plan must be one of: trial, basic, premium, enterprise';
                }
                
                return errors;
            }
        }
    },
    
    update: {
        params: {
            custom: (data) => {
                const errors = {};
                const uuidError = ValidationHelper.validateUUID(data.id, 'Tenant ID');
                if (uuidError) errors.id = uuidError;
                return errors;
            }
        },
        body: {
            types: {
                name: 'string',
                plan: 'string'
            },
            custom: (data) => {
                const errors = {};
                
                if (data.name !== undefined && data.name.trim().length < 2) {
                    errors.name = 'Name must be at least 2 characters long';
                }
                
                if (data.plan !== undefined && !['trial', 'basic', 'premium', 'enterprise'].includes(data.plan)) {
                    errors.plan = 'Plan must be one of: trial, basic, premium, enterprise';
                }
                
                return errors;
            }
        }
    }
};

export const UserValidation = {
    create: {
        body: {
            required: ['tenantId', 'fullName', 'email'],
            types: {
                tenantId: 'string',
                fullName: 'string',
                email: 'string',
                role: 'string'
            },
            custom: (data) => {
                const errors = {};
                
                if (data.tenantId) {
                    const uuidError = ValidationHelper.validateUUID(data.tenantId, 'Tenant ID');
                    if (uuidError) errors.tenantId = uuidError;
                }
                
                if (data.email) {
                    const emailError = ValidationHelper.validateEmail(data.email);
                    if (emailError) errors.email = emailError;
                }
                
                if (data.role && !['admin', 'user', 'viewer'].includes(data.role)) {
                    errors.role = 'Role must be one of: admin, user, viewer';
                }
                
                return errors;
            }
        }
    }
};

export const DocumentValidation = {
    upload: {
        body: {
            required: ['tenantId', 'userId', 'corpusId'],
            types: {
                tenantId: 'string',
                userId: 'string',
                corpusId: 'string',
                embeddingModel: 'string',
                autotagModel: 'string'
            },
            custom: (data, req) => {
                const errors = {};
                
                // Validate UUIDs
                ['tenantId', 'userId', 'corpusId'].forEach(field => {
                    if (data[field]) {
                        const uuidError = ValidationHelper.validateUUID(data[field], field);
                        if (uuidError) errors[field] = uuidError;
                    }
                });
                
                // Validate file or URL presence
                if (!req.file && !data.file_path) {
                    errors.file = 'Either file upload or file_path (URL) is required';
                }
                
                if (req.file && data.file_path) {
                    errors.file = 'Please provide either file or file_path, not both';
                }
                
                // Validate metadata is object if provided
                if (data.metadata && typeof data.metadata !== 'object') {
                    errors.metadata = 'metadata must be an object';
                }
                
                return errors;
            }
        }
    }
};

export const SearchValidation = {
    chunks: {
        body: {
            required: ['tenantId', 'corpusId'],
            types: {
                tenantId: 'string',
                corpusId: 'string',
                query: 'string',
                embeddingModel: 'string',
                rerankModel: 'string',
                llmModel: 'string',
                prompt: 'string',
                similarityThreshold: 'number',
                limit: 'number'
            },
            custom: (data) => {
                const errors = {};
                
                // Validate UUIDs
                ['tenantId', 'corpusId'].forEach(field => {
                    if (data[field]) {
                        const uuidError = ValidationHelper.validateUUID(data[field], field);
                        if (uuidError) errors[field] = uuidError;
                    }
                });
                
                // Validate query or queryEmbedding
                if (!data.query && !data.queryEmbedding) {
                    errors.query = 'Either query (text) or queryEmbedding is required';
                }
                
                // Validate queryEmbedding format
                if (data.queryEmbedding && !Array.isArray(data.queryEmbedding)) {
                    errors.queryEmbedding = 'queryEmbedding must be an array';
                }
                
                // Validate similarity threshold
                if (data.similarityThreshold !== undefined) {
                    if (data.similarityThreshold < 0 || data.similarityThreshold > 1) {
                        errors.similarityThreshold = 'similarityThreshold must be between 0 and 1';
                    }
                }
                
                // Validate limit
                if (data.limit !== undefined) {
                    if (data.limit < 1 || data.limit > 100) {
                        errors.limit = 'limit must be between 1 and 100';
                    }
                }
                
                return errors;
            }
        }
    }
};

export const PaginationValidation = {
    query: {
        types: {
            limit: 'string', // Query params come as strings
            page: 'string'
        },
        custom: (data) => {
            const errors = {};
            
            if (data.limit) {
                const limit = parseInt(data.limit, 10);
                if (isNaN(limit) || limit < 1 || limit > 1000) {
                    errors.limit = 'limit must be a number between 1 and 1000';
                }
            }
            
            if (data.page) {
                const page = parseInt(data.page, 10);
                if (isNaN(page) || page < 1) {
                    errors.page = 'page must be a positive number';
                }
            }
            
            return errors;
        }
    }
};