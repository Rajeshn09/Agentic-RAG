// backend/src/routes/routes.js
import express from 'express';
import TenantController from '../controllers/TenantController.js';
import UserController  from '../controllers/UserController.js';

const router = express.Router();

// Tenants endpoints (mounted under /api in app.js)
router.post('/tenants', TenantController.createTenant);
router.get('/tenants', TenantController.listTenants);
router.get('/tenants/:id', TenantController.getTenant);
router.put('/tenants/:id', TenantController.updateTenant);
router.delete('/tenants/:id', TenantController.deleteTenant);

// Users endpoints
router.post('/users', UserController.createUser)
router.get('/users', UserController.listUsers)
router.get('/user/:id', UserController.getUser)
router.put('/user/:id', UserController.updateUser)
router.delete('/user/:id', UserController.deleteUser)
export default router;

