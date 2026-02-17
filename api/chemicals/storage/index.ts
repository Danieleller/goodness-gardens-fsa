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
        sql: 'SELECT * FROM chemical_storage WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        product_name,
        storage_location,
        quantity_stored,
        quantity_unit,
        received_date,
        expiration_date,
        storage_conditions,
        safety_equipment_available,
        last_inventory_date,
        notes,
      } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO chemical_storage (
          user_id, product_name, storage_location, quantity_stored, quantity_unit,
          received_date, expiration_date, storage_conditions, safety_equipment_available,
          last_inventory_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, product_name, storage_location, quantity_stored, quantity_unit,
          received_date, expiration_date, storage_conditions, safety_equipment_available,
          last_inventory_date, notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Chemical storage record created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chemical storage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
