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
    const checklistId = Number(id);
    const db = getDb();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM audit_checklists WHERE id = ? AND user_id = ?',
        args: [checklistId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Checklist not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const {
        audit_date,
        audit_name,
        water_safety_checked,
        soil_amendment_checked,
        worker_hygiene_checked,
        animal_intrusion_checked,
        chemical_applications_checked,
        mrl_compliance_checked,
        storage_conditions_checked,
        nonconformances_tracked,
        capas_documented,
        capas_verified,
        overall_status,
        auditor_name,
        audit_notes,
      } = req.body;

      const checkResult = await db.execute({
        sql: 'SELECT id FROM audit_checklists WHERE id = ? AND user_id = ?',
        args: [checklistId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Checklist not found' });
      }

      await db.execute({
        sql: `UPDATE audit_checklists SET
          audit_date = ?, audit_name = ?, water_safety_checked = ?,
          soil_amendment_checked = ?, worker_hygiene_checked = ?,
          animal_intrusion_checked = ?, chemical_applications_checked = ?,
          mrl_compliance_checked = ?, storage_conditions_checked = ?,
          nonconformances_tracked = ?, capas_documented = ?, capas_verified = ?,
          overall_status = ?, auditor_name = ?, audit_notes = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          audit_date, audit_name, water_safety_checked,
          soil_amendment_checked, worker_hygiene_checked,
          animal_intrusion_checked, chemical_applications_checked,
          mrl_compliance_checked, storage_conditions_checked,
          nonconformances_tracked, capas_documented, capas_verified,
          overall_status, auditor_name, audit_notes, checklistId, userId,
        ],
      });

      return res.status(200).json({ message: 'Checklist updated successfully' });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM audit_checklists WHERE id = ? AND user_id = ?',
        args: [checklistId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Checklist not found' });
      }

      await db.execute({
        sql: 'DELETE FROM audit_checklists WHERE id = ? AND user_id = ?',
        args: [checklistId, userId],
      });

      return res.status(200).json({ message: 'Checklist deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Audit checklists [id] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
