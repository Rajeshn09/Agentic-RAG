
export default function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-KEY'];
    
    if (!apiKey) {
        return res.status(401).json({ 
            error: 'Authentication required',
            message: 'API key is required. Please provide X-API-KEY header.' 
        });
    }

    const validApiKeys = process.env.VALID_API_KEYS ? 
        process.env.VALID_API_KEYS.split(',').map(key => key.trim()) : 
        [];
    
    if (!validApiKeys.includes(apiKey)) {
        return res.status(403).json({ 
            error: 'Invalid API key',
            message: 'The provided API key is not valid.' 
        });
    }

    next();
}


export function requireApiKey(req, res, next) {
    const validApiKeys = process.env.VALID_API_KEYS ? 
        process.env.VALID_API_KEYS.split(',').map(key => key.trim()) : 
        [];
    
    if (validApiKeys.length === 0) {
        return res.status(500).json({ 
            error: 'Server configuration error',
            message: 'No valid API keys configured on server.' 
        });
    }
    
    return authenticateApiKey(req, res, next);
}