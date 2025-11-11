import db from '../config/database.js';

const { pool } = db;

export default class Corpora {
    static async create({ tenantId, userId, name, description = '' }) {
        const sql = `
            INSERT INTO "Corpora" ("tenantId", "userId", "name", "description")
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const { rows } = await pool.query(sql, [tenantId, userId, name, description]);
        return rows[0];
    }
    
    static async findByName(name, tenantId) {
        const { rows } = await pool.query(
            `SELECT * FROM "Corpora" WHERE "name" = $1 AND "tenantId" = $2;`,
            [name, tenantId]
        );
        return rows[0] || null;
    }
    
    
    static async findAll({ limit = 50, offset = 0 } = {}) {
        const sqlRows = `
            SELECT * FROM "Corpora"
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
            `;
        const sqlCount = `SELECT COUNT(*)::int AS count FROM "Corpora";`;

        const [rowsRes, countRes] = await Promise.all([
            pool.query(sqlRows, [limit, offset]),
            pool.query(sqlCount),
        ]);

        return { rows: rowsRes.rows, total: countRes.rows[0].count };
    }

    static async findById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM "Corpora" WHERE "id" = $1;`,
            [id]
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

        const { rows } = await pool.query(sql, values);
        return rows[0] || null;
    }

    static async delete(id) {
        const res = await pool.query(
            `DELETE FROM "Corpora" WHERE "id" = $1;`,
            [id]
        );
        return res.rowCount > 0;
    }
}