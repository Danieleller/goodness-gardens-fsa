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

    const { id } = req.query;
    const ncId = Number(id);
    const db = getDb();

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
    console.error('Nonconformances [id] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
