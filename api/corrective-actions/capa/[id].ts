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
    const capaId = Number(id);
    const db = getDb();

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
    console.error('Corrective actions [id] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
