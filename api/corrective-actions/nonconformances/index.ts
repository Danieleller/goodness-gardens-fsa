import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../../_db';
import { verifyToken } from '../../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();

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
  } catch (error) {
    console.error('Nonconformances error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
