import Document from "../models/Document.js";
import DocumentUpload from "../services/DocumentUpload.js";
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError,
    FileProcessingError 
} from "../errors/AppError.js";
import { ErrorResponse, ValidationHelper } from "../errors/ErrorResponse.js";
import { ServiceErrorHandler } from "../utils/ServiceErrorHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export default class DocumentController {
    static createDocument = asyncHandler(async (req, res) => {
        const { tenantId, corpusId, originalFileName = '', fileType, fileSizeBytes = '', rawText, metadata = {}, autotag = {} } = req.body;

        // Validate required fields
        const requiredErrors = ValidationHelper.validateRequired(req.body, ['tenantId', 'corpusId', 'fileType', 'rawText']);
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            tenantId: 'string',
            corpusId: 'string',
            fileType: 'string',
            rawText: 'string',
            originalFileName: 'string',
            fileSizeBytes: 'number'
        });

        const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

        // Validate UUIDs
        ['tenantId', 'corpusId'].forEach(field => {
            if (req.body[field]) {
                const uuidError = ValidationHelper.validateUUID(req.body[field], field);
                if (uuidError) validationErrors[field] = uuidError;
            }
        });

        // Validate business logic
        if (rawText && rawText.trim().length < 10) {
            validationErrors.rawText = 'Raw text must be at least 10 characters long';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Create document
        const created = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.create({ 
                tenantId, 
                corpusId, 
                originalFileName: originalFileName.trim(), 
                fileType, 
                fileSizeBytes, 
                rawText: rawText.trim(), 
                metadata, 
                autotag 
            }),
            'document creation',
            { tenantId, corpusId, fileName: originalFileName }
        );

        ServiceErrorHandler.logOperation('Document created successfully', {
            documentId: created.id,
            tenantId,
            corpusId,
            fileName: originalFileName
        });

        res.status(201).json(ErrorResponse.success(created, 'Document created successfully'));
    });

    static listDocuments = asyncHandler(async (req, res) => {
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

        // Add filters support
        const { tenantId, corpusId, processingStatus } = req.query;
        const filters = {};
        
        if (tenantId) {
            const uuidError = ValidationHelper.validateUUID(tenantId, 'tenantId');
            if (uuidError) throw new ValidationError(uuidError);
            filters.tenantId = tenantId;
        }
        
        if (corpusId) {
            const uuidError = ValidationHelper.validateUUID(corpusId, 'corpusId');
            if (uuidError) throw new ValidationError(uuidError);
            filters.corpusId = corpusId;
        }

        if (processingStatus) {
            const validStatuses = ['PROCESSING', 'COMPLETED', 'FAILED'];
            if (!validStatuses.includes(processingStatus)) {
                throw new ValidationError(`Processing status must be one of: ${validStatuses.join(', ')}`);
            }
            filters.processingStatus = processingStatus;
        }

        const result = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.findAll({ limit, offset, filters }),
            'document list retrieval',
            { limit, offset, page, filters }
        );

        res.json(ErrorResponse.paginated(result.rows, {
            page,
            limit,
            total: result.total
        }));
    });

    static getDocument = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Document ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        const document = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.findById(id),
            'document retrieval',
            { documentId: id }
        );

        if (!document) {
            throw new NotFoundError('Document', id);
        }

        res.json(ErrorResponse.success(document));
    });

    static updateDocument = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { processingStatus, errorMessage, originalFileName, fileType, fileSizeBytes, rawText, metadata, autotag } = req.body;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Document ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Validate update data types
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            ...(processingStatus !== undefined && { processingStatus: 'string' }),
            ...(errorMessage !== undefined && { errorMessage: 'string' }),
            ...(originalFileName !== undefined && { originalFileName: 'string' }),
            ...(fileType !== undefined && { fileType: 'string' }),
            ...(fileSizeBytes !== undefined && { fileSizeBytes: 'number' }),
            ...(rawText !== undefined && { rawText: 'string' })
        });

        const validationErrors = { ...typeErrors };

        // Validate processing status
        if (processingStatus !== undefined) {
            const validStatuses = ['PROCESSING', 'COMPLETED', 'FAILED'];
            if (!validStatuses.includes(processingStatus)) {
                validationErrors.processingStatus = `Processing status must be one of: ${validStatuses.join(', ')}`;
            }
        }

        // Validate text content if provided
        if (rawText !== undefined && rawText.trim().length < 10) {
            validationErrors.rawText = 'Raw text must be at least 10 characters long';
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        // Check if document exists
        const existingDocument = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.findById(id),
            'document existence check',
            { documentId: id }
        );

        if (!existingDocument) {
            throw new NotFoundError('Document', id);
        }

        // Sanitize update data
        const updateData = ServiceErrorHandler.sanitizeInput(req.body, [
            'processingStatus', 'errorMessage', 'originalFileName', 
            'fileType', 'fileSizeBytes', 'rawText', 'metadata', 'autotag'
        ]);

        // Trim string fields
        if (updateData.originalFileName) updateData.originalFileName = updateData.originalFileName.trim();
        if (updateData.rawText) updateData.rawText = updateData.rawText.trim();
        if (updateData.errorMessage) updateData.errorMessage = updateData.errorMessage.trim();

        // Update document
        const updated = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.update(id, updateData),
            'document update',
            { documentId: id, updateData }
        );

        ServiceErrorHandler.logOperation('Document updated successfully', {
            documentId: id,
            changes: Object.keys(updateData),
            processingStatus: updateData.processingStatus
        });

        res.json(ErrorResponse.success(updated, 'Document updated successfully'));
    });

    static deleteDocument = asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Validate UUID format
        const uuidError = ValidationHelper.validateUUID(id, 'Document ID');
        if (uuidError) {
            throw new ValidationError(uuidError);
        }

        // Check if document exists
        const existingDocument = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.findById(id),
            'document existence check',
            { documentId: id }
        );

        if (!existingDocument) {
            throw new NotFoundError('Document', id);
        }

        // Business logic validation - check if document has dependent chunks
        // Note: This should ideally be handled with CASCADE DELETE in DB schema
        // or we should delete chunks first, then document
        
        const deleted = await ServiceErrorHandler.handleDatabaseOperation(
            () => Document.delete(id),
            'document deletion',
            { documentId: id }
        );

        ServiceErrorHandler.validateBusinessLogic(
            deleted,
            'Failed to delete document',
            { documentId: id }
        );

        ServiceErrorHandler.logOperation('Document deleted successfully', {
            documentId: id,
            fileName: existingDocument.originalFileName,
            tenantId: existingDocument.tenantId
        });

        res.status(204).send();
    });

    static document_upload = asyncHandler(async (req, res) => {
        const { 
            tenantId, 
            userId, 
            corpusId, 
            file_path,
            embeddingModel,
            autotagModel,
            autotagSchema,
            metadata 
        } = req.body;
        const file = req.file;

        // Validate required fields
        const requiredErrors = ValidationHelper.validateRequired(req.body, ['tenantId', 'userId', 'corpusId']);
        const typeErrors = ValidationHelper.validateTypes(req.body, {
            tenantId: 'string',
            userId: 'string',
            corpusId: 'string',
            ...(file_path && { file_path: 'string' }),
            ...(embeddingModel && { embeddingModel: 'string' }),
            ...(autotagModel && { autotagModel: 'string' })
        });

        const validationErrors = ValidationHelper.combineErrors(requiredErrors, typeErrors);

        // Validate UUIDs
        ['tenantId', 'userId', 'corpusId'].forEach(field => {
            if (req.body[field]) {
                const uuidError = ValidationHelper.validateUUID(req.body[field], field);
                if (uuidError) validationErrors[field] = uuidError;
            }
        });

        // Validate file or URL presence
        if (!file && !file_path) {
            validationErrors.file = 'Either file upload or file_path (URL) is required';
        }
        
        if (file && file_path) {
            validationErrors.file = 'Please provide either file or file_path, not both';
        }

        // Validate metadata format
        if (metadata && typeof metadata !== 'object') {
            validationErrors.metadata = 'metadata must be an object';
        }

        // Validate file properties if uploaded
        if (file) {
            const allowedTypes = [
                'application/pdf',
                'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];

            if (!allowedTypes.includes(file.mimetype)) {
                validationErrors.file = `File type '${file.mimetype}' not supported. Allowed types: ${allowedTypes.join(', ')}`;
            }

            if (file.size > 100 * 1024 * 1024) { // 100MB
                validationErrors.file = 'File size cannot exceed 100MB';
            }
        }

        // Validate URL format if provided
        if (file_path) {
            try {
                const url = new URL(file_path);
                if (!['http:', 'https:'].includes(url.protocol)) {
                    validationErrors.file_path = 'file_path must be a valid HTTP or HTTPS URL';
                }
            } catch (e) {
                validationErrors.file_path = 'file_path must be a valid URL';
            }
        }

        // Parse and validate autotag schema
        let parsedAutotagSchema = null;
        if (autotagSchema) {
            try {
                parsedAutotagSchema = typeof autotagSchema === 'string' ? JSON.parse(autotagSchema) : autotagSchema;
                if (typeof parsedAutotagSchema !== 'object') {
                    validationErrors.autotagSchema = 'autotagSchema must be a valid JSON object';
                }
            } catch (e) {
                validationErrors.autotagSchema = 'Invalid autotagSchema JSON format';
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            throw new ValidationError('Validation failed', validationErrors);
        }

        ServiceErrorHandler.logOperation('Document upload started', {
            tenantId,
            userId,
            corpusId,
            fileName: file ? file.originalname : file_path,
            fileSize: file ? file.size : null,
            embeddingModel,
            autotagModel
        });

        // Process document upload
        const result = await ServiceErrorHandler.handleFileProcessing(
            () => DocumentUpload.uploadDocument({
                file,
                file_path,
                tenantId,
                userId,
                corpusId,
                embeddingModel,
                autotagModel,
                autotagSchema: parsedAutotagSchema,
                metadata
            }),
            file ? file.originalname : file_path,
            'document upload and processing'
        );

        ServiceErrorHandler.logOperation('Document upload completed', {
            documentId: result.id,
            tenantId,
            fileName: result.originalFileName,
            processingStatus: result.processingStatus
        });

        res.status(201).json(ErrorResponse.success(result, 'Document uploaded and processed successfully'));
    });

}