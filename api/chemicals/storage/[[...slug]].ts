import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../../_db.js';
import { verifyToken } from '../../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    const slug = req.query.slug as string[] | undefined;
    const id = slug?.[0];

    // Collection routes: /api/chemicals/storage
    if (!id) {
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
    }

    // Individual resource routes: /api/chemicals/storage/[id]
    const storageId = Number(id);

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM chemical_storage WHERE id = ? AND user_id = ?',
        args: [storageId, userId],
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Storage record not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
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

      const checkResult = await db.execute({
        sql: 'SELECT id FROM chemical_storage WHERE id = ? AND user_id = ?',
        args: [storageId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Storage record not found' });
      }

      await db.execute({
        sql: `UPDATE chemical_storage SET
          product_name = ?, storage_location = ?, quantity_stored = ?,
          quantity_unit = ?, received_date = ?, expiration_date = ?,
          storage_conditions = ?, safety_equipment_available = ?,
          last_inventory_date = ?, notes = ?
          WHERE id = ? AND user_id = ?`,
        args: [
          product_name, storage_location, quantity_stored,
          quantity_unit, received_date, expiration_date,
          storage_conditions, safety_equipment_available,
          last_inventory_date, notes, storageId, userId,
        ],
      });

      return res.status(200).json({ message: 'Storage record updated successfully' });
    }

    if (req.method === 'DELETE') {
      const checkResult = await db.execute({
        sql: 'SELECT id FROM chemical_storage WHERE id = ? AND user_id = ?',
        args: [storageId, userId],
      });

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Storage record not found' });
      }

      await db.execute({
        sql: 'DELETE FROM chemical_storage WHERE id = ? AND user_id = ?',
        args: [storageId, userId],
      });

      return res.status(200).json({ message: 'Storage record deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Chemical storage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
