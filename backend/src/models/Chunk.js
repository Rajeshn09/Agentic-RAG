import db from '../config/database.js';

const { pool } = db;

export default class Chunk {
    static async create( { tenantId, corpusId, documentId, chunkIndex, chunkText, tokenCount, embedding } ) {
        const sql = `
            INSERT INTO "Chunks" ("tenantId", "corpusId", "documentId", "chunkIndex", "chunkText", "tokenCount", "embedding")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const formattedEmbedding = embedding ? `[${embedding.join(',')}]` : null;
        const { rows } = await pool.query(sql, [tenantId, corpusId, documentId, chunkIndex, chunkText, tokenCount, formattedEmbedding]);
        return rows[0];
    }

    static async findById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM "Chunks" WHERE "id" = $1;`,
            [id]
        );
        return rows[0] || null;
    }

    static async findAll({ limit = 50, offset = 0 } = {}) {
        const sqlRows = `
            SELECT * FROM "Chunks"
            ORDER BY "createdAt" DESC
            LIMIT $1 OFFSET $2;
            `;
        const sqlCount = `SELECT COUNT(*)::int AS count FROM "Chunks";`;

        const [rowsRes, countRes] = await Promise.all([
            pool.query(sqlRows, [limit, offset]),
            pool.query(sqlCount),
        ]);

        return { rows: rowsRes.rows, total: countRes.rows[0].count };
    }

    static async update(id, updateData) {
        // Explicitly destructure for clarity (optional)
        const { chunkIndex, chunkText, tokenCount, embedding } = updateData;

        const fields = [];
        const values = [];
        let idx = 1;

        if (chunkIndex !== undefined) {
            fields.push(`"chunkIndex" = $${idx++}`);
            values.push(chunkIndex);
        }
        if (chunkText !== undefined) {
            fields.push(`"chunkText" = $${idx++}`);
            values.push(chunkText);
        }
        if (tokenCount !== undefined) {
            fields.push(`"tokenCount" = $${idx++}`);
            values.push(tokenCount);
        }
        if (embedding !== undefined) {
            fields.push(`"embedding" = $${idx++}`);
            const formattedEmbedding = embedding ? `[${embedding.join(',')}]` : null;
            values.push(formattedEmbedding);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`"updatedAt" = NOW()`);
        const sql = `
            UPDATE "Chunks"
            SET ${fields.join(', ')}
            WHERE "id" = $${idx}
            RETURNING *;
            `;
        values.push(id);

        const { rows } = await pool.query(sql, values);
        return rows[0] || null;
    }

    static async delete(id) {
        const sql = `
            DELETE FROM "Chunks"
            WHERE "id" = $1
            RETURNING *;
            `;
        const { rows } = await pool.query(sql, [id]);
        return rows[0] || null;
    }


    static async ragSearch(tenantId, corpusId, queryEmbedding, filters = {}, topK = 10, similarityThreshold = 0.0) {
        const sql = `
            SELECT 
                c.id,
                c."chunkText",
                c."chunkIndex",
                c."documentId",
                d."autotag",
                1 - (c.embedding <=> $1) AS similarity
            FROM "Chunks" c
            JOIN "Documents" d
            ON c."documentId" = d."id"
            WHERE c."tenantId" = $2
            AND c."corpusId" = $3
            AND c.embedding IS NOT NULL
            AND d."metadata" @> $5::jsonb
            AND d."autotag" @> $6::jsonb
            AND (1 - (c.embedding <=> $1)) >= $7
            ORDER BY similarity DESC
            LIMIT $4;
        `;

        const formattedEmbedding = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

        const metadataFilter = filters.metadata || {};
        const autotagFilter = filters.autotag || {};

        const { rows } = await pool.query(sql, [
            formattedEmbedding,              
            tenantId,                        
            corpusId,                        
            topK,                           
            JSON.stringify(metadataFilter),  
            JSON.stringify(autotagFilter),
            similarityThreshold
        ]);

        return rows;
    }
       

}