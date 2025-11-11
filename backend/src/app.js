import router from './routes/routes.js'; // Import the router
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { requireApiKey } from './middleware/auth.js';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Authentication middleware (REQUIRED for all /api routes)
app.use('/api', requireApiKey);

// Routes
app.use('/api', router);


export default app;