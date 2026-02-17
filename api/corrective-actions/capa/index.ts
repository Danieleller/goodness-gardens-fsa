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
  } catch (error) {
    console.error('Corrective actions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
