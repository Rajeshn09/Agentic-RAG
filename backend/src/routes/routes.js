// backend/src/routes/routes.js
import express from 'express';
import TenantController from '../controllers/TenantController.js';
import UserController  from '../controllers/UserController.js';
import CorporaController from '../controllers/CorporaController.js';
import DocumentController from '../controllers/DocumentController.js';
import ChunkController from '../controllers/ChunkController.js';

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


export default router;

