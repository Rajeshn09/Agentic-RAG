// src/models/Tenant.js
import db from '../config/database.js';

const { pool } = db;

export default class Tenant {
  static async create({ name, plan = 'trial' }) {
    const sql = `
      INSERT INTO "Tenants" ("name", "plan")
      VALUES ($1, $2)
      RETURNING *;
    `;
    const { rows } = await pool.query(sql, [name, plan]);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM "Tenants" WHERE "id" = $1;`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByName(name) {
    const { rows } = await pool.query(
      `SELECT * FROM "Tenants" WHERE "name" = $1;`,
      [name]
    );
    return rows[0] || null;
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const sqlRows = `
      SELECT * FROM "Tenants"
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2;
    `;
    const sqlCount = `SELECT COUNT(*)::int AS count FROM "Tenants";`;

    const [rowsRes, countRes] = await Promise.all([
      pool.query(sqlRows, [limit, offset]),
      pool.query(sqlCount),
    ]);

    return { rows: rowsRes.rows, total: countRes.rows[0].count };
  }

  static async update(id, { name, plan }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`"name" = $${idx++}`);
      values.push(name);
    }
    if (plan !== undefined) {
      fields.push(`"plan" = $${idx++}`);
      values.push(plan);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`"updatedAt" = NOW()`);
    const sql = `
      UPDATE "Tenants"
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
      `DELETE FROM "Tenants" WHERE "id" = $1;`,
      [id]
    );
    return res.rowCount > 0;
  }
}
