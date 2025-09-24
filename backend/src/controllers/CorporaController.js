// src/controllers/CorporaController.js
import Corpora from '../models/Corpora.js';

export default class CorporaController {
  static async createCorpora(req, res) {
    try {
      const { tenantId, userId, name, description } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Corpora name is required.' });
      }

      const existing = await Corpora.findByName(name.trim());
      if (existing) {
        return res.status(409).json({ error: 'Corpora with this name already exists.' });
      }

      const created = await Corpora.create({ tenantId, userId, name: name.trim(), description });
      return res.status(201).json({results: created});
    } catch (err) {
      console.error('createCorpora error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
  static async listCorpuses(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const offset = (page - 1) * limit;

      const { rows, total } = await Corpora.findAll({ limit, offset });
      return res.json({ data: rows, meta: { total, page, limit } });
    } catch (err) {
      console.error('listCorpuses error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
   static async getCorpora(req, res) {
    try {
      const { id } = req.params;
      const corpora = await Corpora.findById(id);
      if (!corpora) {
        return res.status(404).json({ error: 'Corpora not found.' });
      }
      return res.json({results: corpora});
    } catch (err) {
      console.error('getCorpora error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
  static async updateCorpora(req, res) {
    try {
      const { id } = req.params;
      const { tenantId, userId, name, description } = req.body;

      if (name) {
        const existing = await Corpora.findByName(name.trim());
        if (existing && existing.id !== id) {
          return res.status(409).json({ error: 'Another Corpora with this name already exists.' });
        }
      }

      const updated = await Corpora.update(id, { name: name ? name.trim() : undefined, description });
      if (!updated) {
        return res.status(404).json({ error: 'Corpora not found.' });
      }
      return res.json({results: updated});
    } catch (err) {
      console.error('updateCorpora error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
  static async deleteCorpora(req, res) {
    try {
      const { id } = req.params;
      const ok = await Corpora.delete(id);
      if (!ok) {
        return res.status(404).json({ error: 'Corpora not found.' });
      }
      return res.status(204).send();
    } catch (err) {
      console.error('deleteCorpora error:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }
}

