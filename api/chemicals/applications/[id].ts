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
    const appId = Number(id);
    const db = getDb();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM chemical_applications WHERE id = ? AND user_id = ?',
        args: [appId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const {
        product_name,
        active_ingredient,
        epa_registration_number,
        application_date,
        application_location,
        quantity_applied,
        quantity_unit,
        applicator_name,
        applicator_license,
        weather_conditions,
        pre_harvest_interval_days,
        pre_harvest_interval_end_date,
        mrl_ppm,
        expected_residue_level_ppm,
        notes,
      } = req.body;

      const checkResult = await db.execute({
        sql: 'SELECT id FROM chemical_applications WHERE id = ? AND user_id = ?',
        args: [appId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      await db.execute({
        sql: `UPDATE chemical_applications SET
          product_name = ?, active_ingredient = ?, epa_registration_number = ?,
          application_date = ?, application_location = ?, quantity_applied = ?,
          quantity_unit = ?, applicator_name = ?, applicator_license = ?,
          weather_conditions = ?, pre_harvest_interval_days = ?,
          pre_harvest_interval_end_date = ?, mrl_ppm = ?,
          expected_residue_level_ppm = ?, notes = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          product_name, active_ingredient, epa_registration_number,
          application_date, application_location, quantity_applied,
          quantity_unit, applicator_name, applicator_license,
          weather_conditions, pre_harvest_interval_days,
          pre_harvest_interval_end_date, mrl_ppm,
          expected_residue_level_ppm, notes, appId, userId,
        ],
      });

      return res.status(200).json({ message: 'Application updated successfully' });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM chemical_applications WHERE id = ? AND user_id = ?',
        args: [appId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      await db.execute({
        sql: 'DELETE FROM chemical_applications WHERE id = ? AND user_id = ?',
        args: [appId, userId],
      });

      return res.status(200).json({ message: 'Application deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chemical applications [id] error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
