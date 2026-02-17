import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcryptjs from 'bcryptjs';
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
  role: z.enum(['farmer', 'supervisor', 'admin']).optional(),
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
  if (!id) {
    if (req.method === 'GET') {
      const { category, status, priority } = req.query;
      let sql = 'SELECT * FROM sop_documents WHERE 1=1';
      const args: any[] = [];
      if (category) { sql += ' AND category = ?'; args.push(category); }
      if (status) { sql += ' AND status = ?'; args.push(status); }
      if (priority) { sql += ' AND priority = ?'; args.push(priority); }
      sql += ' ORDER BY code';
      const result = await db.execute({ sql, args });
      return res.status(200).json({ sops: result.rows });
    }
    if (req.method === 'POST') {
      const isAdmin = await requireAdmin(userId, db);
      if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
      const { code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority } = req.body;
      const result = await db.execute({
        sql: 'INSERT INTO sop_documents (code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [code, title, category, description, applies_to, primus_ref, nop_ref, owner, priority || 'MEDIUM'],
      });
      return res.status(201).json({ id: Number(result.lastInsertRowid), message: 'SOP created' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const sopId = Number(id);
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
  if (req.method === 'GET') {
    const sop = await db.execute({ sql: 'SELECT * FROM sop_documents WHERE id = ?', args: [sopId] });
    if (sop.rows.length === 0) return res.status(404).json({ error: 'SOP not found' });
    const facilityStatuses = await db.execute({ sql: 'SELECT sfs.*, f.name as facility_name, f.code as facility_code FROM sop_facility_status sfs JOIN facilities f ON sfs.facility_id = f.id WHERE sfs.sop_id = ?', args: [sopId] });
    const versions = await db.execute({ sql: 'SELECT * FROM sop_versions WHERE sop_id = ? ORDER BY version_number DESC', args: [sopId] });
    return res.status(200).json({ sop: sop.rows[0], facility_statuses: facilityStatuses.rows, versions: versions.rows });
  }
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
    await db.execute({ sql: 'UPDATE audit_simulations SET earned_points = ?, score_pct = ?, has_auto_fail = ?, grade = ? WHERE id = ?', args: [totalEarned, pct, hasAutoFail ? 1 : 0, grade, simId] });
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
      return res.status(404).json({ error: 'Not found' });
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

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
