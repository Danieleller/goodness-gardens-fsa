import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';
import { getDb } from './_db.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verify a Supabase JWT and return the app-level user ID.
 * If the user exists in Supabase but not in our app DB, auto-provision them.
 */
export async function verifyToken(req: VercelRequest): Promise<number | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);

  try {
    // Verify the Supabase JWT and get the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const email = user.email;
    const phone = user.phone;

    if (!email && !phone) return null;

    const db = getDb();

    // Try to find existing user by email or phone
    let result;
    if (email) {
      result = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND is_active = 1',
        args: [email],
      });
    }

    if ((!result || result.rows.length === 0) && phone) {
      result = await db.execute({
        sql: 'SELECT id FROM users WHERE phone = ? AND is_active = 1',
        args: [phone],
      });
    }

    if (result && result.rows.length > 0) {
      return (result.rows[0] as any).id;
    }

    // Auto-provision: create user in app DB from Supabase user
    const metadata = user.user_metadata || {};
    const firstName = metadata.full_name?.split(' ')[0] || metadata.name?.split(' ')[0] || '';
    const lastName = metadata.full_name?.split(' ').slice(1).join(' ') || metadata.name?.split(' ').slice(1).join(' ') || '';

    const insertResult = await db.execute({
      sql: `INSERT INTO users (email, first_name, last_name, organization_name, role, is_active, password_hash)
            VALUES (?, ?, ?, 'Goodness Gardens', 'worker', 1, 'supabase-auth')`,
      args: [email || phone || '', firstName, lastName],
    });

    return Number(insertResult.lastInsertRowid) || null;
  } catch {
    return null;
  }
}

// Keep signToken for backward compatibility during migration
export function signToken(_userId: number): string {
  return 'deprecated-use-supabase-auth';
}
