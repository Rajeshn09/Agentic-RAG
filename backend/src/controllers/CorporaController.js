// src/controllers/CorporaController.js
import Corpora from '../models/Corpora.js';
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError 
} from "../errors/AppError.js";
import { ErrorResponse, ValidationHelper } from "../errors/ErrorResponse.js";
import { ServiceErrorHandler } from "../utils/ServiceErrorHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export default class CorporaController {
  static createCorpora = asyncHandler(async (req, res) => {
    const { tenantId, userId, name, description = '' } = req.body;

    // Validate required fields
    const requiredErrors = ValidationHelper.validateRequired(req.body, ['tenantId', 'userId', 'name']);
    const typeErrors = ValidationHelper.validateTypes(req.body, {
      tenantId: 'string',
      userId: 'string', 
      name: 'string',
      description: 'string'
    });

    const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

    // Validate UUIDs
    ['tenantId', 'userId'].forEach(field => {
      if (req.body[field]) {
        const uuidError = ValidationHelper.validateUUID(req.body[field], field);
        if (uuidError) validationErrors[field] = uuidError;
      }
    });

    // Validate name length
    if (name && name.trim().length < 2) {
      validationErrors.name = 'Corpus name must be at least 2 characters long';
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Validation failed', validationErrors);
    }

    // Check for duplicate name within tenant
    const existing = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.findByName(name.trim(), tenantId),
      'duplicate corpus name check',
      { name: name.trim(), tenantId }
    );

    if (existing) {
      throw new ConflictError('Corpus with this name already exists within this tenant', {
        field: 'name',
        value: name.trim(),
        tenantId
      });
    }

    // Create corpus
    const created = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.create({ tenantId, userId, name: name.trim(), description: description.trim() }),
      'corpus creation',
      { tenantId, userId, name: name.trim() }
    );

    ServiceErrorHandler.logOperation('Corpus created successfully', {
      corpusId: created.id,
      tenantId,
      userId,
      name: created.name
    });

    res.status(201).json(ErrorResponse.success(created, 'Corpus created successfully'));
  });
  static listCorpuses = asyncHandler(async (req, res) => {
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
    const { tenantId } = req.query;
    const filters = {};
    
    if (tenantId) {
      const uuidError = ValidationHelper.validateUUID(tenantId, 'tenantId');
      if (uuidError) throw new ValidationError(uuidError);
      filters.tenantId = tenantId;
    }

    const result = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.findAll({ limit, offset, filters }),
      'corpus list retrieval',
      { limit, offset, page, filters }
    );

    res.json(ErrorResponse.paginated(result.rows, {
      page,
      limit,
      total: result.total
    }));
  });
   static getCorpora = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidError = ValidationHelper.validateUUID(id, 'Corpus ID');
    if (uuidError) {
      throw new ValidationError(uuidError);
    }

    const corpora = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.findById(id),
      'corpus retrieval',
      { corpusId: id }
    );

    if (!corpora) {
      throw new NotFoundError('Corpus', id);
    }

    res.json(ErrorResponse.success(corpora));
  });
  static updateCorpora = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validate UUID format
    const uuidError = ValidationHelper.validateUUID(id, 'Corpus ID');
    if (uuidError) {
      throw new ValidationError(uuidError);
    }

    // Validate update data types
    const typeErrors = ValidationHelper.validateTypes(req.body, {
      ...(name !== undefined && { name: 'string' }),
      ...(description !== undefined && { description: 'string' })
    });

    const validationErrors = { ...typeErrors };

    // Validate name length if provided
    if (name !== undefined && name.trim().length < 2) {
      validationErrors.name = 'Corpus name must be at least 2 characters long';
    }

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Validation failed', validationErrors);
    }

    // Check if corpus exists
    const existingCorpus = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.findById(id),
      'corpus existence check',
      { corpusId: id }
    );

    if (!existingCorpus) {
      throw new NotFoundError('Corpus', id);
    }

    // Check for duplicate name if name is being updated
    if (name && name.trim() !== existingCorpus.name) {
      const duplicateCorpus = await ServiceErrorHandler.handleDatabaseOperation(
        () => Corpora.findByName(name.trim(), existingCorpus.tenantId),
        'duplicate corpus name check',
        { name: name.trim(), tenantId: existingCorpus.tenantId }
      );

      if (duplicateCorpus && duplicateCorpus.id !== id) {
        throw new ConflictError('Another corpus with this name already exists within this tenant', {
          field: 'name',
          value: name.trim(),
          tenantId: existingCorpus.tenantId
        });
      }
    }

    // Sanitize update data
    const updateData = ServiceErrorHandler.sanitizeInput(req.body, ['name', 'description']);
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();

    // Update corpus
    const updated = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.update(id, updateData),
      'corpus update',
      { corpusId: id, updateData }
    );

    ServiceErrorHandler.logOperation('Corpus updated successfully', {
      corpusId: id,
      changes: Object.keys(updateData),
      tenantId: existingCorpus.tenantId
    });

    res.json(ErrorResponse.success(updated, 'Corpus updated successfully'));
  });
  static deleteCorpora = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidError = ValidationHelper.validateUUID(id, 'Corpus ID');
    if (uuidError) {
      throw new ValidationError(uuidError);
    }

    // Check if corpus exists
    const existingCorpus = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.findById(id),
      'corpus existence check',
      { corpusId: id }
    );

    if (!existingCorpus) {
      throw new NotFoundError('Corpus', id);
    }

    // TODO: Add business logic validation
    // - Check if corpus has documents
    // - Implement cascade delete or prevent deletion

    const deleted = await ServiceErrorHandler.handleDatabaseOperation(
      () => Corpora.delete(id),
      'corpus deletion',
      { corpusId: id }
    );

    ServiceErrorHandler.validateBusinessLogic(
      deleted,
      'Failed to delete corpus',
      { corpusId: id }
    );

    ServiceErrorHandler.logOperation('Corpus deleted successfully', {
      corpusId: id,
      corpusName: existingCorpus.name,
      tenantId: existingCorpus.tenantId
    });

    res.status(204).send();
  });
}

