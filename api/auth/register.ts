import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';
import { getDb, initDb } from '../_db';
import { signToken } from '../_auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_name: z.string().optional().default(''),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { email, password, first_name, last_name, organization_name } = parsed.data;
    const db = getDb();

    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    const result = await db.execute({
      sql: `INSERT INTO users (email, password_hash, first_name, last_name, organization_name) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [email, passwordHash, first_name, last_name, organization_name],
    });

    const userId = Number(result.lastInsertRowid);
    const token = signToken(userId);

    return res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        first_name,
        last_name,
        organization_name,
        role: 'farmer',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
