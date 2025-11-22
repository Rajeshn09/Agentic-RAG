/**
 * Base Application Error Class
 * Provides consistent error structure across the application
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = null, details = null) {
        super(message);
        
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = true; // Distinguishes from programming errors
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: this.message,
            errorCode: this.errorCode,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
        };
    }
}

/**
 * Validation Error - 400
 */
export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

/**
 * Authentication Error - 401
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Authorization Error - 403
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

/**
 * Resource Not Found Error - 404
 */
export class NotFoundError extends AppError {
    constructor(resource = 'Resource', id = null) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, 404, 'NOT_FOUND_ERROR', { resource, id });
    }
}

/**
 * Conflict Error - 409 (duplicate resources, etc.)
 */
export class ConflictError extends AppError {
    constructor(message, details = null) {
        super(message, 409, 'CONFLICT_ERROR', details);
    }
}

/**
 * External Service Error - 502/503
 */
export class ExternalServiceError extends AppError {
    constructor(service, originalError, statusCode = 502) {
        const message = `External service '${service}' error: ${originalError.message}`;
        super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', {
            service,
            originalError: originalError.message
        });
    }
}

/**
 * Database Error - 500
 */
export class DatabaseError extends AppError {
    constructor(operation, originalError) {
        const message = `Database ${operation} failed: ${originalError.message}`;
        super(message, 500, 'DATABASE_ERROR', {
            operation,
            originalError: originalError.message
        });
    }
}

/**
 * Business Logic Error - 422
 */
export class BusinessLogicError extends AppError {
    constructor(message, details = null) {
        super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
    }
}

/**
 * Rate Limit Error - 429
 */
export class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

/**
 * File Processing Error - 422
 */
export class FileProcessingError extends AppError {
    constructor(fileName, operation, originalError) {
        const message = `File '${fileName}' ${operation} failed: ${originalError.message}`;
        super(message, 422, 'FILE_PROCESSING_ERROR', {
            fileName,
            operation,
            originalError: originalError.message
        });
    }
}