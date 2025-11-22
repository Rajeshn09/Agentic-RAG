import db from '../config/database.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';

const { pool } = db;

export default class User {
    static async create({ tenantId, fullName, email, role }) {
        const sql = `
        INSERT INTO "Users" ("tenantId", "fullName", "email" ,"role")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `;
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(sql, [tenantId, fullName, email, role]),
            'user creation',
            { tenantId, email }
        );
        return rows[0];
    }

    static async findById(id) {
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `SELECT * FROM "Users" WHERE "id" = $1;`,
                [id]
            ),
            'user retrieval by id',
            { userId: id }
        );
        return rows[0] || null;
    }

    static async findByEmail(email) {
        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `SELECT * FROM "Users" WHERE "email" = $1;`,
                [email]
            ),
            'user retrieval by email',
            { email }
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

        if (filters.role) {
            whereConditions.push(`"role" = $${valueIndex++}`);
            values.push(filters.role);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const sqlRows = `
            SELECT * FROM "Users"
            ${whereClause}
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
        `;
        
        const sqlCount = `
            SELECT COUNT(*)::int AS count FROM "Users"
            ${whereClause};
        `;

        // Prepare parameters for count query (exclude limit and offset)
        const countValues = whereConditions.length > 0 ? values.slice(2) : [];

        const [rowsRes, countRes] = await Promise.all([
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlRows, values),
                'user list retrieval',
                { limit, offset, filters }
            ),
            ServiceErrorHandler.handleDatabaseOperation(
                () => pool.query(sqlCount, countValues),
                'user count retrieval',
                { filters }
            )
        ]);

        return { rows: rowsRes.rows, total: countRes.rows[0].count };
    }

    static async update(id, { fullName, role }) {
        const fields = [];
        const values = [];
        let idx = 1;

        if (fullName !== undefined) {
            fields.push(`"fullName" = $${idx++}`);
            values.push(fullName);
        }
        if (role !== undefined) {
            fields.push(`"role" = $${idx++}`);
            values.push(role);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`"updatedAt" = NOW()`);
        const sql = `
            UPDATE "Users"
            SET ${fields.join(', ')}
            WHERE "id" = $${idx}
            RETURNING *;
        `;
        values.push(id);

        const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(sql, values),
            'user update',
            { userId: id, fields: Object.keys({ fullName, role }).filter(key => eval(key) !== undefined) }
        );
        return rows[0] || null;
    }

    static async delete(id) {
        const res = await ServiceErrorHandler.handleDatabaseOperation(
            () => pool.query(
                `DELETE FROM "Users" WHERE "id" = $1;`,
                [id]
            ),
            'user deletion',
            { userId: id }
        );
        return res.rowCount > 0;
    }
}