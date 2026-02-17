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
        sql: 'SELECT * FROM chemical_applications WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
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

      const result = await db.execute({
        sql: `INSERT INTO chemical_applications (
          user_id, product_name, active_ingredient, epa_registration_number,
          application_date, application_location, quantity_applied, quantity_unit,
          applicator_name, applicator_license, weather_conditions,
          pre_harvest_interval_days, pre_harvest_interval_end_date,
          mrl_ppm, expected_residue_level_ppm, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, product_name, active_ingredient, epa_registration_number,
          application_date, application_location, quantity_applied, quantity_unit,
          applicator_name, applicator_license, weather_conditions,
          pre_harvest_interval_days, pre_harvest_interval_end_date,
          mrl_ppm, expected_residue_level_ppm, notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Chemical application created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chemical applications error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
