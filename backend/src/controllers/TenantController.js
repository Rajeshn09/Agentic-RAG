// src/controllers/TenantController.js
import Tenant from '../models/Tenant.js';

export default class TenantController {
  static async createTenant(req, res) {
    try {
      const { name, plan } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Tenant name is required.' });
      }

      const existing = await Tenant.findByName(name.trim());
      if (existing) {
        return res.status(409).json({ error: 'Tenant with this name already exists.' });
      }

      const created = await Tenant.create({ name: name.trim(), plan });
      return res.status(201).json(created);
    } catch (err) {
      console.error('createTenant error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  static async listTenants(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const offset = (page - 1) * limit;

      const { rows, total } = await Tenant.findAll({ limit, offset });
      return res.json({ data: rows, meta: { total, page, limit } });
    } catch (err) {
      console.error('listTenants error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  static async getTenant(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findById(id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found.' });
      }
      return res.json(tenant);
    } catch (err) {
      console.error('getTenant error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  static async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const { name, plan } = req.body;

      if (name) {
        const existing = await Tenant.findByName(name.trim());
        if (existing && existing.id !== id) {
          return res.status(409).json({ error: 'Another tenant with this name already exists.' });
        }
      }

      const updated = await Tenant.update(id, { name: name ? name.trim() : undefined, plan });
      if (!updated) {
        return res.status(404).json({ error: 'Tenant not found.' });
      }
      return res.json(updated);
    } catch (err) {
      console.error('updateTenant error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  static async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      const ok = await Tenant.delete(id);
      if (!ok) {
        return res.status(404).json({ error: 'Tenant not found.' });
      }
      return res.status(204).send();
    } catch (err) {
      console.error('deleteTenant error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
}
