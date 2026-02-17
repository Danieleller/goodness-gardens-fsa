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

    // Collection routes: /api/corrective-actions/nonconformances
    if (!id) {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT * FROM nonconformances WHERE user_id = ? ORDER BY created_at DESC',
          args: [userId],
        });
        return res.status(200).json(result.rows);
      }

      if (req.method === 'POST') {
        const {
          finding_date,
          finding_category,
          finding_description,
          severity,
          affected_area,
          root_cause,
        } = req.body;

        const result = await db.execute({
          sql: `INSERT INTO nonconformances (
            user_id, finding_date, finding_category, finding_description,
            severity, affected_area, root_cause
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId, finding_date, finding_category, finding_description,
            severity || 'minor', affected_area, root_cause,
          ],
        });

        return res.status(201).json({
          id: Number(result.lastInsertRowid),
          message: 'Nonconformance created successfully',
        });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Individual resource routes: /api/corrective-actions/nonconformances/[id]
    const ncId = Number(id);

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM nonconformances WHERE id = ? AND user_id = ?',
        args: [ncId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Nonconformance not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const {
        finding_date,
        finding_category,
        finding_description,
        severity,
        affected_area,
        root_cause,
      } = req.body;

      const checkResult = await db.execute({
        sql: 'SELECT id FROM nonconformances WHERE id = ? AND user_id = ?',
        args: [ncId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Nonconformance not found' });
      }

      await db.execute({
        sql: `UPDATE nonconformances SET
          finding_date = ?, finding_category = ?, finding_description = ?,
          severity = ?, affected_area = ?, root_cause = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          finding_date, finding_category, finding_description,
          severity, affected_area, root_cause, ncId, userId,
        ],
      });

      return res.status(200).json({ message: 'Nonconformance updated successfully' });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM nonconformances WHERE id = ? AND user_id = ?',
        args: [ncId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Nonconformance not found' });
      }

      await db.execute({
        sql: 'DELETE FROM nonconformances WHERE id = ? AND user_id = ?',
        args: [ncId, userId],
      });

      return res.status(200).json({ message: 'Nonconformance deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Nonconformances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
