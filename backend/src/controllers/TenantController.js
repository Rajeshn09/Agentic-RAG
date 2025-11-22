import Tenant from "../models/Tenant.js";
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError 
} from "../errors/AppError.js";
import { ErrorResponse, ValidationHelper } from "../errors/ErrorResponse.js";
import { ServiceErrorHandler } from "../utils/ServiceErrorHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export default class TenantController {
    
    static createTenant = asyncHandler(async (req, res) => {
        const { name, plan = 'trial' } = req.body;

        // Validate required fields
        const requiredErrors = ValidationHelper.validateRequired(req.body, ['name']);
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            name: 'string',
            plan: 'string'
        });

        const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

        // Custom business validation
        if (name && name.trim().length < 2) {
            validationErrors.name = 'Name must be at least 2 characters long';
        }

        if (plan && !['trial', 'basic', 'premium', 'enterprise'].includes(plan)) {
            validationErrors.plan = 'Plan must be one of: trial, basic, premium, enterprise';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Check for duplicate name
        const existingTenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.findByName(name.trim()),
            'check existing tenant',
            { name }
        );

        if (existingTenant) {
            throw new ConflictError('Tenant with this name already exists', {
                field: 'name',
                value: name.trim()
            });
        }

        // Create tenant
        const tenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.create({ name: name.trim(), plan }),
            'tenant creation',
            { name, plan }
        );

        ServiceErrorHandler.logOperation('Tenant created successfully', {
            tenantId: tenant.id,
            name: tenant.name,
            plan: tenant.plan
        });

        res.status(201).json(ErrorResponse.success(tenant, 'Tenant created successfully'));
    });

    static listTenants = asyncHandler(async (req, res) => {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const offset = (page - 1) * limit;

        // Validate pagination parameters
        if (isNaN(limit) || limit < 1) {
            throw new ValidationError('Limit must be a positive number');
        }
        if (isNaN(page) || page < 1) {
            throw new ValidationError('Page must be a positive number');
        }

        const result = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.findAll({ limit, offset }),
            'tenant list retrieval',
            { limit, offset, page }
        );

        res.json(ErrorResponse.paginated(result.rows, {
            page,
            limit,
            total: result.total
        }));
    });

    static getTenant = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Tenant ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        const tenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.findById(id),
            'tenant retrieval',
            { tenantId: id }
        );

        if (!tenant) {
            throw new NotFoundError('Tenant', id);
        }

        res.json(ErrorResponse.success(tenant));
    });

    static updateTenant = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { name, plan } = req.body;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Tenant ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Validate update data types
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            ...(name !== undefined && { name: 'string' }),
            ...(plan !== undefined && { plan: 'string' })
        });

        const validationErrors = { ...typeErrors };

        // Custom business validation
        if (name !== undefined && name.trim().length < 2) {
            validationErrors.name = 'Name must be at least 2 characters long';
        }

        if (plan !== undefined && !['trial', 'basic', 'premium', 'enterprise'].includes(plan)) {
            validationErrors.plan = 'Plan must be one of: trial, basic, premium, enterprise';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Check if tenant exists
        const existingTenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.findById(id),
            'tenant existence check',
            { tenantId: id }
        );

        if (!existingTenant) {
            throw new NotFoundError('Tenant', id);
        }

        // Check for duplicate name if name is being updated
        if (name && name.trim() !== existingTenant.name) {
            const duplicateTenant = await ServiceErrorHandler.handleDatabaseOperation(
                () => Tenant.findByName(name.trim()),
                'duplicate name check',
                { name }
            );

            if (duplicateTenant) {
                throw new ConflictError('Tenant with this name already exists', {
                    field: 'name',
                    value: name.trim()
                });
            }
        }

        // Sanitize update data
        const updateData = ServiceErrorHandler.sanitizeInput(req.body, ['name', 'plan']);

        // Update tenant
        const updatedTenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.update(id, updateData),
            'tenant update',
            { tenantId: id, updateData }
        );

        ServiceErrorHandler.logOperation('Tenant updated successfully', {
            tenantId: id,
            changes: updateData
        });

        res.json(ErrorResponse.success(updatedTenant, 'Tenant updated successfully'));
    });

    static deleteTenant = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Tenant ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Check if tenant exists
        const existingTenant = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.findById(id),
            'tenant existence check',
            { tenantId: id }
        );

        if (!existingTenant) {
            throw new NotFoundError('Tenant', id);
        }

        // TODO: Add business logic validation
        // - Check if tenant has users
        // - Check if tenant has documents
        // - Implement soft delete vs hard delete logic

        const deleted = await ServiceErrorHandler.handleDatabaseOperation(
            () => Tenant.delete(id),
            'tenant deletion',
            { tenantId: id }
        );

        ServiceErrorHandler.validateBusinessLogic(
            deleted,
            'Failed to delete tenant',
            { tenantId: id }
        );

        ServiceErrorHandler.logOperation('Tenant deleted successfully', {
            tenantId: id,
            tenantName: existingTenant.name
        });

        res.status(204).send();
    });
}
