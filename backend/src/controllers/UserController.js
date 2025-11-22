// src/controllers/UserController.js
import User from '../models/Users.js';
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError 
} from "../errors/AppError.js";
import { ErrorResponse, ValidationHelper } from "../errors/ErrorResponse.js";
import { ServiceErrorHandler } from "../utils/ServiceErrorHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export default class UserController {
    static createUser = asyncHandler(async (req, res) => {
        const { tenantId, fullName, email, role } = req.body;

        // Validate required fields
        const requiredErrors = ValidationHelper.validateRequired(req.body, ['tenantId', 'fullName', 'email', 'role']);
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            tenantId: 'string',
            fullName: 'string',
            email: 'string',
            role: 'string'
        });

        const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

        // Validate UUID
        if (tenantId) {
            const uuidError = ValidationHelper.validateUUID(tenantId, 'tenantId');
            if (uuidError) validationErrors.tenantId = uuidError;
        }

        // Validate email format
        if (email) {
            const emailError = ValidationHelper.validateEmail(email, 'email');
            if (emailError) validationErrors.email = emailError;
        }

        // Validate role
        if (role && !['admin', 'user', 'viewer'].includes(role.trim().toLowerCase())) {
            validationErrors.role = 'Role must be one of: admin, user, viewer';
        }

        // Validate name length
        if (fullName && fullName.trim().length < 2) {
            validationErrors.fullName = 'Full name must be at least 2 characters long';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Check for duplicate email
        const existing = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.findByEmail(email.trim()),
            'duplicate email check',
            { email: email.trim() }
        );

        if (existing) {
            throw new ConflictError('User with this email already exists', {
                field: 'email',
                value: email.trim()
            });
        }

        // Create user
        const created = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.create({ 
                tenantId, 
                fullName: fullName.trim(), 
                email: email.trim().toLowerCase(), 
                role: role.trim().toLowerCase() 
            }),
            'user creation',
            { tenantId, email: email.trim() }
        );

        ServiceErrorHandler.logOperation('User created successfully', {
            userId: created.id,
            tenantId,
            email: created.email,
            role: created.role
        });

        res.status(201).json(ErrorResponse.success(created, 'User created successfully'));
    });

    static listUsers = asyncHandler(async (req, res) => {
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

        // Add tenant filtering support
        const { tenantId, role } = req.query;
        const filters = {};
        
        if (tenantId) {
            const uuidError = ValidationHelper.validateUUID(tenantId, 'tenantId');
            if (uuidError) throw new ValidationError(uuidError);
            filters.tenantId = tenantId;
        }

        if (role) {
            if (!['admin', 'user', 'viewer'].includes(role.toLowerCase())) {
                throw new ValidationError('Role must be one of: admin, user, viewer');
            }
            filters.role = role.toLowerCase();
        }

        const result = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.findAll({ limit, offset, filters }),
            'user list retrieval',
            { limit, offset, page, filters }
        );

        res.json(ErrorResponse.paginated(result.rows, {
            page,
            limit,
            total: result.total
        }));
    });

    static getUser = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'User ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        const user = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.findById(id),
            'user retrieval',
            { userId: id }
        );

        if (!user) {
            throw new NotFoundError('User', id);
        }

        res.json(ErrorResponse.success(user));
    });

    static updateUser = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { fullName, role } = req.body; // Note: email updates not allowed for security

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'User ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Validate update data types
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            ...(fullName !== undefined && { fullName: 'string' }),
            ...(role !== undefined && { role: 'string' })
        });

        const validationErrors = { ...typeErrors };

        // Validate role if provided
        if (role !== undefined && !['admin', 'user', 'viewer'].includes(role.trim().toLowerCase())) {
            validationErrors.role = 'Role must be one of: admin, user, viewer';
        }

        // Validate name length if provided
        if (fullName !== undefined && fullName.trim().length < 2) {
            validationErrors.fullName = 'Full name must be at least 2 characters long';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Check if user exists
        const existingUser = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.findById(id),
            'user existence check',
            { userId: id }
        );

        if (!existingUser) {
            throw new NotFoundError('User', id);
        }

        // Sanitize update data
        const updateData = ServiceErrorHandler.sanitizeInput(req.body, ['fullName', 'role']);
        if (updateData.fullName) updateData.fullName = updateData.fullName.trim();
        if (updateData.role) updateData.role = updateData.role.trim().toLowerCase();

        // Update user
        const updated = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.update(id, updateData),
            'user update',
            { userId: id, updateData }
        );

        ServiceErrorHandler.logOperation('User updated successfully', {
            userId: id,
            changes: Object.keys(updateData),
            tenantId: existingUser.tenantId
        });

        res.json(ErrorResponse.success(updated, 'User updated successfully'));
    });

    static deleteUser = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'User ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Check if user exists
        const existingUser = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.findById(id),
            'user existence check',
            { userId: id }
        );

        if (!existingUser) {
            throw new NotFoundError('User', id);
        }

        // TODO: Add business logic validation
        // - Check if user has created documents/corpora
        // - Implement soft delete vs hard delete logic
        // - Check permissions (can't delete admin users, etc.)

        const deleted = await ServiceErrorHandler.handleDatabaseOperation(
            () => User.delete(id),
            'user deletion',
            { userId: id }
        );

        ServiceErrorHandler.validateBusinessLogic(
            deleted,
            'Failed to delete user',
            { userId: id }
        );

        ServiceErrorHandler.logOperation('User deleted successfully', {
            userId: id,
            email: existingUser.email,
            tenantId: existingUser.tenantId
        });

        res.status(204).send();
    });
}
