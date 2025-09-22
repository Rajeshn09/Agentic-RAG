import db from '../config/database.js';

const { pool } = db;

export default class User {
    static async create({ tenantId, fullName, email, role }) {
        const sql = `
        INSERT INTO "Users" ("tenantId", "fullName", "email" ,"role")
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `;
        const { rows } = await pool.query(sql, [tenantId, fullName, email, role]);
        return rows[0];
    }

    static async findById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM "Users" WHERE "id" = $1;`,
            [id]
        );
        return rows[0] || null;
    }

    static async findByEmail(email) {
        const { rows } = await pool.query(
            `SELECT * FROM "Users" WHERE "email" = $1;`,
            [email]
        );
        return rows[0] || null;
    }

    static async findAll({ limit = 50, offset = 0 } = {}) {
        const sqlRows = `
            SELECT * FROM "Users"
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
        `;
        const sqlCount = `SELECT COUNT(*)::int AS count FROM "Users";`;

        const [rowsRes, countRes] = await Promise.all([
            pool.query(sqlRows, [limit, offset]),
            pool.query(sqlCount),
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

        const { rows } = await pool.query(sql, values);
        return rows[0] || null;
    }

    static async delete(id) {
        const res = await pool.query(
            `DELETE FROM "Users" WHERE "id" = $1;`,
            [id]
        );
        return res.rowCount > 0;
    }
}