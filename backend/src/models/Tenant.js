// src/models/Tenant.js
import db from '../config/database.js';
import { ServiceErrorHandler } from '../utils/ServiceErrorHandler.js';

const { pool } = db;

export default class Tenant {
  static async create({ name, plan = 'trial' }) {
    const sql = `
      INSERT INTO "Tenants" ("name", "plan")
      VALUES ($1, $2)
      RETURNING *;
    `;
    const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
      () => pool.query(sql, [name, plan]),
      'tenant creation',
      { name, plan }
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
      () => pool.query(
        `SELECT * FROM "Tenants" WHERE "id" = $1;`,
        [id]
      ),
      'tenant retrieval by id',
      { tenantId: id }
    );
    return rows[0] || null;
  }

  static async findByName(name) {
    const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
      () => pool.query(
        `SELECT * FROM "Tenants" WHERE "name" = $1;`,
        [name]
      ),
      'tenant retrieval by name',
      { name }
    );
    return rows[0] || null;
  }

  static async findAll({ limit = 50, offset = 0, filters = {} } = {}) {
    const whereConditions = [];
    const values = [limit, offset];
    let valueIndex = 3;

    // Build WHERE conditions based on filters
    if (filters.plan) {
      whereConditions.push(`"plan" = $${valueIndex++}`);
      values.push(filters.plan);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sqlRows = `
      SELECT * FROM "Tenants"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2;
    `;
    
    const sqlCount = `
      SELECT COUNT(*)::int AS count FROM "Tenants"
      ${whereClause};
    `;

    // Prepare parameters for count query (exclude limit and offset)
    const countValues = whereConditions.length > 0 ? values.slice(2) : [];

    const [rowsRes, countRes] = await Promise.all([
      ServiceErrorHandler.handleDatabaseOperation(
        () => pool.query(sqlRows, values),
        'tenant list retrieval',
        { limit, offset, filters }
      ),
      ServiceErrorHandler.handleDatabaseOperation(
        () => pool.query(sqlCount, countValues),
        'tenant count retrieval',
        { filters }
      )
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

    const { rows } = await ServiceErrorHandler.handleDatabaseOperation(
      () => pool.query(sql, values),
      'tenant update',
      { tenantId: id, fields: Object.keys({ name, plan }).filter(key => eval(key) !== undefined) }
    );
    return rows[0] || null;
  }

  static async delete(id) {
    const res = await ServiceErrorHandler.handleDatabaseOperation(
      () => pool.query(
        `DELETE FROM "Tenants" WHERE "id" = $1;`,
        [id]
      ),
      'tenant deletion',
      { tenantId: id }
    );
    return res.rowCount > 0;
  }
}
