import db from '../config/database.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';

const { pool } = db;

export default class Corpora {
    static async create({ tenantId, userId, name, description = '' }) {
        const sql = `
            INSERT INTO "Corpora" ("tenantId", "userId", "name", "description")
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(sql, [tenantId, userId, name, description]),
            'corpus creation',
            { tenantId, userId, name }
        );
        return rows[0];
    }
    
    static async findByName(name, tenantId) {
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `SELECT * FROM "Corpora" WHERE "name" = $1 AND "tenantId" = $2;`,
                [name, tenantId]
            ),
            'corpus name lookup',
            { name, tenantId }
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

        if (filters.userId) {
            whereConditions.push(`"userId" = $${valueIndex++}`);
            values.push(filters.userId);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sqlRows = `
            SELECT * FROM "Corpora"
            ${whereClause}
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
        `;
        
        const sqlCount = `
            SELECT COUNT(*)::int AS count FROM "Corpora"
            ${whereClause};
        `;

        // Prepare parameters for count query (exclude limit and offset)
        const countValues = whereConditions.length > 0 ? values.slice(2) : [];

        const [rowsRes, countRes] = await Promise.all([
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlRows, values),
                'corpora list retrieval',
                { limit, offset, filters }
            ),
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlCount, countValues),
                'corpora count retrieval',
                { filters }
            )
        ]);

        return { rows: rowsRes.rows, total: countRes.rows[0].count };
    }

    static async findById(id) {
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `SELECT * FROM "Corpora" WHERE "id" = $1;`,
                [id]
            ),
            'corpus retrieval by id',
            { corpusId: id }
        );
        return rows[0] || null;
    }

    static async update(id, { name, description }) {
        const fields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) {
            fields.push(`"name" = $${idx++}`);
            values.push(name);
        }

        if (description !== undefined) {
            fields.push(`"description" = $${idx++}`);
            values.push(description);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`"updatedAt" = NOW()`);
        const sql = `
            UPDATE "Corpora"
            SET ${fields.join(', ')}
            WHERE "id" = $${idx}
            RETURNING *;
            `;
        values.push(id);

        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(sql, values),
            'corpus update',
            { corpusId: id, fields: Object.keys({ name, description }).filter(key => eval(key) !== undefined) }
        );
        return rows[0] || null;
    }

    static async delete(id) {
        const res = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `DELETE FROM "Corpora" WHERE "id" = $1;`,
                [id]
            ),
            'corpus deletion',
            { corpusId: id }
        );
        return res.rowCount > 0;
    }
}