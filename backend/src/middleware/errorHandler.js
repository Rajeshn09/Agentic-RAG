import { AppError, ValidationError } from '../errors/AppError.js';
import { ErrorResponse, ValidationHelper } from '../errors/ErrorResponse.js';

/**
 * Global Error Handler Middleware
 * Catches and formats all application errors consistently
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Log the error for monitoring
    ErrorResponse.logError(err, req);

    // Handle operational errors (expected errors)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(ErrorResponse.create(err, req));
    }

    // Handle specific Node.js/Express errors
    if (err.name === 'ValidationError') {
        const appError = new AppError('Validation failed', 400, 'VALIDATION_ERROR', err.errors);
        return res.status(400).json(ErrorResponse.create(appError, req));
    }

    // Handle JSON parsing errors
    if (err.type === 'entity.parse.failed') {
        const appError = new AppError('Invalid JSON format', 400, 'INVALID_JSON');
        return res.status(400).json(ErrorResponse.create(appError, req));
    }

    // Handle file upload errors (multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        const appError = new AppError('File too large', 413, 'FILE_TOO_LARGE', {
            maxSize: '100MB'
        });
        return res.status(413).json(ErrorResponse.create(appError, req));
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const appError = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
        return res.status(400).json(ErrorResponse.create(appError, req));
    }

    // Handle database errors
    if (err.code === '23505') { // PostgreSQL unique constraint violation
        const appError = new AppError('Resource already exists', 409, 'DUPLICATE_RESOURCE');
        return res.status(409).json(ErrorResponse.create(appError, req));
    }

    if (err.code === '23503') { // PostgreSQL foreign key constraint violation
        const appError = new AppError('Referenced resource not found', 400, 'INVALID_REFERENCE');
        return res.status(400).json(ErrorResponse.create(appError, req));
    }

    // Handle unexpected errors (programming errors)
    console.error('Unexpected Error:', {
        error: err,
        stack: err.stack,
        request: {
            method: req.method,
            url: req.url,
            body: req.body,
            params: req.params,
            query: req.query
        }
    });

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;

    const response = ErrorResponse.create(
        new AppError(message, 500, 'INTERNAL_SERVER_ERROR'),
        req
    );

    return res.status(500).json(response);
};

/**
 * 404 Handler - catch unmatched routes
 */
export const notFoundHandler = (req, res) => {
    const error = new AppError(
        `Route ${req.method} ${req.path} not found`,
        404,
        'ROUTE_NOT_FOUND',
        {
            method: req.method,
            path: req.path,
            availableRoutes: [
                'GET /health',
                'POST /api/tenant',
                'GET /api/tenants',
                'POST /api/document/upload',
                'POST /api/document/search'
                // Add more as needed
            ]
        }
    );

    ErrorResponse.logError(error, req);
    return res.status(404).json(ErrorResponse.create(error, req));
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Request validation middleware
 */
export const validateRequest = (validationRules) => {
    return (req, res, next) => {
        try {
            const errors = {};

            // Validate body, params, query based on rules
            Object.entries(validationRules).forEach(([section, rules]) => {
                const data = req[section] || {};
                
                if (rules.required) {
                    const requiredErrors = ValidationHelper.validateRequired(data, rules.required);
                    Object.assign(errors, requiredErrors);
                }

                if (rules.types) {
                    const typeErrors = ValidationHelper.validateTypes(data, rules.types);
                    Object.assign(errors, typeErrors);
                }

                if (rules.custom) {
                    const customErrors = rules.custom(data, req);
                    Object.assign(errors, customErrors);
                }
            });

            if (Object.keys(errors).length > 0) {
                throw new ValidationError('Validation failed', errors);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};