// backend/src/routes/routes.js
import express from 'express';
import TenantController from '../controllers/TenantController.js';

const router = express.Router();

// Tenants endpoints (mounted under /api in app.js)
router.post('/tenants', TenantController.createTenant);
router.get('/tenants', TenantController.listTenants);
router.get('/tenants/:id', TenantController.getTenant);
router.put('/tenants/:id', TenantController.updateTenant);
router.delete('/tenants/:id', TenantController.deleteTenant);

// TODO: add other routes (Users, Documents, ApiKeys, etc.)

export default router;
