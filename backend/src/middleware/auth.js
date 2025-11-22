
import { AuthenticationError, AuthorizationError, AppError } from '../errors/AppError.js';

export default function authenticateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'];
        
        if (!apiKey) {
            throw new AuthenticationError('API key is required. Please provide X-API-KEY header.');
        }

        const validApiKeys = process.env.VALID_API_KEYS ? 
            process.env.VALID_API_KEYS.split(',').map(key => key.trim()) : 
            [];
        
        if (!validApiKeys.includes(apiKey)) {
            throw new AuthorizationError('The provided API key is not valid.');
        }

        next();
    } catch (error) {
        next(error);
    }
}

export function requireApiKey(req, res, next) {
    try {
        const validApiKeys = process.env.VALID_API_KEYS ? 
            process.env.VALID_API_KEYS.split(',').map(key => key.trim()) : 
            [];
        
        if (validApiKeys.length === 0) {
            throw new AppError(
                'No valid API keys configured on server',
                500,
                'SERVER_CONFIGURATION_ERROR'
            );
        }
        
        return authenticateApiKey(req, res, next);
    } catch (error) {
        next(error);
    }
}