import router from './routes/routes.js'; // Import the router
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { requireApiKey } from './middleware/auth.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ErrorResponse } from './errors/ErrorResponse.js';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json(ErrorResponse.success({
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    }));
});

// Authentication middleware (REQUIRED for all /api routes)
app.use('/api', requireApiKey);

// Routes
app.use('/api', router);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;