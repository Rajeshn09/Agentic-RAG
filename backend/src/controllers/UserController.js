// src/controllers/UserController.js
import User from '../models/Users.js'

export default class UserController {
    static async createUser(req, res) {
        try {
            const { tenantId, fullName, email, role } = req.body;
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant ID is required.' });
            }
            if (!fullName || typeof fullName !== 'string') {
                return res.status(400).json({ error: 'Full name is required.' });
            }
            if (!email || typeof email !== 'string') {
                return res.status(400).json({ error: 'Email is required.' });
            }
            if (!role || typeof role !== 'string') {
                return res.status(400).json({ error: 'Role is required.' });
            }

            const existing = await User.findByEmail(email.trim());
            if (existing) {
                return res.status(409).json({ error: 'User with this email already exists.' });
            }

            const created = await User.create({ tenantId, fullName: fullName.trim(), email: email.trim(), role: role.trim() });
            return res.status(201).json(created);
        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async listUsers(req, res) {
        try {
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const offset = (page - 1) * limit;

            const { rows, total } = await User.findAll({ limit, offset });
            return res.json({ results: rows, stats: { total, page, limit } });
        } catch (error) {
            console.error('Error listing users:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            return res.json({ results: user });
        } catch (error) {
            console.error('Error getting user:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }

    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { fullName, email, role } = req.body;
            if (id) {
                const existing = await User.findById(id);
                if (existing && existing.id !== id){
                    return res.status(409).json({error : 'Email already exists in the Tenant'})
                }
            }
            const updated = await User.update(id, { fullName, role });
            if (!updated){
                return res.status(404).json({error: 'User not found with email mentioned'})
            }
            return res.json({results: updated})

        }
        catch(err) {
            console.log('UpdateUser error:', err)
            return res.status(500).json({error: 'Internal server error'})
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            await User.delete(id);
            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
}
