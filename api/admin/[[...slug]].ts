import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import { getDb, initDb } from '../_db.js';
import { verifyToken } from '../_auth.js';

const inviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_name: z.string().optional().default(''),
  temp_password: z.string().min(6),
});

const updateSchema = z.object({
  role: z.enum(['farmer', 'admin']).optional(),
  is_active: z.number().min(0).max(1).optional(),
});

const resetPasswordSchema = z.object({
  temp_password: z.string().min(6),
});

async function requireAdmin(userId: number, db: any): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ? AND is_active = 1',
    args: [userId],
  });
  return result.rows.length > 0 && result.rows[0].role === 'admin';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();

    // Check admin role
    const isAdmin = await requireAdmin(userId, db);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const slug = req.query.slug as string[] | undefined;
    // Patterns:
    // /api/admin             -> slug = undefined  (list / create)
    // /api/admin/123         -> slug = ['123']     (update / delete)
    // /api/admin/123/reset-password -> slug = ['123', 'reset-password']

    // slug[0] can be a numeric ID or 'list' for collection routes
    const firstSegment = slug?.[0];
    const isCollection = !firstSegment || firstSegment === 'list' || isNaN(Number(firstSegment));
    const targetId = !isCollection ? Number(firstSegment) : null;
    const action = slug?.[1]; // 'reset-password'

    // POST /api/admin/:id/reset-password
    if (targetId && action === 'reset-password' && req.method === 'POST') {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const userCheck = await db.execute({
        sql: 'SELECT id FROM users WHERE id = ?',
        args: [targetId],
      });
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const passwordHash = await bcryptjs.hash(parsed.data.temp_password, 10);
      await db.execute({
        sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
        args: [passwordHash, targetId],
      });

      return res.status(200).json({ message: 'Password reset successfully' });
    }

    // Collection routes: /api/admin/list (GET = list, POST = create)
    if (isCollection) {
      if (req.method === 'GET') {
        const result = await db.execute({
          sql: 'SELECT id, email, first_name, last_name, organization_name, role, is_active, created_at FROM users ORDER BY created_at DESC',
          args: [],
        });
        return res.status(200).json(result.rows);
      }

      if (req.method === 'POST') {
        const parsed = inviteSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
        }

        const { email, first_name, last_name, organization_name, temp_password } = parsed.data;

        const existing = await db.execute({
          sql: 'SELECT id FROM users WHERE email = ?',
          args: [email],
        });
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcryptjs.hash(temp_password, 10);
        const result = await db.execute({
          sql: `INSERT INTO users (email, password_hash, first_name, last_name, organization_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, 'farmer', 1)`,
          args: [email, passwordHash, first_name, last_name, organization_name],
        });

        return res.status(201).json({
          id: Number(result.lastInsertRowid),
          email,
          first_name,
          last_name,
          organization_name,
          role: 'farmer',
          is_active: 1,
          message: 'User invited successfully',
        });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Individual routes: /api/admin/users/:id
    if (req.method === 'PUT') {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      }

      const userCheck = await db.execute({
        sql: 'SELECT id, role FROM users WHERE id = ?',
        args: [targetId],
      });
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { role, is_active } = parsed.data;

      // Prevent removing the last admin
      if (role && role !== 'admin' && (userCheck.rows[0] as any).role === 'admin') {
        const adminCount = await db.execute({
          sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1",
          args: [],
        });
        if (Number((adminCount.rows[0] as any).count) <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin' });
        }
      }

      if (is_active === 0 && (userCheck.rows[0] as any).role === 'admin') {
        const adminCount = await db.execute({
          sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1",
          args: [],
        });
        if (Number((adminCount.rows[0] as any).count) <= 1) {
          return res.status(400).json({ error: 'Cannot deactivate the last admin' });
        }
      }

      const updates: string[] = [];
      const args: any[] = [];

      if (role !== undefined) {
        updates.push('role = ?');
        args.push(role);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        args.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      args.push(targetId);
      await db.execute({
        sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      const updated = await db.execute({
        sql: 'SELECT id, email, first_name, last_name, organization_name, role, is_active, created_at FROM users WHERE id = ?',
        args: [targetId],
      });

      return res.status(200).json(updated.rows[0]);
    }

    if (req.method === 'DELETE') {
      const userCheck = await db.execute({
        sql: 'SELECT id, role FROM users WHERE id = ?',
        args: [targetId],
      });
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if ((userCheck.rows[0] as any).role === 'admin') {
        const adminCount = await db.execute({
          sql: "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1",
          args: [],
        });
        if (Number((adminCount.rows[0] as any).count) <= 1) {
          return res.status(400).json({ error: 'Cannot deactivate the last admin' });
        }
      }

      await db.execute({
        sql: 'UPDATE users SET is_active = 0 WHERE id = ?',
        args: [targetId],
      });

      return res.status(200).json({ message: 'User deactivated successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
