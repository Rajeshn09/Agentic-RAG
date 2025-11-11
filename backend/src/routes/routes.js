// backend/src/routes/routes.js
import express from 'express';
import multer from 'multer';
import TenantController from '../controllers/TenantController.js';
import UserController  from '../controllers/UserController.js';
import CorporaController from '../controllers/CorporaController.js';
import DocumentController from '../controllers/DocumentController.js';
import ChunkController from '../controllers/ChunkController.js';
import SearchController from '../controllers/SearchController.js';







const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    }
});

const router = express.Router();

// Tenants endpoints (mounted under /api in app.js)
router.post('/tenant', TenantController.createTenant);
router.get('/tenants', TenantController.listTenants);
router.get('/tenants/:id', TenantController.getTenant);
router.put('/tenants/:id', TenantController.updateTenant);
router.delete('/tenants/:id', TenantController.deleteTenant);

// Users endpoints
router.post('/user', UserController.createUser)
router.get('/users', UserController.listUsers)
router.get('/user/:id', UserController.getUser)
router.put('/user/:id', UserController.updateUser)
router.delete('/user/:id', UserController.deleteUser)

// Corpora endpoints
router.post('/corpora', CorporaController.createCorpora);
router.get('/corpuses', CorporaController.listCorpuses);
router.get('/corpora/:id', CorporaController.getCorpora);
router.put('/corpora/:id', CorporaController.updateCorpora);
router.delete('/corpora/:id', CorporaController.deleteCorpora);

// Documents endpoints
router.post('/document', DocumentController.createDocument);
router.get('/documents', DocumentController.listDocuments);
router.get('/document/:id', DocumentController.getDocument);
router.put('/document/:id', DocumentController.updateDocument);
router.delete('/document/:id', DocumentController.deleteDocument);

// Chunks endpoints
router.post('/chunk', ChunkController.createChunk);
router.get('/chunks', ChunkController.listChunks);
router.get('/chunk/:id', ChunkController.getChunk);
router.put('/chunk/:id', ChunkController.updateChunk);
router.delete('/chunk/:id', ChunkController.deleteChunk);

// Document upload endpoint - handles both file uploads and URLs
router.post('/document/upload', upload.single('file'), DocumentController.document_upload);


// Document search endpoint
router.post('/document/search', ChunkController.searchChunks);


// Check document processing status
router.get('/document/:id/status', DocumentController.getDocument);



export default router;

