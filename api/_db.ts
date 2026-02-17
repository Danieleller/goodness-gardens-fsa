import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initDb() {
  const db = getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      organization_name TEXT DEFAULT '',
      role TEXT DEFAULT 'farmer',
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS pre_harvest_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      log_type TEXT NOT NULL,
      water_source TEXT, test_date TEXT, ph_level REAL,
      e_coli_result TEXT, total_coliform_result TEXT,
      test_location TEXT, lab_name TEXT,
      amendment_type TEXT, amendment_date TEXT, source TEXT,
      quantity_applied REAL, quantity_unit TEXT, field_location TEXT,
      training_date TEXT, training_topic TEXT, trainee_name TEXT,
      handwashing_station_available INTEGER, sanitation_checklist_pass INTEGER,
      intrusion_date TEXT, intrusion_type TEXT, intrusion_location TEXT,
      remedial_action TEXT, corrected_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS chemical_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_name TEXT NOT NULL, active_ingredient TEXT NOT NULL,
      epa_registration_number TEXT, application_date TEXT NOT NULL,
      application_location TEXT, quantity_applied REAL, quantity_unit TEXT,
      applicator_name TEXT, applicator_license TEXT, weather_conditions TEXT,
      pre_harvest_interval_days INTEGER, pre_harvest_interval_end_date TEXT,
      mrl_ppm REAL, expected_residue_level_ppm REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS chemical_storage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_name TEXT NOT NULL, storage_location TEXT,
      quantity_stored REAL, quantity_unit TEXT,
      received_date TEXT, expiration_date TEXT,
      storage_conditions TEXT, safety_equipment_available INTEGER,
      last_inventory_date TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS nonconformances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      finding_date TEXT NOT NULL, finding_category TEXT NOT NULL,
      finding_description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'minor',
      affected_area TEXT, root_cause TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS corrective_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      nonconformance_id INTEGER NOT NULL,
      action_description TEXT NOT NULL,
      responsible_party TEXT, target_completion_date TEXT,
      actual_completion_date TEXT,
      status TEXT DEFAULT 'open',
      verification_method TEXT, verification_date TEXT,
      verified_by TEXT, verification_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (nonconformance_id) REFERENCES nonconformances(id)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      audit_date TEXT NOT NULL, audit_name TEXT NOT NULL,
      water_safety_checked INTEGER DEFAULT 0,
      soil_amendment_checked INTEGER DEFAULT 0,
      worker_hygiene_checked INTEGER DEFAULT 0,
      animal_intrusion_checked INTEGER DEFAULT 0,
      chemical_applications_checked INTEGER DEFAULT 0,
      mrl_compliance_checked INTEGER DEFAULT 0,
      storage_conditions_checked INTEGER DEFAULT 0,
      nonconformances_tracked INTEGER DEFAULT 0,
      capas_documented INTEGER DEFAULT 0,
      capas_verified INTEGER DEFAULT 0,
      overall_status TEXT DEFAULT 'in_progress',
      auditor_name TEXT, audit_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ], 'write');
}
