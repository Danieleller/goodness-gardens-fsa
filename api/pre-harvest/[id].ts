import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../_db';
import { verifyToken } from '../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const logId = Number(id);

    const db = getDb();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM pre_harvest_logs WHERE id = ? AND user_id = ?',
        args: [logId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const {
        log_type,
        water_source,
        test_date,
        ph_level,
        e_coli_result,
        total_coliform_result,
        test_location,
        lab_name,
        amendment_type,
        amendment_date,
        source,
        quantity_applied,
        quantity_unit,
        field_location,
        training_date,
        training_topic,
        trainee_name,
        handwashing_station_available,
        sanitation_checklist_pass,
        intrusion_date,
        intrusion_type,
        intrusion_location,
        remedial_action,
        corrected_date,
        notes,
      } = req.body;

      const checkResult = await db.execute({
        sql: 'SELECT id FROM pre_harvest_logs WHERE id = ? AND user_id = ?',
        args: [logId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      const updateResult = await db.execute({
        sql: `UPDATE pre_harvest_logs SET
          log_type = ?, water_source = ?, test_date = ?, ph_level = ?, e_coli_result = ?,
          total_coliform_result = ?, test_location = ?, lab_name = ?, amendment_type = ?,
          amendment_date = ?, source = ?, quantity_applied = ?, quantity_unit = ?,
          field_location = ?, training_date = ?, training_topic = ?, trainee_name = ?,
          handwashing_station_available = ?, sanitation_checklist_pass = ?,
          intrusion_date = ?, intrusion_type = ?, intrusion_location = ?,
          remedial_action = ?, corrected_date = ?, notes = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          log_type, water_source, test_date, ph_level, e_coli_result,
          total_coliform_result, test_location, lab_name, amendment_type,
          amendment_date, source, quantity_applied, quantity_unit,
          field_location, training_date, training_topic, trainee_name,
          handwashing_station_available, sanitation_checklist_pass,
          intrusion_date, intrusion_type, intrusion_location,
          remedial_action, corrected_date, notes, logId, userId,
        ],
      });

      return res.status(200).json({
        message: 'Log updated successfully',
        rowsAffected: updateResult.rowsAffected,
      });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM pre_harvest_logs WHERE id = ? AND user_id = ?',
        args: [logId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Log not found' });
      }

      const deleteResult = await db.execute({
        sql: 'DELETE FROM pre_harvest_logs WHERE id = ? AND user_id = ?',
        args: [logId, userId],
      });

      return res.status(200).json({
        message: 'Log deleted successfully',
        rowsAffected: deleteResult.rowsAffected,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Pre-harvest [id] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
