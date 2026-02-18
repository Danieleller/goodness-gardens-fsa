import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb, initDb } from './_db.js';
import { signToken, verifyToken } from './_auth.js';

// ============================================================================
// SCHEMAS
// ============================================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_name: z.string().optional().default(''),
});

const inviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  organization_name: z.string().optional().default(''),
  title: z.string().optional().default(''),
  temp_password: z.string().min(6),
  facility_id: z.number().nullable().optional(),
});

const adminUpdateSchema = z.object({
  role: z.enum(['worker', 'farmer', 'supervisor', 'fsqa', 'management', 'admin']).optional(),
  is_active: z.number().min(0).max(1).optional(),
  facility_id: z.number().nullable().optional(),
  title: z.string().optional(),
});

const resetPasswordSchema = z.object({
  temp_password: z.string().min(6),
});

// ============================================================================
// HELPERS
// ============================================================================

async function requireAdmin(userId: number, db: any): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ? AND is_active = 1',
    args: [userId],
  });
  return result.rows.length > 0 && (result.rows[0] as any).role === 'admin';
}

async function requireSupervisor(userId: number, db: any): Promise<boolean> {
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ? AND is_active = 1',
    args: [userId],
  });
  const userRow = result.rows[0] as any;
  return result.rows.length > 0 && (userRow.role === 'admin' || userRow.role === 'supervisor');
}

// ============================================================================
// PHASE 1: RBAC, SEARCH, TRANSACTIONS, AUDIT LOG HELPERS
// ============================================================================

async function requireRole(userId: number, db: any, allowedRoles: string[]): Promise<{ allowed: boolean; role: string }> {
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ? AND is_active = 1',
    args: [userId],
  });
  if (result.rows.length === 0) return { allowed: false, role: '' };
  const role = (result.rows[0] as any).role;
  return { allowed: allowedRoles.includes(role), role };
}

async function requirePermission(userId: number, db: any, permissionCode: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM users u
          JOIN role_permissions rp ON u.role = rp.role
          WHERE u.id = ? AND u.is_active = 1 AND rp.permission_code = ?`,
    args: [userId, permissionCode],
  });
  return result.rows.length > 0;
}

async function getUserRole(userId: number, db: any): Promise<string> {
  const result = await db.execute({
    sql: 'SELECT role FROM users WHERE id = ? AND is_active = 1',
    args: [userId],
  });
  return result.rows.length > 0 ? (result.rows[0] as any).role : '';
}

async function logAuditAction(db: any, userId: number, action: string, entityType: string, entityId: number | null, before?: any, after?: any) {
  try {
    await db.execute({
      sql: `INSERT INTO system_audit_log (user_id, action, entity_type, entity_id, before_value, after_value)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, action, entityType, entityId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
    });
  } catch (_e) { /* silently fail audit logging */ }
}

async function generateTransactionId(db: any, programType: string): Promise<string | null> {
  const config = await db.execute({
    sql: 'SELECT prefix, next_number FROM transaction_prefix_config WHERE program_type = ? AND is_active = 1',
    args: [programType],
  });
  if (config.rows.length === 0) return null;
  const row = config.rows[0] as any;
  const txId = `${row.prefix}-${row.next_number}`;
  await db.execute({
    sql: 'UPDATE transaction_prefix_config SET next_number = next_number + 1 WHERE program_type = ?',
    args: [programType],
  });
  return txId;
}

async function upsertSearchIndex(db: any, entityType: string, entityId: number, title: string, subtitle: string | null, tags: string | null, facilityId: number | null, url: string) {
  const tokens = [title, subtitle, tags].filter(Boolean).join(' ').toLowerCase();
  try {
    await db.execute({
      sql: `INSERT INTO search_index (entity_type, entity_id, title, subtitle, tokens, tags, facility_id, url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
              title = excluded.title, subtitle = excluded.subtitle, tokens = excluded.tokens,
              tags = excluded.tags, facility_id = excluded.facility_id, url = excluded.url,
              updated_at = datetime('now')`,
      args: [entityType, entityId, title, subtitle, tokens, tags, facilityId, url],
    });
  } catch (_e) { /* silently fail search indexing */ }
}

// ============================================================================
// SEARCH HANDLER
// ============================================================================

async function handleSearch(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = String(req.query?.q || '').trim().toLowerCase();
  if (!q || q.length < 2) return res.status(200).json({ results: [] });

  const typeFilter = req.query?.type ? String(req.query.type) : null;
  const limit = Math.min(Number(req.query?.limit) || 20, 50);

  // Build WHERE clause
  const words = q.split(/\s+/).filter(Boolean);
  const conditions: string[] = [];
  const args: any[] = [];

  for (const word of words) {
    conditions.push('tokens LIKE ?');
    args.push(`%${word}%`);
  }

  let sql = `SELECT entity_type, entity_id, title, subtitle, tags, url,
             CASE WHEN LOWER(title) = ? THEN 100
                  WHEN LOWER(title) LIKE ? THEN 80
                  ELSE 50 END as relevance
             FROM search_index
             WHERE ${conditions.join(' AND ')}`;
  const relevanceArgs = [q, `%${q}%`];

  if (typeFilter) {
    sql += ' AND entity_type = ?';
    args.push(typeFilter);
  }

  sql += ' ORDER BY relevance DESC, updated_at DESC LIMIT ?';
  args.push(limit);

  const result = await db.execute({ sql, args: [...relevanceArgs, ...args] });

  // Group results by type
  const grouped: Record<string, any[]> = {};
  for (const row of result.rows) {
    const r = row as any;
    if (!grouped[r.entity_type]) grouped[r.entity_type] = [];
    grouped[r.entity_type].push({
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      title: r.title,
      subtitle: r.subtitle,
      tags: r.tags,
      url: r.url,
    });
  }

  return res.status(200).json({ results: grouped, total: result.rows.length });
}

// ============================================================================
// SETUP HANDLERS (Transaction Config, Audit Log, Permissions)
// ============================================================================

async function handleSetup(req: VercelRequest, res: VercelResponse, db: any, userId: number, pathArray: string[]) {
  const isAdminUser = await requireAdmin(userId, db);
  if (!isAdminUser) return res.status(403).json({ error: 'Admin access required' });

  const section = pathArray[0];

  // GET /api/setup/transaction-config
  if (section === 'transaction-config') {
    if (req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT * FROM transaction_prefix_config ORDER BY program_type', args: [] });
      return res.status(200).json(result.rows);
    }
    if (req.method === 'PUT' && pathArray[1]) {
      const id = Number(pathArray[1]);
      const { prefix, next_number, is_active } = req.body || {};
      const before = await db.execute({ sql: 'SELECT * FROM transaction_prefix_config WHERE id = ?', args: [id] });
      if (prefix !== undefined) {
        await db.execute({ sql: 'UPDATE transaction_prefix_config SET prefix = ? WHERE id = ?', args: [prefix, id] });
      }
      if (next_number !== undefined) {
        await db.execute({ sql: 'UPDATE transaction_prefix_config SET next_number = ? WHERE id = ?', args: [next_number, id] });
      }
      if (is_active !== undefined) {
        await db.execute({ sql: 'UPDATE transaction_prefix_config SET is_active = ? WHERE id = ?', args: [is_active, id] });
      }
      const after = await db.execute({ sql: 'SELECT * FROM transaction_prefix_config WHERE id = ?', args: [id] });
      await logAuditAction(db, userId, 'update', 'transaction_prefix_config', id, before.rows[0], after.rows[0]);
      return res.status(200).json(after.rows[0]);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // GET /api/setup/audit-log
  if (section === 'audit-log') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const limit = Math.min(Number(req.query?.limit) || 50, 200);
    const offset = Number(req.query?.offset) || 0;
    const result = await db.execute({
      sql: `SELECT sal.*, u.first_name, u.last_name, u.email
            FROM system_audit_log sal
            LEFT JOIN users u ON sal.user_id = u.id
            ORDER BY sal.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });
    const count = await db.execute({ sql: 'SELECT COUNT(*) as total FROM system_audit_log', args: [] });
    return res.status(200).json({ logs: result.rows, total: (count.rows[0] as any).total });
  }

  // GET /api/setup/permissions
  if (section === 'permissions') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const perms = await db.execute({ sql: 'SELECT * FROM permissions ORDER BY category, code', args: [] });
    const rolePerms = await db.execute({ sql: 'SELECT * FROM role_permissions ORDER BY role, permission_code', args: [] });
    return res.status(200).json({ permissions: perms.rows, rolePermissions: rolePerms.rows });
  }

  // GET /api/setup/roles
  if (section === 'roles') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return res.status(200).json({ roles: ['worker', 'supervisor', 'fsqa', 'management', 'admin'] });
  }

  return res.status(404).json({ error: 'Setup section not found' });
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

async function handleAuthLogin(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }

  const { email, password } = parsed.data;

  const result = await db.execute({
    sql: 'SELECT id, email, password_hash, first_name, last_name, organization_name, title, role, is_active FROM users WHERE email = ?',
    args: [email],
  });

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = result.rows[0] as any;
  const passwordMatch = await bcryptjs.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
  }

  const token = signToken(user.id);

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      organization_name: user.organization_name,
      title: user.title || '',
      role: user.role,
    },
  });
}

async function handleAuthRegister(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
  }

  const { email, password, first_name, last_name, organization_name } = parsed.data;

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });

  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcryptjs.hash(password, 10);
  const result = await db.execute({
    sql: `INSERT INTO users (email, password_hash, first_name, last_name, organization_name, role, is_active)
          VALUES (?, ?, ?, ?, ?, 'farmer', 1)`,
    args: [email, passwordHash, first_name, last_name, organization_name],
  });

  const token = signToken(Number(result.lastInsertRowid));

  return res.status(201).json({
    token,
    user: {
      id: Number(result.lastInsertRowid),
      email,
      first_name,
      last_name,
      organization_name,
      role: 'farmer',
    },
  });
}

async function handleAuthMe(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await db.execute({
    sql: 'SELECT id, email, first_name, last_name, organization_name, role, is_active FROM users WHERE id = ?',
    args: [userId],
  });

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json(result.rows[0]);
}

// ============================================================================
// PRE-HARVEST HANDLERS
// ============================================================================

async function handlePreHarvest(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  // Collection routes
  if (!id) {
    if (req.method === 'GET') {
      const { log_type } = req.query;
      let sql = 'SELECT * FROM pre_harvest_logs WHERE user_id = ? ORDER BY created_at DESC';
      const args: any[] = [userId];

      if (log_type) {
        sql = 'SELECT * FROM pre_harvest_logs WHERE user_id = ? AND log_type = ? ORDER BY created_at DESC';
        args.push(log_type);
      }

      const result = await db.execute({ sql, args });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        log_type, water_source, test_date, ph_level, e_coli_result, total_coliform_result,
        test_location, lab_name, amendment_type, amendment_date, source, quantity_applied,
        quantity_unit, field_location, training_date, training_topic, trainee_name,
        handwashing_station_available, sanitation_checklist_pass, intrusion_date, intrusion_type,
        intrusion_location, remedial_action, corrected_date, notes,
      } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO pre_harvest_logs (
          user_id, log_type, water_source, test_date, ph_level, e_coli_result,
          total_coliform_result, test_location, lab_name, amendment_type, amendment_date,
          source, quantity_applied, quantity_unit, field_location, training_date,
          training_topic, trainee_name, handwashing_station_available, sanitation_checklist_pass,
          intrusion_date, intrusion_type, intrusion_location, remedial_action, corrected_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, log_type, water_source, test_date, ph_level, e_coli_result,
          total_coliform_result, test_location, lab_name, amendment_type, amendment_date,
          source, quantity_applied, quantity_unit, field_location, training_date,
          training_topic, trainee_name, handwashing_station_available, sanitation_checklist_pass,
          intrusion_date, intrusion_type, intrusion_location, remedial_action, corrected_date, notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Pre-harvest log created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Individual resource
  const logId = Number(id);

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
      log_type, water_source, test_date, ph_level, e_coli_result, total_coliform_result,
      test_location, lab_name, amendment_type, amendment_date, source, quantity_applied,
      quantity_unit, field_location, training_date, training_topic, trainee_name,
      handwashing_station_available, sanitation_checklist_pass, intrusion_date, intrusion_type,
      intrusion_location, remedial_action, corrected_date, notes,
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
}

// ============================================================================
// CHEMICAL HANDLERS
// ============================================================================

async function handleChemicalApplications(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM chemical_applications WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        product_name, active_ingredient, epa_registration_number, application_date,
        application_location, quantity_applied, quantity_unit, applicator_name,
        applicator_license, weather_conditions, pre_harvest_interval_days,
        pre_harvest_interval_end_date, mrl_ppm, expected_residue_level_ppm, notes,
      } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO chemical_applications (
          user_id, product_name, active_ingredient, epa_registration_number, application_date,
          application_location, quantity_applied, quantity_unit, applicator_name, applicator_license,
          weather_conditions, pre_harvest_interval_days, pre_harvest_interval_end_date,
          mrl_ppm, expected_residue_level_ppm, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, product_name, active_ingredient, epa_registration_number, application_date,
          application_location, quantity_applied, quantity_unit, applicator_name, applicator_license,
          weather_conditions, pre_harvest_interval_days, pre_harvest_interval_end_date,
          mrl_ppm, expected_residue_level_ppm, notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Chemical application created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = Number(id);

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
      product_name, active_ingredient, epa_registration_number, application_date,
      application_location, quantity_applied, quantity_unit, applicator_name,
      applicator_license, weather_conditions, pre_harvest_interval_days,
      pre_harvest_interval_end_date, mrl_ppm, expected_residue_level_ppm, notes,
    } = req.body;

    const checkResult = await db.execute({
      sql: 'SELECT id FROM chemical_applications WHERE id = ? AND user_id = ?',
      args: [appId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updateResult = await db.execute({
      sql: `UPDATE chemical_applications SET
        product_name = ?, active_ingredient = ?, epa_registration_number = ?, application_date = ?,
        application_location = ?, quantity_applied = ?, quantity_unit = ?, applicator_name = ?,
        applicator_license = ?, weather_conditions = ?, pre_harvest_interval_days = ?,
        pre_harvest_interval_end_date = ?, mrl_ppm = ?, expected_residue_level_ppm = ?, notes = ?
        WHERE id = ? AND user_id = ?`,
      args: [
        product_name, active_ingredient, epa_registration_number, application_date,
        application_location, quantity_applied, quantity_unit, applicator_name,
        applicator_license, weather_conditions, pre_harvest_interval_days,
        pre_harvest_interval_end_date, mrl_ppm, expected_residue_level_ppm, notes,
        appId, userId,
      ],
    });

    return res.status(200).json({
      message: 'Application updated successfully',
      rowsAffected: updateResult.rowsAffected,
    });
  }

  if (req.method === 'DELETE') {
    const checkResult = await db.execute({
      sql: 'SELECT id FROM chemical_applications WHERE id = ? AND user_id = ?',
      args: [appId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM chemical_applications WHERE id = ? AND user_id = ?',
      args: [appId, userId],
    });

    return res.status(200).json({
      message: 'Application deleted successfully',
      rowsAffected: deleteResult.rowsAffected,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleChemicalStorage(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
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
        product_name, storage_location, quantity_stored, quantity_unit,
        received_date, expiration_date, storage_conditions, safety_equipment_available,
        last_inventory_date, notes,
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
      product_name, storage_location, quantity_stored, quantity_unit,
      received_date, expiration_date, storage_conditions, safety_equipment_available,
      last_inventory_date, notes,
    } = req.body;

    const checkResult = await db.execute({
      sql: 'SELECT id FROM chemical_storage WHERE id = ? AND user_id = ?',
      args: [storageId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Storage record not found' });
    }

    const updateResult = await db.execute({
      sql: `UPDATE chemical_storage SET
        product_name = ?, storage_location = ?, quantity_stored = ?, quantity_unit = ?,
        received_date = ?, expiration_date = ?, storage_conditions = ?,
        safety_equipment_available = ?, last_inventory_date = ?, notes = ?
        WHERE id = ? AND user_id = ?`,
      args: [
        product_name, storage_location, quantity_stored, quantity_unit,
        received_date, expiration_date, storage_conditions, safety_equipment_available,
        last_inventory_date, notes, storageId, userId,
      ],
    });

    return res.status(200).json({
      message: 'Storage record updated successfully',
      rowsAffected: updateResult.rowsAffected,
    });
  }

  if (req.method === 'DELETE') {
    const checkResult = await db.execute({
      sql: 'SELECT id FROM chemical_storage WHERE id = ? AND user_id = ?',
      args: [storageId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Storage record not found' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM chemical_storage WHERE id = ? AND user_id = ?',
      args: [storageId, userId],
    });

    return res.status(200).json({
      message: 'Storage record deleted successfully',
      rowsAffected: deleteResult.rowsAffected,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// CORRECTIVE ACTIONS HANDLERS
// ============================================================================

async function handleNonconformances(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM nonconformances WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { finding_date, finding_category, finding_description, severity, affected_area, root_cause } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO nonconformances (
          user_id, finding_date, finding_category, finding_description, severity, affected_area, root_cause
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, finding_date, finding_category, finding_description, severity, affected_area, root_cause],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Nonconformance created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ncId = Number(id);

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT * FROM nonconformances WHERE id = ? AND user_id = ?',
      args: [ncId, userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'PUT') {
    const { finding_date, finding_category, finding_description, severity, affected_area, root_cause } = req.body;

    const checkResult = await db.execute({
      sql: 'SELECT id FROM nonconformances WHERE id = ? AND user_id = ?',
      args: [ncId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance not found' });
    }

    const updateResult = await db.execute({
      sql: `UPDATE nonconformances SET
        finding_date = ?, finding_category = ?, finding_description = ?, severity = ?, affected_area = ?, root_cause = ?
        WHERE id = ? AND user_id = ?`,
      args: [finding_date, finding_category, finding_description, severity, affected_area, root_cause, ncId, userId],
    });

    return res.status(200).json({
      message: 'Nonconformance updated successfully',
      rowsAffected: updateResult.rowsAffected,
    });
  }

  if (req.method === 'DELETE') {
    const checkResult = await db.execute({
      sql: 'SELECT id FROM nonconformances WHERE id = ? AND user_id = ?',
      args: [ncId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nonconformance not found' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM nonconformances WHERE id = ? AND user_id = ?',
      args: [ncId, userId],
    });

    return res.status(200).json({
      message: 'Nonconformance deleted successfully',
      rowsAffected: deleteResult.rowsAffected,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCapa(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `SELECT ca.* FROM corrective_actions ca
              WHERE ca.user_id = ? ORDER BY ca.created_at DESC`,
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        nonconformance_id, action_description, responsible_party,
        target_completion_date, status, verification_method,
      } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO corrective_actions (
          user_id, nonconformance_id, action_description, responsible_party, target_completion_date, status, verification_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, nonconformance_id, action_description, responsible_party, target_completion_date, status, verification_method],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'CAPA created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const capaId = Number(id);

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT * FROM corrective_actions WHERE id = ? AND user_id = ?',
      args: [capaId, userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'PUT') {
    const {
      action_description, responsible_party, target_completion_date, actual_completion_date,
      status, verification_method, verification_date, verified_by, verification_notes,
    } = req.body;

    const checkResult = await db.execute({
      sql: 'SELECT id FROM corrective_actions WHERE id = ? AND user_id = ?',
      args: [capaId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA not found' });
    }

    const updateResult = await db.execute({
      sql: `UPDATE corrective_actions SET
        action_description = ?, responsible_party = ?, target_completion_date = ?, actual_completion_date = ?,
        status = ?, verification_method = ?, verification_date = ?, verified_by = ?, verification_notes = ?
        WHERE id = ? AND user_id = ?`,
      args: [
        action_description, responsible_party, target_completion_date, actual_completion_date,
        status, verification_method, verification_date, verified_by, verification_notes,
        capaId, userId,
      ],
    });

    return res.status(200).json({
      message: 'CAPA updated successfully',
      rowsAffected: updateResult.rowsAffected,
    });
  }

  if (req.method === 'DELETE') {
    const checkResult = await db.execute({
      sql: 'SELECT id FROM corrective_actions WHERE id = ? AND user_id = ?',
      args: [capaId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'CAPA not found' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM corrective_actions WHERE id = ? AND user_id = ?',
      args: [capaId, userId],
    });

    return res.status(200).json({
      message: 'CAPA deleted successfully',
      rowsAffected: deleteResult.rowsAffected,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleAuditChecklists(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT * FROM audit_checklists WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        audit_date, audit_name, water_safety_checked, soil_amendment_checked,
        worker_hygiene_checked, animal_intrusion_checked, chemical_applications_checked,
        mrl_compliance_checked, storage_conditions_checked, nonconformances_tracked,
        capas_documented, capas_verified, overall_status, auditor_name, audit_notes,
      } = req.body;

      const result = await db.execute({
        sql: `INSERT INTO audit_checklists (
          user_id, audit_date, audit_name, water_safety_checked, soil_amendment_checked,
          worker_hygiene_checked, animal_intrusion_checked, chemical_applications_checked,
          mrl_compliance_checked, storage_conditions_checked, nonconformances_tracked,
          capas_documented, capas_verified, overall_status, auditor_name, audit_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId, audit_date, audit_name, water_safety_checked, soil_amendment_checked,
          worker_hygiene_checked, animal_intrusion_checked, chemical_applications_checked,
          mrl_compliance_checked, storage_conditions_checked, nonconformances_tracked,
          capas_documented, capas_verified, overall_status, auditor_name, audit_notes,
        ],
      });

      return res.status(201).json({
        id: Number(result.lastInsertRowid),
        message: 'Audit checklist created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checklistId = Number(id);

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT * FROM audit_checklists WHERE id = ? AND user_id = ?',
      args: [checklistId, userId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit checklist not found' });
    }

    return res.status(200).json(result.rows[0]);
  }

  if (req.method === 'PUT') {
    const {
      audit_date, audit_name, water_safety_checked, soil_amendment_checked,
      worker_hygiene_checked, animal_intrusion_checked, chemical_applications_checked,
      mrl_compliance_checked, storage_conditions_checked, nonconformances_tracked,
      capas_documented, capas_verified, overall_status, auditor_name, audit_notes,
    } = req.body;

    const checkResult = await db.execute({
      sql: 'SELECT id FROM audit_checklists WHERE id = ? AND user_id = ?',
      args: [checklistId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Audit checklist not found' });
    }

    const updateResult = await db.execute({
      sql: `UPDATE audit_checklists SET
        audit_date = ?, audit_name = ?, water_safety_checked = ?, soil_amendment_checked = ?,
        worker_hygiene_checked = ?, animal_intrusion_checked = ?, chemical_applications_checked = ?,
        mrl_compliance_checked = ?, storage_conditions_checked = ?, nonconformances_tracked = ?,
        capas_documented = ?, capas_verified = ?, overall_status = ?, auditor_name = ?, audit_notes = ?
        WHERE id = ? AND user_id = ?`,
      args: [
        audit_date, audit_name, water_safety_checked, soil_amendment_checked,
        worker_hygiene_checked, animal_intrusion_checked, chemical_applications_checked,
        mrl_compliance_checked, storage_conditions_checked, nonconformances_tracked,
        capas_documented, capas_verified, overall_status, auditor_name, audit_notes,
        checklistId, userId,
      ],
    });

    return res.status(200).json({
      message: 'Audit checklist updated successfully',
      rowsAffected: updateResult.rowsAffected,
    });
  }

  if (req.method === 'DELETE') {
    const checkResult = await db.execute({
      sql: 'SELECT id FROM audit_checklists WHERE id = ? AND user_id = ?',
      args: [checklistId, userId],
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Audit checklist not found' });
    }

    const deleteResult = await db.execute({
      sql: 'DELETE FROM audit_checklists WHERE id = ? AND user_id = ?',
      args: [checklistId, userId],
    });

    return res.status(200).json({
      message: 'Audit checklist deleted successfully',
      rowsAffected: deleteResult.rowsAffected,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// ADMIN HANDLERS
// ============================================================================

async function handleAdmin(req: VercelRequest, res: VercelResponse, db: any, userId: number, pathSegments: string[]) {
  const isAdmin = await requireAdmin(userId, db);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const firstSegment = pathSegments[0];
  const isCollection = !firstSegment || isNaN(Number(firstSegment));
  const targetId = !isCollection ? Number(firstSegment) : null;
  const action = pathSegments[1];

  // POST /admin/:id/reset-password
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

  // Collection routes
  if (isCollection) {
    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `SELECT u.id, u.email, u.first_name, u.last_name, u.organization_name, u.title, u.role, u.is_active, u.created_at,
              uf.facility_id, f.name as facility_name, f.code as facility_code
              FROM users u
              LEFT JOIN user_facilities uf ON u.id = uf.user_id
              LEFT JOIN facilities f ON uf.facility_id = f.id
              ORDER BY u.created_at DESC`,
        args: [],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const parsed = inviteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
      }

      const { email, first_name, last_name, organization_name, title, temp_password, facility_id } = parsed.data;

      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [email],
      });
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcryptjs.hash(temp_password, 10);
      const result = await db.execute({
        sql: `INSERT INTO users (email, password_hash, first_name, last_name, organization_name, title, role, is_active)
              VALUES (?, ?, ?, ?, ?, ?, 'farmer', 1)`,
        args: [email, passwordHash, first_name, last_name, organization_name, title],
      });

      const newUserId = Number(result.lastInsertRowid);

      // Assign facility if provided (null means Organization / All Facilities)
      if (facility_id) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO user_facilities (user_id, facility_id, role) VALUES (?, ?, ?)',
          args: [newUserId, facility_id, 'worker'],
        });
      }

      return res.status(201).json({
        id: newUserId,
        email,
        first_name,
        last_name,
        organization_name,
        facility_id: facility_id || null,
        role: 'farmer',
        is_active: 1,
        message: 'User invited successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Individual routes
  if (req.method === 'PUT') {
    const parsed = adminUpdateSchema.safeParse(req.body);
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

    const { role, is_active, facility_id, title } = parsed.data;

    // Handle facility assignment change
    if (facility_id !== undefined) {
      // Remove existing facility assignments
      await db.execute({
        sql: 'DELETE FROM user_facilities WHERE user_id = ?',
        args: [targetId],
      });
      // Assign new facility (null = Organization / All Facilities — no row needed)
      if (facility_id !== null) {
        await db.execute({
          sql: 'INSERT INTO user_facilities (user_id, facility_id, role) VALUES (?, ?, ?)',
          args: [targetId, facility_id, 'worker'],
        });
      }
    }

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
    if (title !== undefined) {
      updates.push('title = ?');
      args.push(title);
    }

    if (updates.length === 0 && facility_id === undefined) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    args.push(targetId);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT u.id, u.email, u.first_name, u.last_name, u.organization_name, u.title, u.role, u.is_active, u.created_at,
            uf.facility_id, f.name as facility_name, f.code as facility_code
            FROM users u
            LEFT JOIN user_facilities uf ON u.id = uf.user_id
            LEFT JOIN facilities f ON uf.facility_id = f.id
            WHERE u.id = ?`,
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
}

// ============================================================================
// REPORTS HANDLERS
// ============================================================================

async function handleDashboard(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const waterTestsResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM pre_harvest_logs WHERE user_id = ? AND log_type = ?',
    args: [userId, 'water_test'],
  });

  const chemicalAppsResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM chemical_applications WHERE user_id = ?',
    args: [userId],
  });

  const openNonconformancesResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM corrective_actions WHERE user_id = ? AND status = ?',
    args: [userId, 'open'],
  });

  const closedCapasResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM corrective_actions WHERE user_id = ? AND status = ?',
    args: [userId, 'closed'],
  });

  const recentAuditsResult = await db.execute({
    sql: 'SELECT * FROM audit_checklists WHERE user_id = ? ORDER BY audit_date DESC LIMIT 5',
    args: [userId],
  });

  const nonconformanceByCategoryResult = await db.execute({
    sql: `SELECT finding_category, COUNT(*) as count FROM nonconformances
          WHERE user_id = ? GROUP BY finding_category`,
    args: [userId],
  });

  const chemicalComplianceResult = await db.execute({
    sql: `SELECT COUNT(*) as total,
          SUM(CASE WHEN expected_residue_level_ppm <= mrl_ppm THEN 1 ELSE 0 END) as compliant
          FROM chemical_applications WHERE user_id = ?`,
    args: [userId],
  });

  const waterTests = (waterTestsResult.rows[0] as any)?.count || 0;
  const chemicalApps = (chemicalAppsResult.rows[0] as any)?.count || 0;
  const openNonconformances = (openNonconformancesResult.rows[0] as any)?.count || 0;
  const closedCapas = (closedCapasResult.rows[0] as any)?.count || 0;
  const complianceData = chemicalComplianceResult.rows[0] as any;
  const chemicalCompliance = complianceData?.total
    ? Math.round((complianceData.compliant / complianceData.total) * 100)
    : 0;

  return res.status(200).json({
    kpis: {
      waterTests,
      chemicalApplications: chemicalApps,
      openNonconformances,
      closedCapas,
      chemicalCompliancePercentage: chemicalCompliance,
    },
    recentAudits: recentAuditsResult.rows,
    nonconformanceByCategory: nonconformanceByCategoryResult.rows,
  });
}

async function handleExport(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'type parameter required (preHarvest, chemicals, nonconformances, capas)' });
  }

  let rows: any[] = [];
  let headers: string[] = [];

  if (type === 'preHarvest') {
    const result = await db.execute({
      sql: 'SELECT * FROM pre_harvest_logs WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    rows = result.rows;
    headers = ['id', 'log_type', 'water_source', 'test_date', 'ph_level', 'e_coli_result', 'total_coliform_result', 'test_location', 'lab_name', 'amendment_type', 'amendment_date', 'source', 'quantity_applied', 'quantity_unit', 'field_location', 'training_date', 'training_topic', 'trainee_name', 'handwashing_station_available', 'sanitation_checklist_pass', 'intrusion_date', 'intrusion_type', 'intrusion_location', 'remedial_action', 'corrected_date', 'notes', 'created_at'];
  } else if (type === 'chemicals') {
    const result = await db.execute({
      sql: 'SELECT * FROM chemical_applications WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    rows = result.rows;
    headers = ['id', 'product_name', 'active_ingredient', 'epa_registration_number', 'application_date', 'application_location', 'quantity_applied', 'quantity_unit', 'applicator_name', 'applicator_license', 'weather_conditions', 'pre_harvest_interval_days', 'pre_harvest_interval_end_date', 'mrl_ppm', 'expected_residue_level_ppm', 'notes', 'created_at'];
  } else if (type === 'nonconformances') {
    const result = await db.execute({
      sql: 'SELECT * FROM nonconformances WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    rows = result.rows;
    headers = ['id', 'finding_date', 'finding_category', 'finding_description', 'severity', 'affected_area', 'root_cause', 'created_at'];
  } else if (type === 'capas') {
    const result = await db.execute({
      sql: 'SELECT * FROM corrective_actions WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    rows = result.rows;
    headers = ['id', 'nonconformance_id', 'action_description', 'responsible_party', 'target_completion_date', 'actual_completion_date', 'status', 'verification_method', 'verification_date', 'verified_by', 'verification_notes', 'created_at'];
  } else {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  // Convert to CSV
  const csvHeaders = headers.join(',');
  const csvRows = rows.map((row: any) => {
    return headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
  });

  const csv = [csvHeaders, ...csvRows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="export_${type}_${new Date().toISOString()}.csv"`);
  return res.status(200).send(csv);
}

// ============================================================================
// PLACEHOLDER HANDLERS FOR NEW FEATURES (TO BE IMPLEMENTED)
// ============================================================================

async function handleFacilities(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT * FROM facilities WHERE is_active = 1 ORDER BY name', args: [] });
      return res.status(200).json({ facilities: result.rows });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const fId = Number(id);
  if (req.method === 'GET') {
    const result = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [fId] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    const modules = await db.execute({ sql: 'SELECT fm.*, am.code, am.name as module_name FROM facility_modules fm JOIN audit_modules am ON fm.module_id = am.id WHERE fm.facility_id = ?', args: [fId] });
    return res.status(200).json({ facility: result.rows[0], modules: modules.rows });
  }
  if (req.method === 'PUT') {
    const isAdmin = await requireAdmin(userId, db);
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { name, location, facility_type, organic_scope } = req.body;
    await db.execute({ sql: 'UPDATE facilities SET name = COALESCE(?, name), location = COALESCE(?, location), facility_type = COALESCE(?, facility_type), organic_scope = COALESCE(?, organic_scope) WHERE id = ?', args: [name, location, facility_type, organic_scope, fId] });
    const updated = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [fId] });
    return res.status(200).json(updated.rows[0]);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleChecklistTemplates(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const { facility_type } = req.query;
      let sql = 'SELECT * FROM checklist_templates WHERE is_active = 1';
      const args: any[] = [];
      if (facility_type) { sql += ' AND (facility_type = ? OR facility_type = \'All\')'; args.push(facility_type); }
      sql += ' ORDER BY frequency, name';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ templates: result.rows });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tId = Number(id);
  if (req.method === 'GET') {
    const template = await db.execute({ sql: 'SELECT * FROM checklist_templates WHERE id = ?', args: [tId] });
    if (template.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const items = await db.execute({ sql: 'SELECT * FROM checklist_items WHERE template_id = ? ORDER BY sort_order, item_number', args: [tId] });
    return res.status(200).json({ template: template.rows[0], items: items.rows });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleChecklistSubmissions(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string, action?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const { facility_id, template_id } = req.query;
      let sql = 'SELECT cs.*, ct.name as template_name, ct.code as template_code, u.first_name || \' \' || u.last_name as submitted_by_name FROM checklist_submissions cs JOIN checklist_templates ct ON cs.template_id = ct.id JOIN users u ON cs.submitted_by = u.id WHERE 1=1';
      const args: any[] = [];
      if (facility_id) { sql += ' AND cs.facility_id = ?'; args.push(Number(facility_id)); }
      if (template_id) { sql += ' AND cs.template_id = ?'; args.push(Number(template_id)); }
      sql += ' ORDER BY cs.created_at DESC LIMIT 100';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ submissions: result.rows });
    }
    if (req.method === 'POST') {
      const { facility_id, template_id, answers, notes } = req.body;
      if (!facility_id || !template_id) return res.status(400).json({ error: 'facility_id and template_id required' });
      const answersArr = answers || [];
      let passed = 0; let failed = 0; let critFails = 0;
      for (const a of answersArr) { if (a.is_fail) { failed++; if (a.is_critical) critFails++; } else { passed++; } }
      const total = passed + failed;
      const overall = critFails === 0 && failed <= Math.floor(total * 0.2) ? 1 : 0;
      const sub = await db.execute({
        sql: 'INSERT INTO checklist_submissions (facility_id, template_id, submitted_by, submission_date, overall_pass, critical_fails, total_items, passed_items, notes, status) VALUES (?, ?, ?, datetime(\'now\'), ?, ?, ?, ?, ?, \'submitted\')',
        args: [facility_id, template_id, userId, overall, critFails, total, passed, notes || null],
      });
      const subId = Number(sub.lastInsertRowid);
      for (const a of answersArr) {
        await db.execute({
          sql: 'INSERT INTO checklist_answers (submission_id, item_id, answer_value, notes, photo_url, is_fail) VALUES (?, ?, ?, ?, ?, ?)',
          args: [subId, a.item_id, a.answer_value, a.notes || null, a.photo_url || null, a.is_fail ? 1 : 0],
        });
      }
      return res.status(201).json({ id: subId, overall_pass: overall, critical_fails: critFails, total_items: total, passed_items: passed });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sId = Number(id);
  if (action === 'signoff') {
    if (req.method === 'PUT') {
      const isSup = await requireSupervisor(userId, db);
      if (!isSup) return res.status(403).json({ error: 'Supervisor or admin access required' });
      const { supervisor_notes } = req.body;
      await db.execute({
        sql: 'UPDATE checklist_submissions SET supervisor_id = ?, signoff_date = datetime(\'now\'), supervisor_notes = ?, status = \'approved\' WHERE id = ?',
        args: [userId, supervisor_notes || null, sId],
      });
      return res.status(200).json({ message: 'Sign-off recorded' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (req.method === 'GET') {
    const sub = await db.execute({ sql: 'SELECT cs.*, ct.name as template_name, ct.code as template_code FROM checklist_submissions cs JOIN checklist_templates ct ON cs.template_id = ct.id WHERE cs.id = ?', args: [sId] });
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const answers = await db.execute({ sql: 'SELECT ca.*, ci.item_text, ci.item_type, ci.is_critical FROM checklist_answers ca JOIN checklist_items ci ON ca.item_id = ci.id WHERE ca.submission_id = ? ORDER BY ci.sort_order', args: [sId] });
    return res.status(200).json({ ...sub.rows[0], answers: answers.rows });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSops(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string, action?: string) {
  // --- Tags list (all distinct tags) ---
  if (id === 'tags' && !action) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const result = await db.execute({ sql: 'SELECT tag, COUNT(*) as count FROM sop_tags GROUP BY tag ORDER BY count DESC, tag', args: [] });
    return res.status(200).json({ tags: result.rows });
  }
  // --- File download ---
  if (id === 'files' && action) {
    const fileId = Number(action);
    if (req.method === 'GET') {
      const file = await db.execute({ sql: 'SELECT * FROM sop_files WHERE id = ?', args: [fileId] });
      if (file.rows.length === 0) return res.status(404).json({ error: 'File not found' });
      return res.status(200).json({ file: file.rows[0] });
    }
    if (req.method === 'DELETE') {
      const roleCheck = await requireRole(userId, db, ['admin']);
      if (!roleCheck.allowed) return res.status(403).json({ error: 'Admin access required' });
      await db.execute({ sql: 'DELETE FROM sop_files WHERE id = ?', args: [fileId] });
      return res.status(200).json({ message: 'File deleted' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!id) {
    if (req.method === 'GET') {
      const { category, status, priority, tag } = req.query;
      let sql = 'SELECT sd.* FROM sop_documents sd WHERE 1=1';
      const args: any[] = [];
      if (category) { sql += ' AND sd.category = ?'; args.push(category); }
      if (status) { sql += ' AND sd.status = ?'; args.push(status); }
      if (priority) { sql += ' AND sd.priority = ?'; args.push(priority); }
      if (tag) { sql += ' AND sd.id IN (SELECT sop_id FROM sop_tags WHERE tag = ?)'; args.push(tag); }
      sql += ' ORDER BY sd.code';
      const result = await db.execute({ sql, args });
      // Attach tags to each SOP
      const sopIds = result.rows.map((r: any) => r.id);
      let tagsMap: Record<number, string[]> = {};
      if (sopIds.length > 0) {
        const allTags = await db.execute({ sql: `SELECT sop_id, tag FROM sop_tags WHERE sop_id IN (${sopIds.join(',')})`, args: [] });
        for (const t of allTags.rows as any[]) {
          if (!tagsMap[t.sop_id]) tagsMap[t.sop_id] = [];
          tagsMap[t.sop_id].push(t.tag);
        }
      }
      const sops = result.rows.map((r: any) => ({ ...r, tags: tagsMap[r.id] || [] }));
      return res.status(200).json({ sops });
    }
    if (req.method === 'POST') {
      const isAdmin = await requireAdmin(userId, db);
      if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
      const { code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO sop_documents (code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority || 'MEDIUM'],
      });
      const newId = Number(result.lastInsertRowid);
      await upsertSearchIndex(db, 'document', newId, `${code} - ${title}`, category, null, null, `/sops`);
      return res.status(201).json({ id: newId, message: 'SOP created' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sopId = Number(id);
  // --- Status update ---
  if (action === 'status') {
    if (req.method === 'PUT') {
      const isAdmin = await requireAdmin(userId, db);
      if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
      const { status: newStatus } = req.body;
      const validStatuses = ['Draft', 'In Review', 'Approved', 'Archived'];
      if (!validStatuses.includes(newStatus)) return res.status(400).json({ error: 'Invalid status' });
      await db.execute({ sql: 'UPDATE sop_documents SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', args: [newStatus, sopId] });
      if (newStatus === 'Approved') {
        await db.execute({ sql: 'UPDATE sop_documents SET last_reviewed = datetime(\'now\') WHERE id = ?', args: [sopId] });
      }
      return res.status(200).json({ message: 'Status updated' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // --- Versions ---
  if (action === 'versions') {
    if (req.method === 'GET') {
      const versions = await db.execute({
        sql: `SELECT sv.*, u.first_name || ' ' || u.last_name as uploader_name,
              sf.id as file_id, sf.file_name, sf.content_type, sf.file_size
              FROM sop_versions sv
              LEFT JOIN users u ON sv.uploaded_by = u.id
              LEFT JOIN sop_files sf ON sf.version_id = sv.id
              WHERE sv.sop_id = ? ORDER BY sv.version_number DESC`,
        args: [sopId],
      });
      return res.status(200).json({ versions: versions.rows });
    }
    if (req.method === 'POST') {
      const roleCheck = await requireRole(userId, db, ['fsqa', 'management', 'admin']);
      if (!roleCheck.allowed) return res.status(403).json({ error: 'Insufficient permissions' });
      const { change_notes, file_name, file_data, content_type } = req.body;
      // Get current version number
      const currentSop = await db.execute({ sql: 'SELECT current_version FROM sop_documents WHERE id = ?', args: [sopId] });
      if (currentSop.rows.length === 0) return res.status(404).json({ error: 'SOP not found' });
      const newVersion = ((currentSop.rows[0] as any).current_version || 0) + 1;
      // Insert version record
      const vResult = await db.execute({
        sql: 'INSERT INTO sop_versions (sop_id, version_number, change_notes, uploaded_by) VALUES (?, ?, ?, ?)',
        args: [sopId, newVersion, change_notes || null, userId],
      });
      const versionId = Number(vResult.lastInsertRowid);
      // Insert file if provided
      let fileId = null;
      if (file_name && file_data && content_type) {
        const fileSize = Math.round((file_data.length * 3) / 4); // approx base64 decode size
        const fResult = await db.execute({
          sql: 'INSERT INTO sop_files (sop_id, version_id, file_name, file_data, content_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [sopId, versionId, file_name, file_data, content_type, fileSize, userId],
        });
        fileId = Number(fResult.lastInsertRowid);
      }
      // Bump version on SOP
      await db.execute({ sql: 'UPDATE sop_documents SET current_version = ?, updated_at = datetime(\'now\') WHERE id = ?', args: [newVersion, sopId] });
      await logAuditAction(db, userId, 'create', 'sop_version', versionId, null, { sop_id: sopId, version: newVersion });
      return res.status(201).json({ version_id: versionId, file_id: fileId, version_number: newVersion });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // --- Tags ---
  if (action === 'tags') {
    if (req.method === 'POST') {
      const roleCheck = await requireRole(userId, db, ['fsqa', 'management', 'admin']);
      if (!roleCheck.allowed) return res.status(403).json({ error: 'Insufficient permissions' });
      const { tags } = req.body;
      if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags array required' });
      for (const tag of tags) {
        try {
          await db.execute({ sql: 'INSERT OR IGNORE INTO sop_tags (sop_id, tag) VALUES (?, ?)', args: [sopId, tag.toLowerCase().trim()] });
        } catch (_e) { /* ignore */ }
      }
      return res.status(200).json({ message: 'Tags added' });
    }
    if (req.method === 'DELETE') {
      const roleCheck = await requireRole(userId, db, ['fsqa', 'management', 'admin']);
      if (!roleCheck.allowed) return res.status(403).json({ error: 'Insufficient permissions' });
      // Tag is passed as query param since action slot is used by 'tags'
      const { tag } = req.query;
      if (!tag) return res.status(400).json({ error: 'tag query parameter required' });
      await db.execute({ sql: 'DELETE FROM sop_tags WHERE sop_id = ? AND tag = ?', args: [sopId, tag] });
      return res.status(200).json({ message: 'Tag removed' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // --- Audit coverage ---
  if (action === 'audit-coverage') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const sop = await db.execute({ sql: 'SELECT code FROM sop_documents WHERE id = ?', args: [sopId] });
    if (sop.rows.length === 0) return res.status(404).json({ error: 'SOP not found' });
    const sopCode = (sop.rows[0] as any).code;
    const questions = await db.execute({
      sql: `SELECT aq.id, aq.question_code, aq.question_text, aq.points, aq.is_auto_fail, aq.required_sop,
            am.code as module_code, am.name as module_name
            FROM audit_questions_v2 aq
            JOIN audit_modules am ON aq.module_id = am.id
            WHERE aq.required_sop LIKE ? ORDER BY aq.question_code`,
      args: [`%${sopCode}%`],
    });
    return res.status(200).json({ questions: questions.rows, sop_code: sopCode });
  }
  // --- GET single SOP ---
  if (req.method === 'GET') {
    const sop = await db.execute({ sql: 'SELECT * FROM sop_documents WHERE id = ?', args: [sopId] });
    if (sop.rows.length === 0) return res.status(404).json({ error: 'SOP not found' });
    const facilityStatuses = await db.execute({ sql: 'SELECT sfs.*, f.name as facility_name, f.code as facility_code FROM sop_facility_status sfs JOIN facilities f ON sfs.facility_id = f.id WHERE sfs.sop_id = ?', args: [sopId] });
    const versions = await db.execute({ sql: 'SELECT * FROM sop_versions WHERE sop_id = ? ORDER BY version_number DESC', args: [sopId] });
    const tags = await db.execute({ sql: 'SELECT tag FROM sop_tags WHERE sop_id = ?', args: [sopId] });
    return res.status(200).json({ sop: sop.rows[0], facility_statuses: facilityStatuses.rows, versions: versions.rows, tags: tags.rows.map((t: any) => t.tag) });
  }
  // --- PUT update SOP ---
  if (req.method === 'PUT') {
    const isAdmin = await requireAdmin(userId, db);
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { title, description, owner, priority, primus_ref, nop_ref } = req.body;
    await db.execute({
      sql: 'UPDATE sop_documents SET title = COALESCE(?, title), description = COALESCE(?, description), owner = COALESCE(?, owner), priority = COALESCE(?, priority), primus_ref = COALESCE(?, primus_ref), nop_ref = COALESCE(?, nop_ref), updated_at = datetime(\'now\') WHERE id = ?',
      args: [title, description, owner, priority, primus_ref, nop_ref, sopId],
    });
    return res.status(200).json({ message: 'SOP updated' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSopsByFacility(req: VercelRequest, res: VercelResponse, db: any, userId: number, facilityId: string) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const fId = Number(facilityId);
  const result = await db.execute({
    sql: 'SELECT sd.*, COALESCE(sfs.status, \'missing\') as facility_status, sfs.last_review_date, sfs.notes as status_notes FROM sop_documents sd LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ? ORDER BY sd.code',
    args: [fId],
  });
  return res.status(200).json({ sops: result.rows });
}

async function handleGapAnalysis(req: VercelRequest, res: VercelResponse, db: any, userId: number, path: string[]) {
  if (path[0] === 'summary') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const facilities = await db.execute({ sql: 'SELECT * FROM facilities WHERE is_active = 1 ORDER BY name', args: [] });
    const summary = [];
    for (const f of facilities.rows) {
      const fac = f as any;
      const total = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ?', args: [fac.id] });
      const current = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'current\'', args: [fac.id] });
      const outdated = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'outdated\'', args: [fac.id] });
      const missing = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'missing\'', args: [fac.id] });
      const na = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'not_applicable\'', args: [fac.id] });
      const totalCount = Number((total.rows[0] as any).cnt) || 0;
      const currentCount = Number((current.rows[0] as any).cnt) || 0;
      const applicable = totalCount - Number((na.rows[0] as any).cnt);
      const pct = applicable > 0 ? Math.round((currentCount / applicable) * 100) : 0;
      summary.push({ facility_id: fac.id, facility_name: fac.name, facility_code: fac.code, total: totalCount, current: currentCount, needs_update: Number((outdated.rows[0] as any).cnt), missing: Number((missing.rows[0] as any).cnt), not_applicable: Number((na.rows[0] as any).cnt), readiness_pct: pct });
    }
    return res.status(200).json({ facilities: summary });
  }
  const facilityId = Number(path[0]);
  if (path[1] === 'snapshot') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const total = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ?', args: [facilityId] });
    const current = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'current\'', args: [facilityId] });
    const outdated = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'outdated\'', args: [facilityId] });
    const missing = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'missing\'', args: [facilityId] });
    const na = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM sop_facility_status WHERE facility_id = ? AND status = \'not_applicable\'', args: [facilityId] });
    const totalCount = Number((total.rows[0] as any).cnt); const currentCount = Number((current.rows[0] as any).cnt);
    const applicable = totalCount - Number((na.rows[0] as any).cnt);
    const pct = applicable > 0 ? Math.round((currentCount / applicable) * 100) : 0;
    const snap = await db.execute({
      sql: 'INSERT INTO gap_snapshots (facility_id, snapshot_date, total_required, exists_current, needs_update, missing, not_applicable, readiness_pct, assessed_by) VALUES (?, datetime(\'now\'), ?, ?, ?, ?, ?, ?, ?)',
      args: [facilityId, totalCount, currentCount, Number((outdated.rows[0] as any).cnt), Number((missing.rows[0] as any).cnt), Number((na.rows[0] as any).cnt), pct, userId],
    });
    return res.status(201).json({ id: Number(snap.lastInsertRowid), readiness_pct: pct });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const facility = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [facilityId] });
  if (facility.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
  const sops = await db.execute({
    sql: 'SELECT sd.id, sd.code, sd.title, sd.category, sd.priority, sd.owner, COALESCE(sfs.status, \'missing\') as status, sfs.last_review_date, sfs.notes FROM sop_documents sd LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ? ORDER BY sd.code',
    args: [facilityId],
  });
  const snapshots = await db.execute({ sql: 'SELECT * FROM gap_snapshots WHERE facility_id = ? ORDER BY snapshot_date DESC LIMIT 10', args: [facilityId] });
  return res.status(200).json({ facility: facility.rows[0], sops: sops.rows, snapshots: snapshots.rows });
}

async function handleAuditModules(req: VercelRequest, res: VercelResponse, db: any, userId: number, facilityId: string) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const fId = Number(facilityId);
  const modules = await db.execute({
    sql: 'SELECT am.*, fm.is_applicable FROM audit_modules am LEFT JOIN facility_modules fm ON am.id = fm.module_id AND fm.facility_id = ? ORDER BY am.code',
    args: [fId],
  });
  const result = [];
  for (const m of modules.rows) {
    const mod = m as any;
    if (mod.is_applicable) {
      const questions = await db.execute({ sql: 'SELECT * FROM audit_questions_v2 WHERE module_id = ? ORDER BY sort_order, question_code', args: [mod.id] });
      result.push({ ...mod, questions: questions.rows });
    }
  }
  return res.status(200).json({ modules: result });
}

async function handleAuditSimulations(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string, action?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const { facility_id } = req.query;
      let sql = 'SELECT s.*, f.name as facility_name, u.first_name || \' \' || u.last_name as user_name FROM audit_simulations s JOIN facilities f ON s.facility_id = f.id JOIN users u ON s.user_id = u.id WHERE 1=1';
      const args: any[] = [];
      if (facility_id) { sql += ' AND s.facility_id = ?'; args.push(Number(facility_id)); }
      sql += ' ORDER BY s.created_at DESC LIMIT 50';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ simulations: result.rows });
    }
    if (req.method === 'POST') {
      const { facility_id } = req.body;
      if (!facility_id) return res.status(400).json({ error: 'facility_id required' });
      const totalQ = await db.execute({
        sql: 'SELECT SUM(aq.points) as total FROM audit_questions_v2 aq JOIN facility_modules fm ON aq.module_id = fm.module_id WHERE fm.facility_id = ? AND fm.is_applicable = 1',
        args: [facility_id],
      });
      const totalPts = Number((totalQ.rows[0] as any).total) || 0;
      const sim = await db.execute({
        sql: 'INSERT INTO audit_simulations (facility_id, user_id, simulation_date, status, total_points) VALUES (?, ?, datetime(\'now\'), \'in_progress\', ?)',
        args: [facility_id, userId, totalPts],
      });
      return res.status(201).json({ id: Number(sim.lastInsertRowid), total_points: totalPts });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const simId = Number(id);
  if (action === 'responses') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { responses } = req.body;
    if (!Array.isArray(responses)) return res.status(400).json({ error: 'responses array required' });
    for (const r of responses) {
      const existing = await db.execute({ sql: 'SELECT id FROM audit_responses WHERE simulation_id = ? AND question_id = ?', args: [simId, r.question_id] });
      if (existing.rows.length > 0) {
        await db.execute({ sql: 'UPDATE audit_responses SET score = ?, notes = ?, evidence_url = ? WHERE simulation_id = ? AND question_id = ?', args: [r.score, r.notes || null, r.evidence_url || null, simId, r.question_id] });
      } else {
        await db.execute({ sql: 'INSERT INTO audit_responses (simulation_id, question_id, score, notes, evidence_url) VALUES (?, ?, ?, ?, ?)', args: [simId, r.question_id, r.score, r.notes || null, r.evidence_url || null] });
      }
    }
    return res.status(200).json({ message: 'Responses saved', count: responses.length });
  }
  if (action === 'score') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const sim = await db.execute({ sql: 'SELECT * FROM audit_simulations WHERE id = ?', args: [simId] });
    if (sim.rows.length === 0) return res.status(404).json({ error: 'Simulation not found' });
    const simData = sim.rows[0] as any;
    const moduleScores = await db.execute({
      sql: 'SELECT am.code, am.name, SUM(aq.points) as max_points, SUM(ar.score) as earned_points, COUNT(ar.id) as answered, COUNT(aq.id) as total_questions FROM audit_questions_v2 aq JOIN audit_modules am ON aq.module_id = am.id JOIN facility_modules fm ON am.id = fm.module_id AND fm.facility_id = ? LEFT JOIN audit_responses ar ON aq.id = ar.question_id AND ar.simulation_id = ? WHERE fm.is_applicable = 1 GROUP BY am.id ORDER BY am.code',
      args: [simData.facility_id, simId],
    });
    const autoFails = await db.execute({
      sql: 'SELECT aq.question_code, aq.question_text FROM audit_questions_v2 aq JOIN audit_responses ar ON aq.id = ar.question_id WHERE ar.simulation_id = ? AND aq.is_auto_fail = 1 AND ar.score = 0',
      args: [simId],
    });
    const totalEarned = moduleScores.rows.reduce((sum: number, r: any) => sum + (Number(r.earned_points) || 0), 0);
    const totalMax = simData.total_points || 1;
    const pct = Math.round((totalEarned / totalMax) * 100);
    const hasAutoFail = autoFails.rows.length > 0;
    let grade = pct >= 97 ? 'A+' : pct >= 92 ? 'A' : pct >= 85 ? 'B' : pct >= 75 ? 'C' : 'D';
    if (hasAutoFail) grade = 'FAIL';
    await db.execute({ sql: 'UPDATE audit_simulations SET earned_points = ?, score_pct = ?, has_auto_fail = ?, grade = ?, status = \'completed\' WHERE id = ?', args: [totalEarned, pct, hasAutoFail ? 1 : 0, grade, simId] });
    // --- Phase 2: Auto-generate audit findings for deficient questions ---
    try {
      const deficient = await db.execute({
        sql: `SELECT ar.question_id, ar.score, ar.notes as response_notes, aq.question_code, aq.question_text, aq.points as max_points, aq.is_auto_fail, aq.required_sop, aq.responsible_role
              FROM audit_responses ar
              JOIN audit_questions_v2 aq ON ar.question_id = aq.id
              WHERE ar.simulation_id = ? AND ar.score < aq.points`,
        args: [simId],
      });
      // Only generate if findings don't already exist for this simulation
      const existingFindings = await db.execute({ sql: 'SELECT COUNT(*) as count FROM audit_findings WHERE simulation_id = ?', args: [simId] });
      if ((existingFindings.rows[0] as any).count === 0 && deficient.rows.length > 0) {
        for (const q of deficient.rows as any[]) {
          const isAF = q.is_auto_fail === 1 && q.score === 0;
          const severity = isAF ? 'critical' : q.score === 0 ? 'major' : 'minor';
          const findingType = q.score === 0 ? 'non_conformance' : 'observation';
          const desc = `${q.question_code}: ${q.question_text} — Scored ${q.score}/${q.max_points}`;
          await db.execute({
            sql: `INSERT INTO audit_findings (simulation_id, question_id, facility_id, finding_type, severity, description, evidence_notes, required_sop_code, is_auto_fail, status, created_by)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
            args: [simId, q.question_id, simData.facility_id, findingType, severity, desc, q.response_notes || null, q.required_sop || null, isAF ? 1 : 0, userId],
          });
        }
      }
    } catch (_e) { /* silently fail findings generation */ }
    return res.status(200).json({ simulation: { ...simData, earned_points: totalEarned, score_pct: pct, has_auto_fail: hasAutoFail ? 1 : 0, grade }, modules: moduleScores.rows });
  }
  if (req.method === 'GET') {
    const sim = await db.execute({ sql: 'SELECT s.*, f.name as facility_name FROM audit_simulations s JOIN facilities f ON s.facility_id = f.id WHERE s.id = ?', args: [simId] });
    if (sim.rows.length === 0) return res.status(404).json({ error: 'Simulation not found' });
    const responses = await db.execute({ sql: 'SELECT ar.*, aq.question_code, aq.question_text, aq.points as max_points, aq.is_auto_fail, am.code as module_code FROM audit_responses ar JOIN audit_questions_v2 aq ON ar.question_id = aq.id JOIN audit_modules am ON aq.module_id = am.id WHERE ar.simulation_id = ? ORDER BY aq.question_code', args: [simId] });
    return res.status(200).json({ simulation: sim.rows[0], responses: responses.rows });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// PHASE 2: AUDIT FINDINGS + CAPA SUMMARY
// ============================================================================

async function handleAuditFindings(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string, action?: string) {
  // GET /api/audit/findings/summary
  if (id === 'summary') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { facility_id } = req.query;
    let whereClause = "WHERE af.status = 'open'";
    const args: any[] = [];
    if (facility_id) { whereClause += ' AND af.facility_id = ?'; args.push(Number(facility_id)); }
    const result = await db.execute({
      sql: `SELECT af.severity, COUNT(*) as count FROM audit_findings af ${whereClause} GROUP BY af.severity`,
      args,
    });
    const totalOpen = await db.execute({ sql: `SELECT COUNT(*) as count FROM audit_findings af ${whereClause}`, args });
    const withCapa = await db.execute({
      sql: `SELECT COUNT(*) as count FROM audit_findings af WHERE af.status = 'capa_created'${facility_id ? ' AND af.facility_id = ?' : ''}`,
      args: facility_id ? [Number(facility_id)] : [],
    });
    return res.status(200).json({
      total_open: (totalOpen.rows[0] as any).count,
      with_capa: (withCapa.rows[0] as any).count,
      by_severity: result.rows,
    });
  }

  if (!id) {
    // GET /api/audit/findings?simulation_id=X&facility_id=X&status=X
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { simulation_id, facility_id, status: filterStatus } = req.query;
    let sql = `SELECT af.*, aq.question_code, aq.question_text, aq.points as max_points, aq.responsible_role,
               am.code as module_code, am.name as module_name, f.name as facility_name
               FROM audit_findings af
               JOIN audit_questions_v2 aq ON af.question_id = aq.id
               JOIN audit_modules am ON aq.module_id = am.id
               JOIN facilities f ON af.facility_id = f.id WHERE 1=1`;
    const args: any[] = [];
    if (simulation_id) { sql += ' AND af.simulation_id = ?'; args.push(Number(simulation_id)); }
    if (facility_id) { sql += ' AND af.facility_id = ?'; args.push(Number(facility_id)); }
    if (filterStatus) { sql += ' AND af.status = ?'; args.push(filterStatus); }
    sql += ' ORDER BY CASE af.severity WHEN \'critical\' THEN 1 WHEN \'major\' THEN 2 WHEN \'minor\' THEN 3 END, af.created_at DESC';
    const result = await db.execute({ sql, args });
    return res.status(200).json({ findings: result.rows });
  }

  const findingId = Number(id);

  // POST /api/audit/findings/{id}/create-capa
  if (action === 'create-capa') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const roleCheck = await requireRole(userId, db, ['fsqa', 'management', 'admin']);
    if (!roleCheck.allowed) return res.status(403).json({ error: 'Insufficient permissions' });

    const finding = await db.execute({ sql: 'SELECT af.*, aq.question_code, aq.question_text, aq.responsible_role FROM audit_findings af JOIN audit_questions_v2 aq ON af.question_id = aq.id WHERE af.id = ?', args: [findingId] });
    if (finding.rows.length === 0) return res.status(404).json({ error: 'Finding not found' });
    const f = finding.rows[0] as any;
    if (f.status !== 'open') return res.status(400).json({ error: 'Finding is not open' });

    // Create nonconformance from finding
    const ncResult = await db.execute({
      sql: 'INSERT INTO nonconformances (user_id, finding_date, finding_category, finding_description, severity, affected_area, root_cause) VALUES (?, datetime(\'now\'), ?, ?, ?, ?, ?)',
      args: [userId, f.finding_type, f.description, f.severity, `Audit Question ${f.question_code}`, 'Identified during audit simulation'],
    });
    const ncId = Number(ncResult.lastInsertRowid);

    // Calculate due date based on severity
    const dueDays = f.severity === 'critical' ? 7 : f.severity === 'major' ? 30 : 90;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create CAPA linked to finding
    const capaResult = await db.execute({
      sql: `INSERT INTO corrective_actions (user_id, nonconformance_id, action_description, responsible_party, target_completion_date, status, audit_finding_id, facility_id, priority, due_date_source)
            VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, 'auto')`,
      args: [userId, ncId, `Address finding: ${f.question_code} - ${f.question_text}`, f.responsible_role || 'FSQA Manager', dueDateStr, findingId, f.facility_id, f.severity],
    });

    // Update finding status
    await db.execute({ sql: "UPDATE audit_findings SET status = 'capa_created' WHERE id = ?", args: [findingId] });

    return res.status(201).json({ capa_id: Number(capaResult.lastInsertRowid), nonconformance_id: ncId, due_date: dueDateStr });
  }

  // PUT /api/audit/findings/{id} — Update status/resolution
  if (req.method === 'PUT') {
    const roleCheck = await requireRole(userId, db, ['fsqa', 'management', 'admin']);
    if (!roleCheck.allowed) return res.status(403).json({ error: 'Insufficient permissions' });
    const { status: newStatus, resolution_notes } = req.body;
    const validStatuses = ['open', 'capa_created', 'resolved', 'accepted_risk'];
    if (newStatus && !validStatuses.includes(newStatus)) return res.status(400).json({ error: 'Invalid status' });
    const updates: string[] = [];
    const args: any[] = [];
    if (newStatus) { updates.push('status = ?'); args.push(newStatus); }
    if (resolution_notes !== undefined) { updates.push('resolution_notes = ?'); args.push(resolution_notes); }
    if (newStatus === 'resolved' || newStatus === 'accepted_risk') {
      updates.push('resolved_by = ?', "resolved_at = datetime('now')");
      args.push(userId);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    args.push(findingId);
    await db.execute({ sql: `UPDATE audit_findings SET ${updates.join(', ')} WHERE id = ?`, args });
    return res.status(200).json({ message: 'Finding updated' });
  }

  // GET single finding
  if (req.method === 'GET') {
    const result = await db.execute({
      sql: `SELECT af.*, aq.question_code, aq.question_text, aq.points as max_points, aq.responsible_role,
            am.code as module_code, am.name as module_name, f.name as facility_name
            FROM audit_findings af
            JOIN audit_questions_v2 aq ON af.question_id = aq.id
            JOIN audit_modules am ON aq.module_id = am.id
            JOIN facilities f ON af.facility_id = f.id WHERE af.id = ?`,
      args: [findingId],
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Finding not found' });
    return res.status(200).json({ finding: result.rows[0] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCapaSummary(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const totalOpen = await db.execute({ sql: "SELECT COUNT(*) as count FROM corrective_actions WHERE status = 'open'", args: [] });
  const totalOverdue = await db.execute({
    sql: "SELECT COUNT(*) as count FROM corrective_actions WHERE status = 'open' AND target_completion_date IS NOT NULL AND target_completion_date < date('now')",
    args: [],
  });
  const byPriority = await db.execute({
    sql: "SELECT COALESCE(priority, 'medium') as priority, COUNT(*) as count FROM corrective_actions WHERE status = 'open' GROUP BY priority",
    args: [],
  });
  return res.status(200).json({
    total_open: (totalOpen.rows[0] as any).count,
    total_overdue: (totalOverdue.rows[0] as any).count,
    by_priority: byPriority.rows,
  });
}

async function handleSuppliers(req: VercelRequest, res: VercelResponse, db: any, userId: number, id?: string, action?: string) {
  if (!id) {
    if (req.method === 'GET') {
      const { type, status } = req.query;
      let sql = 'SELECT s.*, (SELECT COUNT(*) FROM supplier_certifications sc WHERE sc.supplier_id = s.id) as cert_count, (SELECT MIN(sc2.expiry_date) FROM supplier_certifications sc2 WHERE sc2.supplier_id = s.id AND sc2.expiry_date >= date(\'now\')) as next_expiry FROM suppliers s WHERE s.is_active = 1';
      const args: any[] = [];
      if (type) { sql += ' AND s.supplier_type = ?'; args.push(type); }
      if (status) { sql += ' AND s.approval_status = ?'; args.push(status); }
      sql += ' ORDER BY s.name';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ suppliers: result.rows });
    }
    if (req.method === 'POST') {
      const isAdmin = await requireAdmin(userId, db);
      if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
      const { code, name, contact_name, email, phone, address, supplier_type, notes } = req.body;
      if (!code || !name) return res.status(400).json({ error: 'code and name required' });
      const result = await db.execute({
        sql: 'INSERT INTO suppliers (code, name, contact_name, email, phone, address, supplier_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [code, name, contact_name, email, phone, address, supplier_type, notes],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Supplier created' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const supId = Number(id);
  if (action === 'certifications') {
    if (req.method === 'GET') {
      const certs = await db.execute({ sql: 'SELECT * FROM supplier_certifications WHERE supplier_id = ? ORDER BY expiry_date', args: [supId] });
      return res.status(200).json({ certifications: certs.rows });
    }
    if (req.method === 'POST') {
      const { cert_type, cert_name, issuing_body, cert_number, issue_date, expiry_date, alert_days_before } = req.body;
      if (!cert_type || !expiry_date) return res.status(400).json({ error: 'cert_type and expiry_date required' });
      const daysUntil = Math.ceil((new Date(expiry_date).getTime() - Date.now()) / 86400000);
      const status = daysUntil < 0 ? 'expired' : daysUntil <= (alert_days_before || 30) ? 'expiring_soon' : 'valid';
      const result = await db.execute({
        sql: 'INSERT INTO supplier_certifications (supplier_id, cert_type, cert_name, issuing_body, cert_number, issue_date, expiry_date, status, alert_days_before) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [supId, cert_type, cert_name, issuing_body, cert_number, issue_date, expiry_date, status, alert_days_before || 30],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid), status });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (req.method === 'GET') {
    const sup = await db.execute({ sql: 'SELECT * FROM suppliers WHERE id = ?', args: [supId] });
    if (sup.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const certs = await db.execute({ sql: 'SELECT * FROM supplier_certifications WHERE supplier_id = ? ORDER BY expiry_date', args: [supId] });
    return res.status(200).json({ supplier: sup.rows[0], certifications: certs.rows });
  }
  if (req.method === 'PUT') {
    const isAdmin = await requireAdmin(userId, db);
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { name, contact_name, email, phone, address, supplier_type, approval_status, notes } = req.body;
    await db.execute({
      sql: 'UPDATE suppliers SET name = COALESCE(?, name), contact_name = COALESCE(?, contact_name), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address), supplier_type = COALESCE(?, supplier_type), approval_status = COALESCE(?, approval_status), notes = COALESCE(?, notes), updated_at = datetime(\'now\') WHERE id = ?',
      args: [name, contact_name, email, phone, address, supplier_type, approval_status, notes, supId],
    });
    if (approval_status === 'approved') {
      await db.execute({ sql: 'UPDATE suppliers SET approved_by = ?, approval_date = datetime(\'now\') WHERE id = ?', args: [userId, supId] });
    }
    return res.status(200).json({ message: 'Supplier updated' });
  }
  if (req.method === 'DELETE') {
    const isAdmin = await requireAdmin(userId, db);
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    await db.execute({ sql: 'UPDATE suppliers SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', args: [supId] });
    return res.status(200).json({ message: 'Supplier deactivated' });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSuppliersExpiring(req: VercelRequest, res: VercelResponse, db: any, userId: number) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const days = Number(req.query.days) || 30;
  const result = await db.execute({
    sql: 'SELECT sc.*, s.name as supplier_name, s.code as supplier_code, s.contact_name, s.email as supplier_email, CAST(julianday(sc.expiry_date) - julianday(\'now\') AS INTEGER) as days_until_expiry FROM supplier_certifications sc JOIN suppliers s ON sc.supplier_id = s.id WHERE s.is_active = 1 AND sc.expiry_date <= date(\'now\', \'+\' || ? || \' days\') AND sc.expiry_date >= date(\'now\', \'-30 days\') ORDER BY sc.expiry_date',
    args: [days],
  });
  return res.status(200).json({ certifications: result.rows });
}

// ============================================================================
// NETSUITE HELPERS & HANDLERS
// ============================================================================

function generateNetSuiteOAuth(
  method: string,
  url: string,
  accountId: string,
  consumerKey: string,
  consumerSecret: string,
  tokenId: string,
  tokenSecret: string,
  queryParams?: Record<string, string>
): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: tokenId,
    oauth_version: '1.0',
  };

  // Combine OAuth params with query params for signature base string
  const allParams: Record<string, string> = { ...oauthParams, ...(queryParams || {}) };

  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');

  return `OAuth realm="${accountId}",oauth_consumer_key="${consumerKey}",oauth_token="${tokenId}",oauth_nonce="${nonce}",oauth_timestamp="${timestamp}",oauth_signature_method="HMAC-SHA256",oauth_version="1.0",oauth_signature="${encodeURIComponent(signature)}"`;
}

// ============================================================================
// VENDOR CERTIFICATIONS HANDLERS
// ============================================================================

async function handleVendorCertifications(
  req: VercelRequest,
  res: VercelResponse,
  db: any,
  userId: number,
  certId?: string
): Promise<VercelResponse | void> {
  // GET /netsuite/certifications - list all certifications
  if (req.method === 'GET' && !certId) {
    try {
      const result = await db.execute({
        sql: `SELECT id, vendor_id, vendor_name, item_type, cert_file_name, expiration_date, notification_email, notification_sent, uploaded_by, uploaded_at, updated_at
              FROM vendor_certifications
              ORDER BY vendor_name ASC, item_type ASC, expiration_date ASC`,
        args: [],
      });
      return res.status(200).json({ certifications: result.rows });
    } catch (error) {
      console.error('Failed to fetch certifications:', error);
      return res.status(500).json({ error: 'Failed to fetch certifications' });
    }
  }

  // GET /netsuite/certifications/:id/download - download cert file
  if (req.method === 'GET' && certId && certId.includes('download')) {
    const realCertId = certId.split('/')[0];
    try {
      const result = await db.execute({
        sql: `SELECT cert_file_name, cert_file_data, cert_content_type FROM vendor_certifications WHERE id = ?`,
        args: [Number(realCertId)],
      });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }
      const cert = result.rows[0] as any;
      const buffer = Buffer.from(cert.cert_file_data, 'base64');
      res.setHeader('Content-Type', cert.cert_content_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.cert_file_name}"`);
      return res.status(200).send(buffer);
    } catch (error) {
      console.error('Failed to download certification:', error);
      return res.status(500).json({ error: 'Failed to download certification' });
    }
  }

  // POST /netsuite/certifications - upload new certification
  if (req.method === 'POST' && !certId) {
    try {
      const { vendor_id, vendor_name, item_type, cert_file_name, cert_file_data, cert_content_type, expiration_date, notification_email } = req.body;

      if (!vendor_id || !vendor_name || !cert_file_name || !cert_file_data || !cert_content_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate file size (max 5MB base64)
      if (cert_file_data.length > 6_666_667) { // 5MB in base64
        return res.status(400).json({ error: 'File too large (max 5MB)' });
      }

      const user = await db.execute({
        sql: `SELECT first_name, last_name FROM users WHERE id = ?`,
        args: [userId],
      });
      const uploadedBy = user.rows.length > 0 ? `${(user.rows[0] as any).first_name} ${(user.rows[0] as any).last_name}` : 'Unknown';

      const result = await db.execute({
        sql: `INSERT INTO vendor_certifications
              (vendor_id, vendor_name, item_type, cert_file_name, cert_file_data, cert_content_type, expiration_date, notification_email, uploaded_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [vendor_id, vendor_name, item_type || '', cert_file_name, cert_file_data, cert_content_type, expiration_date || null, notification_email || null, uploadedBy],
      });

      return res.status(201).json({
        id: result.lastInsertRowid,
        vendor_id,
        vendor_name,
        cert_file_name,
      });
    } catch (error) {
      console.error('Failed to upload certification:', error);
      return res.status(500).json({ error: 'Failed to upload certification' });
    }
  }

  // PUT /netsuite/certifications/:id - update certification
  if (req.method === 'PUT' && certId) {
    try {
      const { expiration_date, notification_email, cert_file_name, cert_file_data, cert_content_type } = req.body;

      const existing = await db.execute({
        sql: `SELECT * FROM vendor_certifications WHERE id = ?`,
        args: [Number(certId)],
      });

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Certification not found' });
      }

      const currentData = existing.rows[0] as any;
      const updates: string[] = [];
      const args: any[] = [];

      if (expiration_date !== undefined) {
        updates.push('expiration_date = ?');
        args.push(expiration_date);
      }
      if (notification_email !== undefined) {
        updates.push('notification_email = ?');
        args.push(notification_email);
      }
      if (cert_file_name !== undefined && cert_file_data !== undefined && cert_content_type !== undefined) {
        // Validate file size
        if (cert_file_data.length > 6_666_667) {
          return res.status(400).json({ error: 'File too large (max 5MB)' });
        }
        updates.push('cert_file_name = ?, cert_file_data = ?, cert_content_type = ?');
        args.push(cert_file_name, cert_file_data, cert_content_type);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = datetime(\'now\')');
      args.push(Number(certId));

      await db.execute({
        sql: `UPDATE vendor_certifications SET ${updates.join(', ')} WHERE id = ?`,
        args,
      });

      return res.status(200).json({ id: certId, updated: true });
    } catch (error) {
      console.error('Failed to update certification:', error);
      return res.status(500).json({ error: 'Failed to update certification' });
    }
  }

  // DELETE /netsuite/certifications/:id - delete certification
  if (req.method === 'DELETE' && certId) {
    try {
      await db.execute({
        sql: `DELETE FROM vendor_certifications WHERE id = ?`,
        args: [Number(certId)],
      });
      return res.status(200).json({ deleted: true });
    } catch (error) {
      console.error('Failed to delete certification:', error);
      return res.status(500).json({ error: 'Failed to delete certification' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== PRIMUS AUDIT CHECKLIST ====================
async function handlePrimusChecklist(req: VercelRequest, res: VercelResponse, db: any, userId: number, subPath?: string, subPath2?: string): Promise<VercelResponse | void> {
  // GET /primus-checklist - get all checklist items grouped by module
  if (!subPath && req.method === 'GET') {
    try {
      const items = await db.execute({ sql: 'SELECT * FROM primus_checklist_items ORDER BY sort_order', args: [] });
      const docs = await db.execute({ sql: 'SELECT id, item_id, file_name, content_type, file_size, uploaded_by, uploaded_at, notes FROM primus_documents ORDER BY uploaded_at DESC', args: [] });

      // Group items by module
      const modules: any = {};
      for (const item of items.rows as any[]) {
        const key = item.module_number;
        if (!modules[key]) {
          modules[key] = {
            module_number: item.module_number,
            module_name: item.module_name,
            module_color: item.module_color,
            sections: {},
            total: 0,
            completed: 0,
          };
        }
        const secKey = item.section_number;
        if (!modules[key].sections[secKey]) {
          modules[key].sections[secKey] = {
            section_number: item.section_number,
            section_name: item.section_name,
            items: [],
          };
        }
        // Attach documents to item
        const itemDocs = (docs.rows as any[]).filter((d: any) => d.item_id === item.id);
        modules[key].sections[secKey].items.push({ ...item, documents: itemDocs });
        modules[key].total++;
        if (item.has_document || itemDocs.length > 0) modules[key].completed++;
      }

      // Convert to array
      const result = Object.values(modules).map((m: any) => ({
        ...m,
        sections: Object.values(m.sections),
      }));

      return res.status(200).json({ modules: result, totalItems: items.rows.length });
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
      return res.status(500).json({ error: 'Failed to fetch checklist' });
    }
  }

  // POST /primus-checklist/upload - upload document for a checklist item
  if (subPath === 'upload' && req.method === 'POST') {
    try {
      const { item_id, file_name, file_data, content_type, file_size, notes } = req.body;
      if (!item_id || !file_name || !file_data || !content_type) {
        return res.status(400).json({ error: 'item_id, file_name, file_data, and content_type are required' });
      }
      const result = await db.execute({
        sql: `INSERT INTO primus_documents (item_id, file_name, file_data, content_type, file_size, uploaded_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [item_id, file_name, file_data, content_type, file_size || 0, String(userId), notes || ''],
      });
      // Update has_document flag on the checklist item
      await db.execute({ sql: 'UPDATE primus_checklist_items SET has_document = 1 WHERE id = ?', args: [item_id] });
      return res.status(201).json({ id: Number((result as any).lastInsertRowid), message: 'Document uploaded' });
    } catch (error) {
      console.error('Failed to upload document:', error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  // GET /primus-checklist/download/:id - download a document
  if (subPath === 'download' && subPath2 && req.method === 'GET') {
    try {
      const doc = await db.execute({ sql: 'SELECT * FROM primus_documents WHERE id = ?', args: [Number(subPath2)] });
      if (!doc.rows.length) return res.status(404).json({ error: 'Document not found' });
      const d = doc.rows[0] as any;
      return res.status(200).json({ file_name: d.file_name, file_data: d.file_data, content_type: d.content_type });
    } catch (error) {
      console.error('Failed to download document:', error);
      return res.status(500).json({ error: 'Failed to download document' });
    }
  }

  // DELETE /primus-checklist/doc/:id - delete a document
  if (subPath === 'doc' && subPath2 && req.method === 'DELETE') {
    try {
      const docId = Number(subPath2);
      // Get item_id before delete
      const doc = await db.execute({ sql: 'SELECT item_id FROM primus_documents WHERE id = ?', args: [docId] });
      await db.execute({ sql: 'DELETE FROM primus_documents WHERE id = ?', args: [docId] });
      // Check if item still has any documents
      if (doc.rows.length) {
        const itemId = (doc.rows[0] as any).item_id;
        const remaining = await db.execute({ sql: 'SELECT COUNT(*) as count FROM primus_documents WHERE item_id = ?', args: [itemId] });
        if ((remaining.rows[0] as any).count === 0) {
          await db.execute({ sql: 'UPDATE primus_checklist_items SET has_document = 0 WHERE id = ?', args: [itemId] });
        }
      }
      return res.status(200).json({ deleted: true });
    } catch (error) {
      console.error('Failed to delete document:', error);
      return res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  // PUT /primus-checklist/toggle/:id - toggle has_document flag (for manual check/uncheck)
  if (subPath === 'toggle' && subPath2 && req.method === 'PUT') {
    try {
      const itemId = Number(subPath2);
      const item = await db.execute({ sql: 'SELECT has_document FROM primus_checklist_items WHERE id = ?', args: [itemId] });
      if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
      const newVal = (item.rows[0] as any).has_document ? 0 : 1;
      await db.execute({ sql: 'UPDATE primus_checklist_items SET has_document = ? WHERE id = ?', args: [newVal, itemId] });
      return res.status(200).json({ id: itemId, has_document: newVal });
    } catch (error) {
      console.error('Failed to toggle item:', error);
      return res.status(500).json({ error: 'Failed to toggle item' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleNetSuiteSupplyMaster(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    return res.status(500).json({ error: 'NetSuite credentials not configured' });
  }

  try {
    // SuiteQL query matching the saved search customsearch_supply_master_fsqa
    // Gets Item Receipts grouped by vendor with type and last transaction date
    const baseUrl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;

    const query = `
      SELECT
        BUILTIN.DF(Transaction.entity) AS vendor,
        MAX(Transaction.trandate) AS last_transaction,
        Transaction.entity AS vendor_id
      FROM Transaction
      INNER JOIN TransactionLine ON TransactionLine.transaction = Transaction.id
      WHERE Transaction.type = 'ItemRcpt'
        AND TransactionLine.mainline = 'F'
        AND TransactionLine.taxline = 'F'
        AND TransactionLine.quantity > 0
        AND Transaction.trandate >= ADD_MONTHS(TRUNC(SYSDATE, 'YEAR'), 0)
      GROUP BY Transaction.entity, BUILTIN.DF(Transaction.entity)
      ORDER BY BUILTIN.DF(Transaction.entity) ASC, MAX(Transaction.trandate) DESC
    `;

    const queryParams: Record<string, string> = { limit: '200', offset: '0' };
    const authHeader = generateNetSuiteOAuth('POST', baseUrl, accountId, consumerKey, consumerSecret, tokenId, tokenSecret, queryParams);

    const urlWithParams = new URL(baseUrl);
    urlWithParams.searchParams.append('limit', '200');
    urlWithParams.searchParams.append('offset', '0');

    const response = await fetch(urlWithParams.toString(), {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NetSuite SuiteQL error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'NetSuite API error',
        status: response.status,
        details: errorText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('NetSuite request failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch from NetSuite',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// COMPLIANCE SCORING ENGINE
// ============================================================================

interface ComplianceScoreResult {
  overall_score: number;
  overall_grade: string;
  module_scores: Array<{
    module_code: string;
    module_name: string;
    score: number;
    status: string;
    requirements_met: number;
    requirements_total: number;
  }>;
  sop_readiness_pct: number;
  checklist_submissions_pct: number;
  audit_coverage_pct: number;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
}

// ============================================================================
// COMPLIANCE RULES ENGINE
// ============================================================================

async function evaluateComplianceRules(db: any, facilityId: number, assessmentId?: number): Promise<{
  results: any[];
  summary: { passed: number; failed: number; warnings: number; total: number };
  risk_level: string;
  risk_score: number;
}> {
  // Get all active rules
  const rulesResult = await db.execute({
    sql: 'SELECT * FROM compliance_rules WHERE is_active = 1',
    args: [],
  });
  const rules = (rulesResult.rows as any[]) || [];

  const results: any[] = [];
  let passed = 0, failed = 0, warnings = 0;

  for (const rule of rules) {
    const condition = JSON.parse(rule.condition_json || '{}');
    let status = 'not_applicable';
    let details: any = {};

    try {
      switch (rule.rule_type) {
        case 'evidence_check': {
          if (rule.entity_type === 'sop') {
            const sopQuery = condition.sop_code
              ? `SELECT sd.id, sd.sop_code, sfs.status FROM sop_documents sd LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ? WHERE sd.sop_code = ?`
              : `SELECT sd.id, sd.sop_code, sfs.status FROM sop_documents sd LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ?`;
            const sopArgs = condition.sop_code ? [facilityId, condition.sop_code] : [facilityId];
            const sopResult = await db.execute({ sql: sopQuery, args: sopArgs });
            const sops = (sopResult.rows as any[]) || [];
            const nonCurrent = sops.filter((s: any) => s.status !== 'current');
            status = nonCurrent.length === 0 && sops.length > 0 ? 'pass' : sops.length === 0 ? 'not_applicable' : 'fail';
            details = { total: sops.length, non_current: nonCurrent.length, items: nonCurrent.slice(0, 5).map((s: any) => s.sop_code) };
          } else if (rule.entity_type === 'audit_response') {
            if (condition.is_auto_fail) {
              // Check for auto-fail questions with score 0
              const afResult = await db.execute({
                sql: `SELECT ar.score, aq.question_code, aq.question_text
                      FROM audit_responses ar
                      JOIN audit_questions_v2 aq ON ar.question_id = aq.id
                      JOIN audit_simulations asim ON ar.simulation_id = asim.id
                      WHERE asim.facility_id = ? AND aq.is_auto_fail = 1 AND ar.score = 0
                      ORDER BY ar.id DESC LIMIT 20`,
                args: [facilityId],
              });
              const failures = (afResult.rows as any[]) || [];
              status = failures.length === 0 ? 'pass' : 'fail';
              details = { auto_fail_zeros: failures.length, items: failures.slice(0, 5).map((f: any) => f.question_code) };
            }
          }
          break;
        }
        case 'threshold': {
          if (rule.entity_type === 'audit_response') {
            // Check latest simulation scores per module
            const scoreResult = await db.execute({
              sql: `SELECT am.code as module_code, am.name as module_name,
                    ROUND(SUM(ar.score) * 100.0 / NULLIF(SUM(aq.points), 0), 2) as score_pct
                    FROM audit_simulations asim
                    JOIN audit_responses ar ON asim.id = ar.simulation_id
                    JOIN audit_questions_v2 aq ON ar.question_id = aq.id
                    JOIN audit_modules am ON aq.module_id = am.id
                    WHERE asim.facility_id = ? AND asim.id = (SELECT MAX(id) FROM audit_simulations WHERE facility_id = ?)
                    GROUP BY am.id`,
              args: [facilityId, facilityId],
            });
            const modules = (scoreResult.rows as any[]) || [];
            const failing = modules.filter((m: any) => (m.score_pct || 0) < (condition.value || 70));
            status = failing.length === 0 && modules.length > 0 ? 'pass' : modules.length === 0 ? 'not_applicable' : 'fail';
            details = { modules_checked: modules.length, modules_failing: failing.length, failing_modules: failing.map((m: any) => ({ code: m.module_code, score: m.score_pct })) };
          }
          break;
        }
        case 'frequency': {
          if (rule.entity_type === 'checklist') {
            const days = condition.value || 90;
            const checkResult = await db.execute({
              sql: `SELECT ct.id, ct.name, MAX(cs.submission_date) as last_submission
                    FROM checklist_templates ct
                    LEFT JOIN checklist_submissions cs ON ct.id = cs.template_id AND cs.facility_id = ?
                    GROUP BY ct.id
                    HAVING last_submission IS NULL OR last_submission < date('now', '-' || ? || ' days')`,
              args: [facilityId, days],
            });
            const overdue = (checkResult.rows as any[]) || [];
            status = overdue.length === 0 ? 'pass' : 'fail';
            details = { overdue_count: overdue.length, items: overdue.slice(0, 5).map((c: any) => c.name) };
          }
          break;
        }
        case 'expiration': {
          if (rule.entity_type === 'sop') {
            const days = condition.value || 365;
            const expResult = await db.execute({
              sql: `SELECT sd.sop_code, sd.title, sfs.last_reviewed
                    FROM sop_documents sd
                    LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ?
                    WHERE sfs.last_reviewed IS NULL OR sfs.last_reviewed < date('now', '-' || ? || ' days')`,
              args: [facilityId, days],
            });
            const expired = (expResult.rows as any[]) || [];
            status = expired.length === 0 ? 'pass' : expired.length <= 2 ? 'warning' : 'fail';
            details = { overdue_count: expired.length, items: expired.slice(0, 5).map((s: any) => s.sop_code) };
          } else if (rule.entity_type === 'capa') {
            const capaResult = await db.execute({
              sql: `SELECT ca.id, ca.action_description, ca.target_completion_date, n.severity
                    FROM corrective_actions ca
                    JOIN nonconformances n ON ca.nonconformance_id = n.id
                    WHERE ca.status IN ('open', 'in_progress')
                    AND ca.target_completion_date < date('now')`,
              args: [],
            });
            const overdue = (capaResult.rows as any[]) || [];
            status = overdue.length === 0 ? 'pass' : 'fail';
            details = { overdue_capas: overdue.length, items: overdue.slice(0, 5).map((c: any) => ({ id: c.id, due: c.target_completion_date })) };
          } else if (rule.entity_type === 'certification') {
            const certResult = await db.execute({
              sql: `SELECT sc.cert_name, sc.expiry_date, s.name as supplier_name
                    FROM supplier_certifications sc
                    JOIN suppliers s ON sc.supplier_id = s.id
                    WHERE s.is_active = 1 AND sc.expiry_date < date('now')`,
              args: [],
            });
            const expired = (certResult.rows as any[]) || [];
            status = expired.length === 0 ? 'pass' : 'fail';
            details = { expired_certs: expired.length, items: expired.slice(0, 5).map((c: any) => ({ cert: c.cert_name, supplier: c.supplier_name })) };
          }
          break;
        }
      }
    } catch (err) {
      status = 'warning';
      details = { error: 'Rule evaluation failed' };
    }

    // Save result
    if (assessmentId) {
      await db.execute({
        sql: `INSERT INTO compliance_rule_results (rule_id, facility_id, assessment_id, status, details) VALUES (?, ?, ?, ?, ?)`,
        args: [rule.id, facilityId, assessmentId, status, JSON.stringify(details)],
      });
    }

    if (status === 'pass') passed++;
    else if (status === 'fail') failed++;
    else if (status === 'warning') warnings++;

    results.push({
      rule_id: rule.id,
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      severity: rule.severity,
      module_code: rule.module_code,
      status,
      details,
    });
  }

  const total = passed + failed + warnings;

  // Calculate risk score (0-100, higher = more risk)
  const riskScore = total > 0 ? Math.round(((failed * 3 + warnings) / (total * 3)) * 100) : 0;
  const riskLevel = riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';

  return { results, summary: { passed, failed, warnings, total }, risk_level: riskLevel, risk_score: riskScore };
}

async function calculateRiskScores(db: any, facilityId: number): Promise<any[]> {
  // Get modules for facility
  const modulesResult = await db.execute({
    sql: `SELECT am.id, am.code, am.name FROM facility_modules fm JOIN audit_modules am ON fm.module_id = am.id WHERE fm.facility_id = ? AND fm.is_applicable = 1`,
    args: [facilityId],
  });
  const modules = (modulesResult.rows as any[]) || [];
  const risks: any[] = [];

  for (const mod of modules) {
    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskPoints = 0;

    // Factor 1: SOP readiness for this module
    const sopResult = await db.execute({
      sql: `SELECT COUNT(*) as total, SUM(CASE WHEN sfs.status = 'current' THEN 1 ELSE 0 END) as current_count
            FROM fsms_requirements fr
            JOIN requirement_evidence_links rel ON fr.id = rel.requirement_id
            JOIN sop_facility_status sfs ON rel.evidence_id = sfs.sop_id AND sfs.facility_id = ?
            WHERE fr.module_id = ? AND rel.evidence_type = 'sop'`,
      args: [facilityId, mod.id],
    });
    const sopData = (sopResult.rows[0] as any) || {};
    if (sopData.total > 0 && sopData.current_count < sopData.total) {
      const pct = Math.round((sopData.current_count / sopData.total) * 100);
      riskPoints += (100 - pct) * 0.3;
      factors.push(`SOP readiness at ${pct}% (${sopData.current_count}/${sopData.total})`);
      recommendations.push('Review and update non-current SOPs for this module');
    }

    // Factor 2: Recent audit score
    const auditResult = await db.execute({
      sql: `SELECT ROUND(SUM(ar.score) * 100.0 / NULLIF(SUM(aq.points), 0), 2) as score_pct
            FROM audit_simulations asim
            JOIN audit_responses ar ON asim.id = ar.simulation_id
            JOIN audit_questions_v2 aq ON ar.question_id = aq.id
            WHERE asim.facility_id = ? AND aq.module_id = ?
            AND asim.id = (SELECT MAX(id) FROM audit_simulations WHERE facility_id = ?)`,
      args: [facilityId, mod.id, facilityId],
    });
    const auditData = (auditResult.rows[0] as any) || {};
    const scorePct = auditData.score_pct || 0;
    if (scorePct < 70) {
      riskPoints += (70 - scorePct) * 0.5;
      factors.push(`Audit score below threshold at ${scorePct}%`);
      recommendations.push('Focus training and review on low-scoring audit areas');
    } else if (scorePct === 0) {
      riskPoints += 20;
      factors.push('No audit data available');
      recommendations.push('Complete an audit simulation for this module');
    }

    // Factor 3: Open findings
    const findingsResult = await db.execute({
      sql: `SELECT COUNT(*) as count,
            SUM(CASE WHEN af.severity = 'critical' THEN 1 ELSE 0 END) as critical_count
            FROM audit_findings af
            JOIN audit_questions_v2 aq ON af.question_id = aq.id
            WHERE af.facility_id = ? AND aq.module_id = ? AND af.status = 'open'`,
      args: [facilityId, mod.id],
    });
    const findingsData = (findingsResult.rows[0] as any) || {};
    if ((findingsData.count || 0) > 0) {
      riskPoints += (findingsData.critical_count || 0) * 15 + ((findingsData.count || 0) - (findingsData.critical_count || 0)) * 5;
      factors.push(`${findingsData.count} open finding(s), ${findingsData.critical_count || 0} critical`);
      recommendations.push('Address open audit findings, prioritizing critical items');
    }

    // Factor 4: Overdue CAPAs related to this module (approximate via nonconformance category)
    const capaResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM corrective_actions ca
            JOIN nonconformances n ON ca.nonconformance_id = n.id
            WHERE ca.status IN ('open', 'in_progress') AND ca.target_completion_date < date('now')`,
      args: [],
    });
    const capaData = (capaResult.rows[0] as any) || {};
    if ((capaData.count || 0) > 0) {
      riskPoints += (capaData.count || 0) * 8;
      factors.push(`${capaData.count} overdue CAPA(s)`);
      recommendations.push('Resolve overdue corrective actions');
    }

    // Normalize risk score 0-100
    const riskScore = Math.min(100, Math.round(riskPoints));
    const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

    // Save to risk_scores
    await db.execute({
      sql: `INSERT INTO risk_scores (facility_id, module_code, risk_level, risk_score, contributing_factors, recommendations, calculated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [facilityId, mod.code, riskLevel, riskScore, JSON.stringify(factors), JSON.stringify(recommendations)],
    });

    risks.push({
      module_code: mod.code,
      module_name: mod.name,
      risk_level: riskLevel,
      risk_score: riskScore,
      contributing_factors: factors,
      recommendations: recommendations,
    });
  }

  return risks;
}

async function calculateComplianceScore(db: any, facilityId: number, simulationId?: number): Promise<ComplianceScoreResult> {
  // Get applicable modules for facility
  const modulesResult = await db.execute({
    sql: `SELECT DISTINCT am.id, am.code, am.name, am.total_points
          FROM facility_modules fm
          JOIN audit_modules am ON fm.module_id = am.id
          WHERE fm.facility_id = ?`,
    args: [facilityId],
  });

  const modules = (modulesResult.rows as any[]) || [];
  const moduleScores: any[] = [];
  let totalWeightedScore = 0;
  let totalWeightedMax = 0;
  let criticalFindings = 0;
  let majorFindings = 0;
  let minorFindings = 0;

  for (const module of modules) {
    // Get requirements for this module
    const reqResult = await db.execute({
      sql: `SELECT id, requirement_code, requirement_text, criticality FROM fsms_requirements WHERE module_id = ?`,
      args: [module.id],
    });

    const requirements = (reqResult.rows as any[]) || [];
    let moduleEarned = 0;
    let moduleMax = 0;
    let requirementsMet = 0;

    for (const req of requirements) {
      // Get criticality weight
      const criticality = req.criticality || 'minor';
      const weight = criticality === 'critical' ? 3 : criticality === 'major' ? 2 : 1;

      // Count finding severity
      if (criticality === 'critical') criticalFindings++;
      else if (criticality === 'major') majorFindings++;
      else minorFindings++;

      moduleMax += weight;

      // Get evidence links for this requirement
      const evidenceResult = await db.execute({
        sql: `SELECT evidence_type, evidence_id, evidence_code FROM requirement_evidence_links WHERE requirement_id = ?`,
        args: [req.id],
      });

      const evidenceLinks = (evidenceResult.rows as any[]) || [];
      let evidenceSatisfied = false;

      for (const ev of evidenceLinks) {
        if (ev.evidence_type === 'audit_question' && simulationId) {
          // Check audit response score
          const scoreResult = await db.execute({
            sql: `SELECT ar.score, aq.points as max_points FROM audit_responses ar
                  JOIN audit_questions_v2 aq ON ar.question_id = aq.id
                  WHERE ar.question_id = ? AND ar.simulation_id = ?`,
            args: [ev.evidence_id, simulationId],
          });
          if (scoreResult.rows && scoreResult.rows.length > 0) {
            const row = (scoreResult.rows[0] as any);
            const pct = row.max_points > 0 ? (row.score / row.max_points) * 100 : 0;
            if (pct >= 70) {
              evidenceSatisfied = true;
              break;
            }
          }
        } else if (ev.evidence_type === 'sop') {
          // Check SOP status
          const sopResult = await db.execute({
            sql: `SELECT status FROM sop_facility_status WHERE sop_id = ? AND facility_id = ?`,
            args: [ev.evidence_id, facilityId],
          });
          if (sopResult.rows && sopResult.rows.length > 0) {
            const row = (sopResult.rows[0] as any);
            if (row.status === 'current') {
              evidenceSatisfied = true;
              break;
            }
          }
        } else if (ev.evidence_type === 'checklist') {
          // Check recent checklist submission (within 90 days)
          const checklistResult = await db.execute({
            sql: `SELECT submission_date FROM checklist_submissions
                  WHERE template_id = ? AND facility_id = ?
                  AND submission_date >= date('now', '-90 days')
                  ORDER BY submission_date DESC LIMIT 1`,
            args: [ev.evidence_id, facilityId],
          });
          if (checklistResult.rows && checklistResult.rows.length > 0) {
            evidenceSatisfied = true;
            break;
          }
        }
      }

      if (evidenceSatisfied) {
        moduleEarned += weight;
        requirementsMet++;
      }
    }

    // Calculate module score
    const moduleScore = moduleMax > 0 ? (moduleEarned / moduleMax) * 100 : 0;
    const moduleStatus = moduleScore >= 70 ? 'PASS' : 'FAIL';

    moduleScores.push({
      module_code: module.code,
      module_name: module.name,
      score: Math.round(moduleScore * 100) / 100,
      status: moduleStatus,
      requirements_met: requirementsMet,
      requirements_total: requirements.length,
    });

    totalWeightedScore += moduleEarned;
    totalWeightedMax += moduleMax;
  }

  // Calculate overall score
  const overallScore = totalWeightedMax > 0 ? (totalWeightedScore / totalWeightedMax) * 100 : 0;

  // Determine grade
  let overallGrade = 'FAIL';
  if (moduleScores.length > 0 && !moduleScores.some(m => m.status === 'FAIL')) {
    if (overallScore >= 97) overallGrade = 'A+';
    else if (overallScore >= 92) overallGrade = 'A';
    else if (overallScore >= 85) overallGrade = 'B';
    else if (overallScore >= 75) overallGrade = 'C';
    else if (overallScore >= 60) overallGrade = 'D';
  }

  // Calculate readiness percentages
  const sopResult = await db.execute({
    sql: `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'current' THEN 1 ELSE 0 END) as current
          FROM sop_facility_status WHERE facility_id = ?`,
    args: [facilityId],
  });
  const sopData = (sopResult.rows[0] as any);
  const sopReadinessPct = sopData.total > 0 ? (sopData.current / sopData.total) * 100 : 0;

  const checklistResult = await db.execute({
    sql: `SELECT COUNT(DISTINCT ct.id) as total FROM checklist_templates ct`,
    args: [],
  });
  const checklistCount = ((checklistResult.rows[0] as any)?.total || 0);
  const checklistSubmissionResult = await db.execute({
    sql: `SELECT COUNT(DISTINCT template_id) as submitted FROM checklist_submissions
          WHERE facility_id = ? AND submission_date >= date('now', '-90 days')`,
    args: [facilityId],
  });
  const checklistSubmitted = ((checklistSubmissionResult.rows[0] as any)?.submitted || 0);
  const checklistSubmissionsPct = checklistCount > 0 ? (checklistSubmitted / checklistCount) * 100 : 0;

  const auditCoveragePct = modules.length > 0 ? (moduleScores.filter(m => m.status === 'PASS').length / modules.length) * 100 : 0;

  return {
    overall_score: Math.round(overallScore * 100) / 100,
    overall_grade: overallGrade,
    module_scores: moduleScores,
    sop_readiness_pct: Math.round(sopReadinessPct * 100) / 100,
    checklist_submissions_pct: Math.round(checklistSubmissionsPct * 100) / 100,
    audit_coverage_pct: Math.round(auditCoveragePct * 100) / 100,
    critical_findings: criticalFindings,
    major_findings: majorFindings,
    minor_findings: minorFindings,
  };
}

// ============================================================================
// TRAINING & CERTIFICATION MODULE
// ============================================================================

async function handleTraining(req: VercelRequest, res: VercelResponse, db: any, userId: number, path: string[]) {
  try {
    // GET /training/records — List all training records (with filters)
    if (path[0] === 'records' && !path[1] && req.method === 'GET') {
      const facilityId = req.query?.facility_id ? parseInt(req.query.facility_id as string, 10) : null;
      const userIdFilter = req.query?.user_id ? parseInt(req.query.user_id as string, 10) : null;
      const status = req.query?.status as string;

      let sql = `SELECT tr.*, u.first_name, u.last_name, u.email, f.name as facility_name
                 FROM training_records tr
                 JOIN users u ON tr.user_id = u.id
                 LEFT JOIN facilities f ON tr.facility_id = f.id
                 WHERE 1=1`;
      const args: any[] = [];

      if (facilityId) { sql += ' AND tr.facility_id = ?'; args.push(facilityId); }
      if (userIdFilter) { sql += ' AND tr.user_id = ?'; args.push(userIdFilter); }
      if (status) { sql += ' AND tr.status = ?'; args.push(status); }

      sql += ' ORDER BY tr.training_date DESC LIMIT 200';

      const result = await db.execute({ sql, args });
      return res.status(200).json({ records: (result.rows as any[]) || [] });
    }

    // POST /training/records — Create training record
    if (path[0] === 'records' && !path[1] && req.method === 'POST') {
      const { allowed } = await requireRole(userId, db, ['supervisor', 'fsqa', 'management', 'admin']);
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const result = await db.execute({
        sql: `INSERT INTO training_records (user_id, facility_id, training_type, training_title, description, trainer_name, training_date, expiry_date, hours, score, status, module_code, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [body.user_id, body.facility_id || null, body.training_type, body.training_title, body.description || null, body.trainer_name || null, body.training_date, body.expiry_date || null, body.hours || 0, body.score || null, body.status || 'completed', body.module_code || null, body.notes || null, userId],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Training record created' });
    }

    // PUT /training/records/{id} — Update training record
    if (path[0] === 'records' && path[1] && req.method === 'PUT') {
      const { allowed } = await requireRole(userId, db, ['supervisor', 'fsqa', 'management', 'admin']);
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

      const recordId = parseInt(path[1], 10);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await db.execute({
        sql: `UPDATE training_records SET training_type = ?, training_title = ?, description = ?, trainer_name = ?, training_date = ?, expiry_date = ?, hours = ?, score = ?, status = ?, module_code = ?, notes = ? WHERE id = ?`,
        args: [body.training_type, body.training_title, body.description || null, body.trainer_name || null, body.training_date, body.expiry_date || null, body.hours || 0, body.score || null, body.status || 'completed', body.module_code || null, body.notes || null, recordId],
      });
      return res.status(200).json({ message: 'Training record updated' });
    }

    // DELETE /training/records/{id}
    if (path[0] === 'records' && path[1] && req.method === 'DELETE') {
      const { allowed } = await requireRole(userId, db, ['admin']);
      if (!allowed) return res.status(403).json({ error: 'Admin only' });

      const recordId = parseInt(path[1], 10);
      await db.execute({ sql: 'DELETE FROM training_records WHERE id = ?', args: [recordId] });
      return res.status(200).json({ message: 'Training record deleted' });
    }

    // GET /training/requirements — List training requirements
    if (path[0] === 'requirements' && req.method === 'GET') {
      const result = await db.execute({ sql: 'SELECT * FROM training_requirements ORDER BY title', args: [] });
      return res.status(200).json({ requirements: (result.rows as any[]) || [] });
    }

    // GET /training/certifications — List worker certifications
    if (path[0] === 'certifications' && !path[1] && req.method === 'GET') {
      const userIdFilter = req.query?.user_id ? parseInt(req.query.user_id as string, 10) : null;
      let sql = `SELECT wc.*, u.first_name, u.last_name, u.email FROM worker_certifications wc JOIN users u ON wc.user_id = u.id WHERE 1=1`;
      const args: any[] = [];
      if (userIdFilter) { sql += ' AND wc.user_id = ?'; args.push(userIdFilter); }
      sql += ' ORDER BY wc.expiry_date ASC';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ certifications: (result.rows as any[]) || [] });
    }

    // POST /training/certifications — Add certification
    if (path[0] === 'certifications' && !path[1] && req.method === 'POST') {
      const { allowed } = await requireRole(userId, db, ['supervisor', 'fsqa', 'management', 'admin']);
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const result = await db.execute({
        sql: `INSERT INTO worker_certifications (user_id, cert_type, cert_name, issuing_body, cert_number, issue_date, expiry_date, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [body.user_id, body.cert_type, body.cert_name, body.issuing_body || null, body.cert_number || null, body.issue_date, body.expiry_date || null, body.status || 'active', body.notes || null],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Certification added' });
    }

    // PUT /training/certifications/{id}
    if (path[0] === 'certifications' && path[1] && req.method === 'PUT') {
      const { allowed } = await requireRole(userId, db, ['supervisor', 'fsqa', 'management', 'admin']);
      if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });

      const certId = parseInt(path[1], 10);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await db.execute({
        sql: `UPDATE worker_certifications SET cert_type = ?, cert_name = ?, issuing_body = ?, cert_number = ?, issue_date = ?, expiry_date = ?, status = ?, notes = ? WHERE id = ?`,
        args: [body.cert_type, body.cert_name, body.issuing_body || null, body.cert_number || null, body.issue_date, body.expiry_date || null, body.status || 'active', body.notes || null, certId],
      });
      return res.status(200).json({ message: 'Certification updated' });
    }

    // GET /training/dashboard — Training compliance dashboard data
    if (path[0] === 'dashboard' && req.method === 'GET') {
      const facilityId = req.query?.facility_id ? parseInt(req.query.facility_id as string, 10) : null;

      // Total workers at facility
      let workerSql = `SELECT COUNT(*) as count FROM users WHERE is_active = 1`;
      const workerArgs: any[] = [];
      if (facilityId) {
        workerSql = `SELECT COUNT(DISTINCT uf.user_id) as count FROM user_facilities uf JOIN users u ON uf.user_id = u.id WHERE u.is_active = 1 AND uf.facility_id = ?`;
        workerArgs.push(facilityId);
      }
      const workerCount = await db.execute({ sql: workerSql, args: workerArgs });
      const totalWorkers = ((workerCount.rows[0] as any)?.count || 0);

      // Training requirements
      const reqResult = await db.execute({ sql: 'SELECT COUNT(*) as count FROM training_requirements WHERE is_required = 1', args: [] });
      const totalRequirements = ((reqResult.rows[0] as any)?.count || 0);

      // Recent training records (last 90 days)
      const recentResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM training_records WHERE training_date >= date('now', '-90 days')`,
        args: [],
      });
      const recentTraining = ((recentResult.rows[0] as any)?.count || 0);

      // Expiring certifications (next 60 days)
      const expiringCerts = await db.execute({
        sql: `SELECT wc.*, u.first_name, u.last_name FROM worker_certifications wc JOIN users u ON wc.user_id = u.id WHERE wc.expiry_date BETWEEN date('now') AND date('now', '+60 days') ORDER BY wc.expiry_date`,
        args: [],
      });

      // Expired certifications
      const expiredCerts = await db.execute({
        sql: `SELECT COUNT(*) as count FROM worker_certifications WHERE expiry_date < date('now') AND status = 'active'`,
        args: [],
      });

      // Training by type summary
      const byType = await db.execute({
        sql: `SELECT training_type, COUNT(*) as count, MAX(training_date) as last_date FROM training_records GROUP BY training_type ORDER BY count DESC`,
        args: [],
      });

      // Overdue training (workers missing required training)
      const overdue = await db.execute({
        sql: `SELECT treq.title, treq.training_type, treq.frequency_days,
              COUNT(DISTINCT u.id) as total_workers,
              COUNT(DISTINCT tr.user_id) as trained_workers
              FROM training_requirements treq
              CROSS JOIN users u
              LEFT JOIN training_records tr ON tr.training_type = treq.training_type AND tr.user_id = u.id AND tr.training_date >= date('now', '-' || treq.frequency_days || ' days')
              WHERE treq.is_required = 1 AND u.is_active = 1
              GROUP BY treq.id
              HAVING trained_workers < total_workers`,
        args: [],
      });

      return res.status(200).json({
        total_workers: totalWorkers,
        total_requirements: totalRequirements,
        recent_training_count: recentTraining,
        expiring_certifications: (expiringCerts.rows as any[]) || [],
        expired_cert_count: ((expiredCerts.rows[0] as any)?.count || 0),
        training_by_type: (byType.rows as any[]) || [],
        overdue_training: (overdue.rows as any[]) || [],
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Training handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function generateNotifications(db: any, facilityId?: number): Promise<void> {
  // Auto-generate notifications for various conditions

  // 1. Expiring supplier certifications (30 days)
  const expiringCerts = await db.execute({
    sql: `SELECT sc.id, sc.cert_name, sc.expiry_date, s.name as supplier_name
          FROM supplier_certifications sc JOIN suppliers s ON sc.supplier_id = s.id
          WHERE s.is_active = 1 AND sc.expiry_date BETWEEN date('now') AND date('now', '+30 days')`,
    args: [],
  });
  for (const cert of (expiringCerts.rows as any[])) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO notifications (notification_type, severity, title, message, entity_type, entity_id, created_at)
            SELECT 'cert_expiring', 'warning', ?, ?, 'supplier_certification', ?, datetime('now')
            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE entity_type = 'supplier_certification' AND entity_id = ? AND notification_type = 'cert_expiring' AND created_at > date('now', '-7 days'))`,
      args: [`Certification Expiring: ${cert.cert_name}`, `${cert.supplier_name}'s ${cert.cert_name} expires ${cert.expiry_date}`, cert.id, cert.id],
    });
  }

  // 2. Overdue CAPAs
  const overdueCApas = await db.execute({
    sql: `SELECT ca.id, ca.action_description, ca.target_completion_date FROM corrective_actions ca WHERE ca.status IN ('open', 'in_progress') AND ca.target_completion_date < date('now')`,
    args: [],
  });
  for (const capa of (overdueCApas.rows as any[])) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO notifications (notification_type, severity, title, message, entity_type, entity_id, created_at)
            SELECT 'capa_overdue', 'critical', ?, ?, 'corrective_action', ?, datetime('now')
            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE entity_type = 'corrective_action' AND entity_id = ? AND notification_type = 'capa_overdue' AND created_at > date('now', '-3 days'))`,
      args: [`Overdue CAPA #${capa.id}`, `CAPA "${(capa.action_description || '').substring(0, 80)}" was due ${capa.target_completion_date}`, capa.id, capa.id],
    });
  }

  // 3. Expiring worker certifications
  const workerCerts = await db.execute({
    sql: `SELECT wc.id, wc.cert_name, wc.expiry_date, u.first_name, u.last_name FROM worker_certifications wc JOIN users u ON wc.user_id = u.id WHERE wc.expiry_date BETWEEN date('now') AND date('now', '+60 days') AND wc.status = 'active'`,
    args: [],
  });
  for (const cert of (workerCerts.rows as any[])) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO notifications (notification_type, severity, title, message, entity_type, entity_id, created_at)
            SELECT 'worker_cert_expiring', 'warning', ?, ?, 'worker_certification', ?, datetime('now')
            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE entity_type = 'worker_certification' AND entity_id = ? AND notification_type = 'worker_cert_expiring' AND created_at > date('now', '-7 days'))`,
      args: [`Worker Cert Expiring: ${cert.cert_name}`, `${cert.first_name} ${cert.last_name}'s ${cert.cert_name} expires ${cert.expiry_date}`, cert.id, cert.id],
    });
  }

  // 4. Failed compliance rules (check if we have recent rule results)
  const failedRules = await db.execute({
    sql: `SELECT crr.id, cr.rule_name, cr.severity FROM compliance_rule_results crr JOIN compliance_rules cr ON crr.rule_id = cr.id WHERE crr.status = 'fail' AND crr.evaluated_at > date('now', '-1 day')`,
    args: [],
  });
  for (const rule of (failedRules.rows as any[])) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO notifications (notification_type, severity, title, message, entity_type, entity_id, created_at)
            SELECT 'rule_failed', ?, ?, ?, 'compliance_rule_result', ?, datetime('now')
            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE entity_type = 'compliance_rule_result' AND entity_id = ? AND notification_type = 'rule_failed' AND created_at > date('now', '-1 day'))`,
      args: [rule.severity === 'critical' ? 'critical' : 'warning', `Rule Failed: ${rule.rule_name}`, `Compliance rule "${rule.rule_name}" (${rule.severity}) did not pass`, rule.id, rule.id],
    });
  }
}

async function handleNotifications(req: VercelRequest, res: VercelResponse, db: any, userId: number, path: string[]) {
  try {
    // GET /notifications — List notifications
    if (!path[0] && req.method === 'GET') {
      // First, generate any new notifications
      await generateNotifications(db);

      const unreadOnly = req.query?.unread === 'true';
      let sql = `SELECT * FROM notifications WHERE is_dismissed = 0`;
      if (unreadOnly) sql += ' AND is_read = 0';
      sql += ' ORDER BY created_at DESC LIMIT 50';

      const result = await db.execute({ sql, args: [] });

      // Count unread
      const unreadResult = await db.execute({ sql: 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND is_dismissed = 0', args: [] });
      const unreadCount = ((unreadResult.rows[0] as any)?.count || 0);

      return res.status(200).json({ notifications: (result.rows as any[]) || [], unread_count: unreadCount });
    }

    // PUT /notifications/{id}/read — Mark as read
    if (path[1] === 'read' && req.method === 'PUT') {
      const notifId = parseInt(path[0], 10);
      await db.execute({ sql: 'UPDATE notifications SET is_read = 1 WHERE id = ?', args: [notifId] });
      return res.status(200).json({ message: 'Marked as read' });
    }

    // PUT /notifications/read-all — Mark all as read
    if (path[0] === 'read-all' && req.method === 'PUT') {
      await db.execute({ sql: 'UPDATE notifications SET is_read = 1 WHERE is_read = 0', args: [] });
      return res.status(200).json({ message: 'All notifications marked as read' });
    }

    // PUT /notifications/{id}/dismiss — Dismiss notification
    if (path[1] === 'dismiss' && req.method === 'PUT') {
      const notifId = parseInt(path[0], 10);
      await db.execute({ sql: 'UPDATE notifications SET is_dismissed = 1 WHERE id = ?', args: [notifId] });
      return res.status(200).json({ message: 'Dismissed' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Notification handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// ============================================================================
// ADVANCED REPORTING & MONITORING
// ============================================================================

async function handleReporting(req: VercelRequest, res: VercelResponse, db: any, userId: number, path: string[]) {
  try {
    // GET /reporting/facilities/{facilityId}/rules — Run rules engine
    if (path[0] === 'facilities' && path[2] === 'rules' && req.method === 'GET') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const saveResults = req.query?.save === 'true';
      let assessmentId: number | undefined;

      if (saveResults) {
        // Create a compliance assessment first
        const scoreResult = await calculateComplianceScore(db, facilityId);
        const insertResult = await db.execute({
          sql: `INSERT INTO compliance_assessments (facility_id, assessment_date, assessment_type, overall_score, overall_grade, module_scores, module_statuses, sop_readiness_pct, checklist_submissions_pct, audit_coverage_pct, critical_findings_count, major_findings_count, minor_findings_count, assessed_by)
                VALUES (?, datetime('now'), 'rules_engine', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [facilityId, scoreResult.overall_score, scoreResult.overall_grade, JSON.stringify(scoreResult.module_scores), JSON.stringify(scoreResult.module_scores.map((m: any) => m.status)), scoreResult.sop_readiness_pct, scoreResult.checklist_submissions_pct, scoreResult.audit_coverage_pct, scoreResult.critical_findings, scoreResult.major_findings, scoreResult.minor_findings, userId],
        });
        assessmentId = Number(insertResult.lastInsertRowid);
      }

      const ruleResults = await evaluateComplianceRules(db, facilityId, assessmentId);
      return res.status(200).json(ruleResults);
    }

    // GET /reporting/facilities/{facilityId}/risk — Risk scores
    if (path[0] === 'facilities' && path[2] === 'risk' && req.method === 'GET') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const risks = await calculateRiskScores(db, facilityId);

      // Overall facility risk
      const avgRisk = risks.length > 0 ? Math.round(risks.reduce((sum: number, r: any) => sum + r.risk_score, 0) / risks.length) : 0;
      const facilityRiskLevel = avgRisk >= 75 ? 'critical' : avgRisk >= 50 ? 'high' : avgRisk >= 25 ? 'medium' : 'low';

      return res.status(200).json({
        facility_risk_score: avgRisk,
        facility_risk_level: facilityRiskLevel,
        module_risks: risks,
      });
    }

    // GET /reporting/facilities/{facilityId}/trends — Compliance trends
    if (path[0] === 'facilities' && path[2] === 'trends' && req.method === 'GET') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const periodType = (req.query?.period as string) || 'monthly';

      // Get assessment history and group by period
      const assessments = await db.execute({
        sql: `SELECT id, assessment_date, overall_score, overall_grade, module_scores,
              sop_readiness_pct, checklist_submissions_pct, audit_coverage_pct,
              critical_findings_count, major_findings_count, minor_findings_count
              FROM compliance_assessments
              WHERE facility_id = ?
              ORDER BY assessment_date DESC
              LIMIT 52`,
        args: [facilityId],
      });

      // Also get stored trends
      const trends = await db.execute({
        sql: `SELECT * FROM compliance_trends WHERE facility_id = ? AND period_type = ? ORDER BY period_start DESC LIMIT 24`,
        args: [facilityId, periodType],
      });

      return res.status(200).json({
        assessments: (assessments.rows as any[]) || [],
        trends: (trends.rows as any[]) || [],
      });
    }

    // GET /reporting/facilities/{facilityId}/snapshot — Save trend snapshot
    if (path[0] === 'facilities' && path[2] === 'snapshot' && req.method === 'POST') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const score = await calculateComplianceScore(db, facilityId);
      const ruleResults = await evaluateComplianceRules(db, facilityId);

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      await db.execute({
        sql: `INSERT INTO compliance_trends (facility_id, period_type, period_start, period_end, overall_score, overall_grade, module_scores, sop_readiness_pct, checklist_pct, audit_pct, critical_count, major_count, minor_count, rules_passed, rules_failed, rules_total)
              VALUES (?, 'weekly', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [facilityId, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0], score.overall_score, score.overall_grade, JSON.stringify(score.module_scores), score.sop_readiness_pct, score.checklist_submissions_pct, score.audit_coverage_pct, score.critical_findings, score.major_findings, score.minor_findings, ruleResults.summary.passed, ruleResults.summary.failed, ruleResults.summary.total],
      });

      return res.status(200).json({ message: 'Trend snapshot saved', score, rules: ruleResults.summary });
    }

    // GET /reporting/facilities/{facilityId}/export — Export compliance report data
    if (path[0] === 'facilities' && path[2] === 'export' && req.method === 'GET') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      // Gather comprehensive report data
      const score = await calculateComplianceScore(db, facilityId);
      const ruleResults = await evaluateComplianceRules(db, facilityId);
      const risks = await calculateRiskScores(db, facilityId);

      const facility = await db.execute({
        sql: 'SELECT * FROM facilities WHERE id = ?',
        args: [facilityId],
      });

      const assessmentHistory = await db.execute({
        sql: `SELECT * FROM compliance_assessments WHERE facility_id = ? ORDER BY assessment_date DESC LIMIT 12`,
        args: [facilityId],
      });

      return res.status(200).json({
        report_date: new Date().toISOString(),
        facility: (facility.rows as any[])[0] || null,
        compliance_score: score,
        rules_evaluation: ruleResults,
        risk_assessment: {
          facility_risk_score: risks.length > 0 ? Math.round(risks.reduce((s: number, r: any) => s + r.risk_score, 0) / risks.length) : 0,
          module_risks: risks,
        },
        assessment_history: (assessmentHistory.rows as any[]) || [],
      });
    }

    // GET /reporting/comparison — Multi-facility comparison
    if (path[0] === 'comparison' && req.method === 'GET') {
      const facilityIds = ((req.query?.facility_ids as string) || '').split(',').map(Number).filter(Boolean);
      if (facilityIds.length === 0) return res.status(400).json({ error: 'facility_ids required' });

      const comparisons = [];
      for (const fid of facilityIds) {
        const facilityResult = await db.execute({ sql: 'SELECT id, name, code FROM facilities WHERE id = ?', args: [fid] });
        const facility = (facilityResult.rows as any[])[0];
        if (!facility) continue;

        const score = await calculateComplianceScore(db, fid);
        comparisons.push({
          facility_id: fid,
          facility_name: facility.name,
          facility_code: facility.code,
          overall_score: score.overall_score,
          overall_grade: score.overall_grade,
          module_scores: score.module_scores,
          sop_readiness_pct: score.sop_readiness_pct,
          checklist_submissions_pct: score.checklist_submissions_pct,
          audit_coverage_pct: score.audit_coverage_pct,
        });
      }

      return res.status(200).json({ comparisons });
    }

    // GET /reporting/rules — List all rules
    if (path[0] === 'rules' && req.method === 'GET') {
      const rules = await db.execute({
        sql: 'SELECT * FROM compliance_rules ORDER BY rule_code',
        args: [],
      });
      return res.status(200).json((rules.rows as any[]) || []);
    }

    // PUT /reporting/rules/{ruleId} — Toggle rule active status
    if (path[0] === 'rules' && path[1] && req.method === 'PUT') {
      const { allowed } = await requireRole(userId, db, ['admin']);
      if (!allowed) return res.status(403).json({ error: 'Admin only' });

      const ruleId = parseInt(path[1], 10);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      await db.execute({
        sql: 'UPDATE compliance_rules SET is_active = ? WHERE id = ?',
        args: [body.is_active ? 1 : 0, ruleId],
      });
      return res.status(200).json({ message: 'Rule updated' });
    }

    // GET /reporting/facilities/{facilityId}/pdf-data — Generate comprehensive report data for PDF
    if (path[0] === 'facilities' && path[2] === 'pdf-data' && req.method === 'GET') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      // Gather all data needed for the report
      const facility = await db.execute({ sql: 'SELECT * FROM facilities WHERE id = ?', args: [facilityId] });
      const facilityData = (facility.rows as any[])[0] || {};

      const score = await calculateComplianceScore(db, facilityId);
      const ruleResults = await evaluateComplianceRules(db, facilityId);
      const risks = await calculateRiskScores(db, facilityId);

      // SOP status breakdown
      const sopStatus = await db.execute({
        sql: `SELECT sd.sop_code, sd.title, sd.category, sd.priority, sfs.status, sfs.last_reviewed
              FROM sop_documents sd
              LEFT JOIN sop_facility_status sfs ON sd.id = sfs.sop_id AND sfs.facility_id = ?
              ORDER BY sd.category, sd.sop_code`,
        args: [facilityId],
      });

      // Recent audit findings
      const findings = await db.execute({
        sql: `SELECT af.*, aq.question_code, aq.question_text, am.code as module_code, am.name as module_name
              FROM audit_findings af
              JOIN audit_questions_v2 aq ON af.question_id = aq.id
              JOIN audit_modules am ON aq.module_id = am.id
              WHERE af.facility_id = ? AND af.status = 'open'
              ORDER BY CASE af.severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 ELSE 3 END`,
        args: [facilityId],
      });

      // Open CAPAs
      const capas = await db.execute({
        sql: `SELECT ca.*, n.finding_category, n.severity as nc_severity
              FROM corrective_actions ca
              JOIN nonconformances n ON ca.nonconformance_id = n.id
              WHERE ca.status IN ('open', 'in_progress')
              ORDER BY ca.target_completion_date`,
        args: [],
      });

      // Training compliance
      const trainingStatus = await db.execute({
        sql: `SELECT treq.title, treq.training_type, treq.frequency_days, treq.is_required,
              (SELECT COUNT(DISTINCT tr.user_id) FROM training_records tr WHERE tr.training_type = treq.training_type AND tr.training_date >= date('now', '-' || treq.frequency_days || ' days')) as trained,
              (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_workers
              FROM training_requirements treq
              WHERE treq.is_required = 1
              ORDER BY treq.title`,
        args: [],
      });

      // Assessment history (last 6)
      const history = await db.execute({
        sql: `SELECT * FROM compliance_assessments WHERE facility_id = ? ORDER BY assessment_date DESC LIMIT 6`,
        args: [facilityId],
      });

      const avgRisk = risks.length > 0 ? Math.round(risks.reduce((s: number, r: any) => s + r.risk_score, 0) / risks.length) : 0;
      const facilityRiskLevel = avgRisk >= 75 ? 'critical' : avgRisk >= 50 ? 'high' : avgRisk >= 25 ? 'medium' : 'low';

      return res.status(200).json({
        report_title: `Compliance Assessment Report — ${facilityData.name || 'Facility'}`,
        report_date: new Date().toISOString(),
        facility: facilityData,
        executive_summary: {
          overall_score: score.overall_score,
          overall_grade: score.overall_grade,
          risk_score: avgRisk,
          risk_level: facilityRiskLevel,
          sop_readiness_pct: score.sop_readiness_pct,
          checklist_pct: score.checklist_submissions_pct,
          audit_pct: score.audit_coverage_pct,
          rules_passed: ruleResults.summary.passed,
          rules_failed: ruleResults.summary.failed,
          rules_total: ruleResults.summary.total,
          critical_findings: score.critical_findings,
          major_findings: score.major_findings,
          minor_findings: score.minor_findings,
        },
        module_scores: score.module_scores,
        module_risks: risks,
        rules_results: ruleResults.results,
        sop_status: (sopStatus.rows as any[]) || [],
        open_findings: (findings.rows as any[]) || [],
        open_capas: (capas.rows as any[]) || [],
        training_compliance: (trainingStatus.rows as any[]) || [],
        assessment_history: (history.rows as any[]) || [],
      });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Reporting handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleCompliance(req: VercelRequest, res: VercelResponse, db: any, userId: number, path: string[]) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // GET /compliance/facilities/{facilityId}/score
    if (path[0] === 'facilities' && path[2] === 'score') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const simulationId = req.query?.simulation_id ? parseInt(req.query.simulation_id as string, 10) : undefined;
      const result = await calculateComplianceScore(db, facilityId, simulationId);

      // Save assessment if requested
      if (req.query?.save_assessment === 'true') {
        await db.execute({
          sql: `INSERT INTO compliance_assessments (facility_id, assessment_date, overall_score, overall_grade, module_scores, module_statuses, sop_readiness_pct, checklist_submissions_pct, audit_coverage_pct, critical_findings_count, major_findings_count, minor_findings_count, assessed_by)
                VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [facilityId, result.overall_score, result.overall_grade, JSON.stringify(result.module_scores), JSON.stringify(result.module_scores.map((m: any) => m.status)), result.sop_readiness_pct, result.checklist_submissions_pct, result.audit_coverage_pct, result.critical_findings, result.major_findings, result.minor_findings, userId],
        });
      }

      return res.status(200).json(result);
    }

    // GET /compliance/facilities/{facilityId}/matrix
    if (path[0] === 'facilities' && path[2] === 'matrix') {
      const facilityId = parseInt(path[1], 10);
      if (!facilityId) return res.status(400).json({ error: 'Invalid facility ID' });

      const matrixResult = await db.execute({
        sql: `SELECT am.code as module_code, am.name as module_name,
                     fs.code as standard_code, fs.name as standard_name,
                     COUNT(DISTINCT fr.id) as total,
                     0 as satisfied
              FROM facility_modules fm
              JOIN audit_modules am ON fm.module_id = am.id
              JOIN fsms_requirements fr ON am.id = fr.module_id
              JOIN fsms_clauses fc ON fr.clause_id = fc.id
              JOIN fsms_standards fs ON fc.standard_id = fs.id
              WHERE fm.facility_id = ? AND fm.is_applicable = 1
              GROUP BY am.id, fs.id
              ORDER BY am.code, fs.code`,
        args: [facilityId],
      });

      // Group flat rows into nested matrix structure
      const moduleMap: Record<string, { module_code: string; module_name: string; standards: any[] }> = {};
      for (const row of (matrixResult.rows as any[])) {
        if (!moduleMap[row.module_code]) {
          moduleMap[row.module_code] = { module_code: row.module_code, module_name: row.module_name, standards: [] };
        }
        moduleMap[row.module_code].standards.push({
          standard_code: row.standard_code,
          standard_name: row.standard_name,
          total: Number(row.total),
          satisfied: Number(row.satisfied),
          pct: Number(row.total) > 0 ? Math.round((Number(row.satisfied) / Number(row.total)) * 100) : 0,
        });
      }

      return res.status(200).json({ matrix: Object.values(moduleMap) });
    }

    // GET /compliance/modules/{moduleCode}/requirements
    if (path[0] === 'modules' && path[2] === 'requirements') {
      const moduleCode = path[1];
      const facilityId = req.query?.facility_id ? parseInt(req.query.facility_id as string, 10) : null;
      if (!facilityId) return res.status(400).json({ error: 'facility_id required' });

      const reqResult = await db.execute({
        sql: `SELECT fr.id, fr.requirement_code, fr.requirement_text, fr.criticality, am.code as module_code
              FROM fsms_requirements fr
              JOIN audit_modules am ON fr.module_id = am.id
              WHERE am.code = ?`,
        args: [moduleCode],
      });

      const requirements = (reqResult.rows as any[]) || [];
      const enriched = [];

      for (const req of requirements) {
        const evidenceResult = await db.execute({
          sql: `SELECT evidence_type, evidence_id, evidence_code FROM requirement_evidence_links WHERE requirement_id = ?`,
          args: [req.id],
        });
        enriched.push({
          ...req,
          evidence_links: (evidenceResult.rows as any[]) || [],
        });
      }

      return res.status(200).json(enriched);
    }

    // GET /compliance/assessments/history
    if (path[0] === 'assessments' && path[1] === 'history') {
      const facilityId = req.query?.facility_id ? parseInt(req.query.facility_id as string, 10) : null;
      if (!facilityId) return res.status(400).json({ error: 'facility_id required' });

      const historyResult = await db.execute({
        sql: `SELECT id, facility_id, assessment_date, overall_score, overall_grade, module_scores, sop_readiness_pct, checklist_submissions_pct, audit_coverage_pct, created_at
              FROM compliance_assessments
              WHERE facility_id = ?
              ORDER BY assessment_date DESC
              LIMIT 20`,
        args: [facilityId],
      });

      return res.status(200).json((historyResult.rows as any[]) || []);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Compliance handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    // Parse path from URL - strip /api/ prefix and split into segments
    const url = req.url || '';
    const apiPath = url.split('?')[0].replace(/^\/api\/?/, '');
    const pathArray = apiPath ? apiPath.split('/').filter(Boolean) : [];

    // Route based on path segments
    if (pathArray.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    // AUTH ROUTES (no auth required)
    if (pathArray[0] === 'auth') {
      const db = getDb();
      if (pathArray[1] === 'login') {
        return await handleAuthLogin(req, res, db);
      }
      if (pathArray[1] === 'register') {
        return await handleAuthRegister(req, res, db);
      }
      if (pathArray[1] === 'me') {
        const userId = verifyToken(req);
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        return await handleAuthMe(req, res, db, userId);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // All other routes require authentication
    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();

    // PRE-HARVEST ROUTES
    if (pathArray[0] === 'pre-harvest') {
      return await handlePreHarvest(req, res, db, userId, pathArray[1]);
    }

    // CHEMICAL ROUTES
    if (pathArray[0] === 'chemicals') {
      if (pathArray[1] === 'applications') {
        return await handleChemicalApplications(req, res, db, userId, pathArray[2]);
      }
      if (pathArray[1] === 'storage') {
        return await handleChemicalStorage(req, res, db, userId, pathArray[2]);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // CORRECTIVE ACTIONS ROUTES
    if (pathArray[0] === 'corrective-actions') {
      if (pathArray[1] === 'summary') {
        return await handleCapaSummary(req, res, db, userId);
      }
      if (pathArray[1] === 'nonconformances') {
        return await handleNonconformances(req, res, db, userId, pathArray[2]);
      }
      if (pathArray[1] === 'capa') {
        return await handleCapa(req, res, db, userId, pathArray[2]);
      }
      if (pathArray[1] === 'checklists') {
        return await handleAuditChecklists(req, res, db, userId, pathArray[2]);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // REPORTS ROUTES
    if (pathArray[0] === 'reports') {
      if (pathArray[1] === 'dashboard') {
        return await handleDashboard(req, res, db, userId);
      }
      if (pathArray[1] === 'export') {
        return await handleExport(req, res, db, userId);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // ADMIN ROUTES
    if (pathArray[0] === 'admin') {
      return await handleAdmin(req, res, db, userId, pathArray.slice(1));
    }

    // FACILITIES ROUTES
    if (pathArray[0] === 'facilities') {
      return await handleFacilities(req, res, db, userId, pathArray[1]);
    }

    // CHECKLISTS ROUTES
    if (pathArray[0] === 'checklists') {
      if (pathArray[1] === 'templates') {
        return await handleChecklistTemplates(req, res, db, userId, pathArray[2]);
      }
      if (pathArray[1] === 'submissions') {
        return await handleChecklistSubmissions(req, res, db, userId, pathArray[2], pathArray[3]);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // SOPS ROUTES
    if (pathArray[0] === 'sops') {
      if (pathArray[1] === 'facility') {
        return await handleSopsByFacility(req, res, db, userId, pathArray[2]);
      }
      return await handleSops(req, res, db, userId, pathArray[1], pathArray[2]);
    }

    // GAP ANALYSIS ROUTES
    if (pathArray[0] === 'gaps') {
      return await handleGapAnalysis(req, res, db, userId, pathArray.slice(1));
    }

    // AUDIT SIMULATOR ROUTES
    if (pathArray[0] === 'audit') {
      if (pathArray[1] === 'modules') {
        return await handleAuditModules(req, res, db, userId, pathArray[2]);
      }
      if (pathArray[1] === 'simulations') {
        return await handleAuditSimulations(req, res, db, userId, pathArray[2], pathArray[3]);
      }
      if (pathArray[1] === 'findings') {
        return await handleAuditFindings(req, res, db, userId, pathArray[2], pathArray[3]);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    // COMPLIANCE ROUTES
    if (pathArray[0] === 'compliance') {
      return await handleCompliance(req, res, db, userId, pathArray.slice(1));
    }

    // REPORTING & MONITORING ROUTES
    if (pathArray[0] === 'reporting') {
      return await handleReporting(req, res, db, userId, pathArray.slice(1));
    }

    // TRAINING ROUTES
    if (pathArray[0] === 'training') {
      return await handleTraining(req, res, db, userId, pathArray.slice(1));
    }

    // NOTIFICATION ROUTES
    if (pathArray[0] === 'notifications') {
      return await handleNotifications(req, res, db, userId, pathArray.slice(1));
    }

    // SUPPLIERS ROUTES
    if (pathArray[0] === 'suppliers') {
      if (pathArray[1] === 'expiring') {
        return await handleSuppliersExpiring(req, res, db, userId);
      }
      return await handleSuppliers(req, res, db, userId, pathArray[1], pathArray[2]);
    }

    // CALENDAR EVENTS (deadlines, cert expirations, CAPA due dates)
    if (pathArray[0] === 'calendar') {
      const days = Number(req.query?.days) || 90;
      // Supplier cert expirations (next N days + recently expired)
      const certs = await db.execute({
        sql: `SELECT sc.id, sc.cert_type, sc.cert_name, sc.expiry_date, s.name as supplier_name, s.code as supplier_code,
              CAST(julianday(sc.expiry_date) - julianday('now') AS INTEGER) as days_until
              FROM supplier_certifications sc
              JOIN suppliers s ON sc.supplier_id = s.id
              WHERE s.is_active = 1
              AND sc.expiry_date BETWEEN date('now', '-14 days') AND date('now', '+' || ? || ' days')
              ORDER BY sc.expiry_date`,
        args: [days],
      });
      // CAPA due dates (open corrective actions)
      const capas = await db.execute({
        sql: `SELECT ca.id, ca.action_description, ca.responsible_party, ca.target_completion_date, ca.status,
              n.finding_category, n.severity
              FROM corrective_actions ca
              JOIN nonconformances n ON ca.nonconformance_id = n.id
              WHERE ca.status IN ('open', 'in_progress')
              AND ca.target_completion_date IS NOT NULL
              AND ca.target_completion_date BETWEEN date('now', '-14 days') AND date('now', '+' || ? || ' days')
              ORDER BY ca.target_completion_date`,
        args: [days],
      });
      // Chemical storage expirations
      const chemicals = await db.execute({
        sql: `SELECT cs.id, cs.product_name, cs.expiration_date, cs.storage_location, cs.quantity_stored, cs.quantity_unit
              FROM chemical_storage cs
              WHERE cs.expiration_date IS NOT NULL
              AND cs.expiration_date BETWEEN date('now', '-14 days') AND date('now', '+' || ? || ' days')
              ORDER BY cs.expiration_date`,
        args: [days],
      });
      return res.status(200).json({
        certExpirations: certs.rows,
        capaDueDates: capas.rows,
        chemicalExpirations: chemicals.rows,
      });
    }

    // PRIMUS AUDIT CHECKLIST
    if (pathArray[0] === 'primus-checklist') {
      return await handlePrimusChecklist(req, res, db, userId, pathArray[1], pathArray[2]);
    }

    // GLOBAL SEARCH
    if (pathArray[0] === 'search') {
      return await handleSearch(req, res, db, userId);
    }

    // SETUP / ADMIN CONFIG
    if (pathArray[0] === 'setup') {
      return await handleSetup(req, res, db, userId, pathArray.slice(1));
    }

    // NETSUITE INTEGRATION
    if (pathArray[0] === 'netsuite') {
      if (pathArray[1] === 'supply-master' && req.method === 'GET') {
        return await handleNetSuiteSupplyMaster(req, res);
      }
      if (pathArray[1] === 'certifications') {
        return await handleVendorCertifications(req, res, db, userId, pathArray[2]);
      }
      return res.status(404).json({ error: 'NetSuite endpoint not found' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
