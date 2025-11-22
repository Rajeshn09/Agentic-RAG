import { 
    DatabaseError, 
    ExternalServiceError, 
    FileProcessingError,
    BusinessLogicError,
    NotFoundError 
} from '../errors/AppError.js';

/**
 * Service Layer Error Handling Utilities
 * Wraps common service operations with proper error handling
 */
export class ServiceErrorHandler {
    /**
     * Wrap database operations with error handling
     */
    static async handleDatabaseOperation(operation, operationName, context = {}) {
        try {
            return await operation();
        } catch (error) {
            console.error(`Database ${operationName} failed:`, {
                error: error.message,
                context,
                stack: error.stack
            });
            
            throw new DatabaseError(operationName, error);
        }
    }

    /**
     * Wrap external API calls with error handling
     * For raw fetch responses that need error checking
     */
    static async handleExternalService(serviceCall, serviceName, context = {}) {
        try {
            const response = await serviceCall();
            
            // Check if this is a fetch Response object
            if (response && typeof response.ok !== 'undefined') {
                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            }
            
            return response;
        } catch (error) {
            console.error(`External service '${serviceName}' failed:`, {
                error: error.message,
                context,
                stack: error.stack
            });

            // Determine appropriate status code based on error type
            let statusCode = 502; // Bad Gateway
            if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                statusCode = 504; // Gateway Timeout
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                statusCode = 503; // Service Unavailable
            }
            
            throw new ExternalServiceError(serviceName, error, statusCode);
        }
    }

    /**
     * Wrap service operations (that already handle HTTP details) with error handling
     * For methods that return processed data, not raw responses
     */
    static async handleServiceOperation(serviceCall, serviceName, context = {}) {
        try {
            return await serviceCall();
        } catch (error) {
            console.error(`Service operation '${serviceName}' failed:`, {
                error: error.message,
                context,
                stack: error.stack
            });

            // Determine appropriate status code based on error type
            let statusCode = 502; // Bad Gateway
            if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                statusCode = 504; // Gateway Timeout
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                statusCode = 503; // Service Unavailable
            }
            
            throw new ExternalServiceError(serviceName, error, statusCode);
        }
    }

    /**
     * Wrap file processing operations with error handling
     */
    static async handleFileProcessing(operation, fileName, operationType, context = {}) {
        try {
            return await operation();
        } catch (error) {
            console.error(`File processing '${operationType}' failed for '${fileName}':`, {
                error: error.message,
                context,
                stack: error.stack
            });
            
            throw new FileProcessingError(fileName, operationType, error);
        }
    }

    /**
     * Handle resource not found scenarios
     */
    static handleNotFound(resource, id = null, customMessage = null) {
        if (customMessage) {
            throw new NotFoundError(customMessage);
        }
        throw new NotFoundError(resource, id);
    }

    /**
     * Handle business logic validation
     */
    static validateBusinessLogic(condition, message, details = null) {
        if (!condition) {
            throw new BusinessLogicError(message, details);
        }
    }

    /**
     * Retry wrapper for external services
     */
    static async retryExternalService(serviceCall, serviceName, options = {}) {
        const {
            maxRetries = 3,
            delay = 1000,
            backoff = 2,
            retryOn = [502, 503, 504]
        } = options;

        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.handleExternalService(serviceCall, serviceName, { attempt });
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) unless specifically configured
                if (error.statusCode < 500 && !retryOn.includes(error.statusCode)) {
                    throw error;
                }
                
                if (attempt < maxRetries) {
                    const waitTime = delay * Math.pow(backoff, attempt - 1);
                    console.warn(`Retrying ${serviceName} in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Validate and sanitize input data
     */
    static sanitizeInput(data, allowedFields) {
        const sanitized = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                sanitized[field] = data[field];
            }
        });
        
        return sanitized;
    }

    /**
     * Log service operation for debugging
     */
    static logOperation(operation, context = {}, level = 'info') {
        const logData = {
            timestamp: new Date().toISOString(),
            operation,
            context
        };
        
        if (level === 'error') {
            console.error('Service Operation Error:', logData);
        } else if (level === 'warn') {
            console.warn('Service Operation Warning:', logData);
        } else {
            console.log('Service Operation:', logData);
        }
    }
}