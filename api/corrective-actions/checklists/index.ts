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
        sql: 'SELECT * FROM audit_checklists WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
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

      const result = await db.execute({
        sql: `INSERT INTO audit_checklists (
          user_id, audit_date, audit_name, water_safety_checked,
          soil_amendment_checked, worker_hygiene_checked, animal_intrusion_checked,
          chemical_applications_checked, mrl_compliance_checked, storage_conditions_checked,
          nonconformances_tracked, capas_documented, capas_verified, overall_status,
          auditor_name, audit_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, audit_date, audit_name, water_safety_checked || 0,
          soil_amendment_checked || 0, worker_hygiene_checked || 0,
          animal_intrusion_checked || 0, chemical_applications_checked || 0,
          mrl_compliance_checked || 0, storage_conditions_checked || 0,
          nonconformances_tracked || 0, capas_documented || 0, capas_verified || 0,
          overall_status || 'in_progress', auditor_name, audit_notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Audit checklist created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Audit checklists error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
