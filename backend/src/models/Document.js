import db from '../config/database.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';

const { pool } = db;


export default class Document {
    static async create({ tenantId, corpusId, originalFileName = '', fileType, fileSizeBytes = '', rawText, metadata = {}, autotag = {} }) {
        const sql = `
            INSERT INTO "Documents" ("tenantId", "corpusId", "originalFileName", "fileType", "fileSizeBytes", "rawText", "metadata", "autotag")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(sql, [tenantId, corpusId, originalFileName, fileType, fileSizeBytes, rawText, metadata, autotag]),
            'document creation',
            { tenantId, corpusId, originalFileName }
        );
        return rows[0];
    }
    
    static async findById(id) {
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `SELECT * FROM "Documents" WHERE "id" = $1;`,
                [id]
            ),
            'document retrieval by ID',
            { documentId: id }
        );
        return rows[0] || null;
    }
    static async findAll({ limit = 50, offset = 0, filters = {} } = {}) {
        const whereConditions = [];
        const values = [limit, offset];
        let valueIndex = 3;

        // Build WHERE conditions based on filters
        if (filters.tenantId) {
            whereConditions.push(`"tenantId" = $${valueIndex++}`);
            values.push(filters.tenantId);
        }

        if (filters.corpusId) {
            whereConditions.push(`"corpusId" = $${valueIndex++}`);
            values.push(filters.corpusId);
        }

        if (filters.processingStatus) {
            whereConditions.push(`"processingStatus" = $${valueIndex++}`);
            values.push(filters.processingStatus);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sqlRows = `
            SELECT * FROM "Documents"
            ${whereClause}
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
        `;
        
        const sqlCount = `
            SELECT COUNT(*)::int AS count FROM "Documents"
            ${whereClause};
        `;

        // Prepare parameters for count query (exclude limit and offset)
        const countValues = whereConditions.length > 0 ? values.slice(2) : [];

        const [rowsRes, countRes] = await Promise.all([
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlRows, values),
                'documents listing',
                { filters, limit, offset }
            ),
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlCount, countValues),
                'documents count',
                { filters }
            )
        ]);

        return { rows: rowsRes.rows, total: countRes.rows[0].count };
    }

    static async update(id, updateData) {
    // Explicitly destructure for clarity (optional, but matches your request)
    const { processingStatus, errorMessage, originalFileName, fileType, fileSizeBytes, rawText, metadata, autotag } = updateData;

    const fields = [];
    const values = [];
    let idx = 1;

    if (processingStatus !== undefined) {
        fields.push(`"processingStatus" = $${idx++}`);
        values.push(processingStatus);
    }
    if (errorMessage !== undefined) {
        fields.push(`"errorMessage" = $${idx++}`);
        values.push(errorMessage);
    }
    if (originalFileName !== undefined) {
        fields.push(`"originalFileName" = $${idx++}`);
        values.push(originalFileName);
    }
    if (fileType !== undefined) {
        fields.push(`"fileType" = $${idx++}`);
        values.push(fileType);
    }
    if (fileSizeBytes !== undefined) {
        fields.push(`"fileSizeBytes" = $${idx++}`);
        values.push(fileSizeBytes);
    }
    if (rawText !== undefined) {
        fields.push(`"rawText" = $${idx++}`);
        values.push(rawText);
    }
    if (metadata !== undefined) {
        fields.push(`"metadata" = $${idx++}`);
        values.push(JSON.stringify(metadata));  // Assuming JSON storage
    }
    if (autotag !== undefined) {
        fields.push(`"autotag" = $${idx++}`);
        values.push(JSON.stringify(autotag));  // Assuming JSON storage
    }

    if (fields.length === 0) {
        return this.findById(id);
    }

    fields.push(`"updatedAt" = NOW()`);
    const sql = `
        UPDATE "Documents"
        SET ${fields.join(', ')}
        WHERE "id" = $${idx}
        RETURNING *;
    `;
    values.push(id);

    const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
        () => pool.query(sql, values),
        'document update',
        { documentId: id, updateFields: Object.keys(updateData) }
    );
    return rows[0];
}

    static async delete(id) {
        const { rowCount } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `DELETE FROM "Documents" WHERE "id" = $1;`,
                [id]
            ),
            'document deletion',
            { documentId: id }
        );
        return rowCount > 0;
    }

}