import { AppError } from './AppError.js';

/**
 * Error Response Utilities
 * Standardizes error responses across the application
 */
export class ErrorResponse {
    /**
     * Create standardized error response
     */
    static create(error, req = null) {
        const response = {
            success: false,
            error: error.message || 'An unexpected error occurred',
            timestamp: new Date().toISOString()
        };

        // Add error code if available
        if (error.errorCode) {
            response.errorCode = error.errorCode;
        }

        // Add details if available
        if (error.details) {
            response.details = error.details;
        }

        // Add request context in development
        if (process.env.NODE_ENV === 'development' && req) {
            response.request = {
                method: req.method,
                url: req.url,
                headers: this.sanitizeHeaders(req.headers)
            };
        }

        // Add stack trace in development
        if (process.env.NODE_ENV === 'development' && error.stack) {
            response.stack = error.stack;
        }

        return response;
    }

    /**
     * Create validation error response with field details
     */
    static validation(errors, message = 'Validation failed') {
        return {
            success: false,
            error: message,
            errorCode: 'VALIDATION_ERROR',
            details: {
                fields: errors
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create success response wrapper
     */
    static success(data, message = null, meta = null) {
        const response = {
            success: true,
            results: data
        };

        if (message) {
            response.message = message;
        }

        if (meta) {
            response.meta = meta;
        }

        return response;
    }

    /**
     * Create paginated success response
     */
    static paginated(data, pagination) {
        return {
            success: true,
            results: data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 50,
                total: pagination.total || 0,
                pages: Math.ceil((pagination.total || 0) / (pagination.limit || 50))
            }
        };
    }

    /**
     * Sanitize request headers for logging (remove sensitive data)
     */
    static sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['x-api-key', 'authorization', 'cookie'];
        
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Log error for monitoring/debugging
     */
    static logError(error, req = null, additionalContext = {}) {
        const logData = {
            timestamp: new Date().toISOString(),
            error: {
                name: error.name,
                message: error.message,
                code: error.errorCode,
                statusCode: error.statusCode,
                stack: error.stack
            },
            ...additionalContext
        };

        if (req) {
            logData.request = {
                method: req.method,
                url: req.url,
                userAgent: req.get('user-agent'),
                ip: req.ip,
                headers: this.sanitizeHeaders(req.headers)
            };
        }

        // In production, you'd send this to your logging service
        if (error.statusCode >= 500) {
            console.error('Server Error:', JSON.stringify(logData, null, 2));
        } else {
            console.warn('Client Error:', JSON.stringify(logData, null, 2));
        }
    }
}

/**
 * Validation helper functions
 */
export class ValidationHelper {
    /**
     * Validate required fields
     */
    static validateRequired(data, requiredFields) {
        const errors = {};
        
        requiredFields.forEach(field => {
            if (!data[field] && data[field] !== 0 && data[field] !== false) {
                errors[field] = `${field} is required`;
            }
        });

        return errors;
    }

    /**
     * Validate field types
     */
    static validateTypes(data, typeValidations) {
        const errors = {};

        Object.entries(typeValidations).forEach(([field, expectedType]) => {
            if (data[field] !== undefined) {
                const actualType = typeof data[field];
                if (actualType !== expectedType) {
                    errors[field] = `${field} must be of type ${expectedType}, received ${actualType}`;
                }
            }
        });

        return errors;
    }

    /**
     * Validate UUID format
     */
    static validateUUID(value, fieldName) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
            return `${fieldName} must be a valid UUID`;
        }
        return null;
    }

    /**
     * Validate email format
     */
    static validateEmail(email, fieldName = 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return `${fieldName} must be a valid email address`;
        }
        return null;
    }

    /**
     * Combine validation errors
     */
    static combineErrors(...errorObjects) {
        return Object.assign({}, ...errorObjects);
    }
}