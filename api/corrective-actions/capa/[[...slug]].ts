import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../../_db.js';
import { verifyToken } from '../../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    const slug = req.query.slug as string[] | undefined;
    const id = slug?.[0];

    // Collection routes: /api/corrective-actions/capa
    if (!id) {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT * FROM corrective_actions WHERE user_id = ? ORDER BY created_at DESC',
          args: [userId],
        });
        return res.status(200).json(result.rows);
      }

      if (req.method === 'POST') {
        const {
          nonconformance_id,
          action_description,
          responsible_party,
          target_completion_date,
          verification_method,
        } = req.body;

        const result = await db.execute({
          sql: `INSERT INTO corrective_actions (
            user_id, nonconformance_id, action_description,
            responsible_party, target_completion_date, verification_method
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            userId, nonconformance_id, action_description,
            responsible_party, target_completion_date, verification_method,
          ],
        });

        return res.status(201).json({
          id: Number(result.lastInsertRowid),
          message: 'Corrective action created successfully',
        });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Individual resource routes: /api/corrective-actions/capa/[id]
    const capaId = Number(id);

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM corrective_actions WHERE id = ? AND user_id = ?',
        args: [capaId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Corrective action not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const {
        action_description,
        responsible_party,
        target_completion_date,
        actual_completion_date,
        status,
        verification_method,
        verification_date,
        verified_by,
        verification_notes,
      } = req.body;

      const checkResult = await db.execute({
        sql: 'SELECT id FROM corrective_actions WHERE id = ? AND user_id = ?',
        args: [capaId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Corrective action not found' });
      }

      await db.execute({
        sql: `UPDATE corrective_actions SET
          action_description = ?, responsible_party = ?, target_completion_date = ?,
          actual_completion_date = ?, status = ?, verification_method = ?,
          verification_date = ?, verified_by = ?, verification_notes = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          action_description, responsible_party, target_completion_date,
          actual_completion_date, status, verification_method,
          verification_date, verified_by, verification_notes, capaId, userId,
        ],
      });

      return res.status(200).json({ message: 'Corrective action updated successfully' });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM corrective_actions WHERE id = ? AND user_id = ?',
        args: [capaId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Corrective action not found' });
      }

      await db.execute({
        sql: 'DELETE FROM corrective_actions WHERE id = ? AND user_id = ?',
        args: [capaId, userId],
      });

      return res.status(200).json({ message: 'Corrective action deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Corrective actions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
