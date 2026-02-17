import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;
let initialized = false;
let seedData = false;

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
  if (initialized) return;
  const db = getDb();

  const tables = [
    // EXISTING 7 TABLES
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
    )`,
    // NEW TABLES FOR EXPANSION
    `CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internal_id INTEGER UNIQUE,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      facility_type TEXT,
      m1_fsms INTEGER DEFAULT 0,
      m2_farm INTEGER DEFAULT 0,
      m3_indoor_ag INTEGER DEFAULT 0,
      m4_harvest INTEGER DEFAULT 0,
      m5_facility INTEGER DEFAULT 0,
      m6_haccp INTEGER DEFAULT 0,
      m7_prev_controls INTEGER DEFAULT 0,
      m8_grains INTEGER DEFAULT 0,
      m9_ipm INTEGER DEFAULT 0,
      organic_scope TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      role TEXT DEFAULT 'worker',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      UNIQUE(user_id, facility_id)
    )`,
    `CREATE TABLE IF NOT EXISTS checklist_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      linked_sop TEXT,
      primus_ref TEXT,
      facility_type TEXT,
      frequency TEXT,
      item_count INTEGER DEFAULT 0,
      requires_photos INTEGER DEFAULT 0,
      requires_signoff INTEGER DEFAULT 0,
      phase TEXT DEFAULT 'Phase 1',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      item_number INTEGER,
      item_text TEXT NOT NULL,
      item_type TEXT DEFAULT 'pass_fail',
      is_critical INTEGER DEFAULT 0,
      sort_order INTEGER,
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id)
    )`,
    `CREATE TABLE IF NOT EXISTS checklist_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      submitted_by INTEGER NOT NULL,
      submission_date TEXT NOT NULL,
      overall_pass INTEGER DEFAULT 1,
      critical_fails INTEGER DEFAULT 0,
      total_items INTEGER DEFAULT 0,
      passed_items INTEGER DEFAULT 0,
      notes TEXT,
      supervisor_id INTEGER,
      signoff_date TEXT,
      supervisor_notes TEXT,
      status TEXT DEFAULT 'submitted',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
      FOREIGN KEY (submitted_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS checklist_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      answer_value TEXT,
      notes TEXT,
      photo_url TEXT,
      is_fail INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id),
      FOREIGN KEY (item_id) REFERENCES checklist_items(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sop_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      applies_to TEXT,
      primus_ref TEXT,
      nop_ref TEXT,
      sedex_ref TEXT,
      facility_types TEXT,
      language TEXT DEFAULT 'EN/ES',
      owner TEXT,
      status TEXT DEFAULT 'Draft',
      priority TEXT DEFAULT 'MEDIUM',
      current_version INTEGER DEFAULT 1,
      last_reviewed TEXT,
      next_review_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sop_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      change_notes TEXT,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sop_id) REFERENCES sop_documents(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sop_facility_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      status TEXT DEFAULT 'missing',
      last_review_date TEXT,
      reviewer_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sop_id) REFERENCES sop_documents(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      UNIQUE(sop_id, facility_id)
    )`,
    `CREATE TABLE IF NOT EXISTS gap_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      snapshot_date TEXT NOT NULL,
      total_required INTEGER DEFAULT 0,
      exists_current INTEGER DEFAULT 0,
      needs_update INTEGER DEFAULT 0,
      missing INTEGER DEFAULT 0,
      not_applicable INTEGER DEFAULT 0,
      readiness_pct REAL DEFAULT 0,
      assessed_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      total_points INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS audit_questions_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      question_code TEXT NOT NULL,
      question_text TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      is_auto_fail INTEGER DEFAULT 0,
      is_new_v4 INTEGER DEFAULT 0,
      category TEXT,
      nop_ref TEXT,
      required_sop TEXT,
      required_checklist TEXT,
      frequency TEXT,
      responsible_role TEXT,
      sort_order INTEGER,
      FOREIGN KEY (module_id) REFERENCES audit_modules(id)
    )`,
    `CREATE TABLE IF NOT EXISTS facility_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      is_applicable INTEGER DEFAULT 1,
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (module_id) REFERENCES audit_modules(id),
      UNIQUE(facility_id, module_id)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      simulation_date TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      total_points INTEGER DEFAULT 0,
      earned_points INTEGER DEFAULT 0,
      score_pct REAL DEFAULT 0,
      has_auto_fail INTEGER DEFAULT 0,
      grade TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simulation_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      notes TEXT,
      evidence_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (simulation_id) REFERENCES audit_simulations(id),
      FOREIGN KEY (question_id) REFERENCES audit_questions_v2(id)
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      supplier_type TEXT,
      approval_status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      approval_date TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      cert_type TEXT NOT NULL,
      cert_name TEXT,
      issuing_body TEXT,
      cert_number TEXT,
      issue_date TEXT,
      expiry_date TEXT NOT NULL,
      status TEXT DEFAULT 'valid',
      alert_days_before INTEGER DEFAULT 30,
      last_alert_sent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS supplier_facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      approved INTEGER DEFAULT 0,
      approved_by INTEGER,
      approval_date TEXT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      UNIQUE(supplier_id, facility_id)
    )`
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }

  // Promote user ID 1 (Daniel) to admin if not already
  await db.execute({
    sql: "UPDATE users SET role = 'admin' WHERE id = 1 AND role != 'admin'",
    args: [],
  });

  initialized = true;

  // Run seed data after table creation
  await seedDb();
}

async function seedDb() {
  if (seedData) return;
  const db = getDb();

  // Migrate: add internal_id column if it doesn't exist
  try {
    await db.execute('ALTER TABLE facilities ADD COLUMN internal_id INTEGER UNIQUE');
  } catch (_e) {
    // Column already exists, ignore
  }

  // Check if facilities already exist - if so, update internal_ids and skip full seeding
  const checkFacilities = await db.execute('SELECT COUNT(*) as count FROM facilities');
  const facilityCount = (checkFacilities.rows[0] as any)?.count || 0;

  if (facilityCount > 0) {
    // Update internal_ids on existing facilities and add any new ones
    const internalIdMap: { [code: string]: { internal_id: number; name: string; location: string; facility_type: string; organic: string } } = {
      'NH': { internal_id: 2, name: 'New Hampton', location: 'New Hampton, NY', facility_type: 'Growing + Packing', organic: 'Grower + Handler' },
      'AL': { internal_id: 41, name: 'Allentown', location: 'Allentown, PA', facility_type: 'Growing + Packing', organic: 'Grower + Handler' },
      'MI': { internal_id: 17, name: 'Miami', location: 'Miami, FL', facility_type: 'Packing/Handling', organic: 'Handler' },
      'MG': { internal_id: 36, name: 'McGregors', location: 'McGregors, FL', facility_type: 'Indoor Ag + Packing', organic: 'Grower + Handler' },
      'SA': { internal_id: 31, name: 'San Antonio', location: 'San Antonio, TX', facility_type: 'Packing/Handling', organic: 'Handler' },
      'PE': { internal_id: 37, name: 'Pearsall', location: 'Pearsall, TX', facility_type: 'Growing + Indoor Ag', organic: 'Grower' },
      'IN': { internal_id: 38, name: 'Indiana', location: 'Francesville, IN', facility_type: 'Indoor Ag + Packing', organic: 'Grower + Handler' },
    };
    for (const [code, data] of Object.entries(internalIdMap)) {
      await db.execute({ sql: 'UPDATE facilities SET internal_id = ?, location = ? WHERE code = ? AND (internal_id IS NULL OR internal_id != ?)', args: [data.internal_id, data.location, code, data.internal_id] });
    }
    // Add new facilities if they don't exist
    const newFacilities = [
      { code: 'CORP', internal_id: 28, name: 'Corporate', location: 'New York, NY', facility_type: 'Corporate Office', m1: 1, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: '' },
      { code: 'GH', internal_id: 32, name: 'Greenhouse', location: 'New York, NY', facility_type: 'Indoor Ag', m1: 1, m2: 0, m3: 1, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: 'Grower' },
      { code: 'TV', internal_id: 39, name: 'Taylorville', location: 'Taylorville, IL', facility_type: 'Indoor Ag + Packing', m1: 1, m2: 0, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
      { code: 'PU', internal_id: 48, name: 'Puebla', location: 'Puebla, MX', facility_type: 'Growing', m1: 1, m2: 1, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: 'Grower' },
    ];
    for (const f of newFacilities) {
      const exists = await db.execute({ sql: 'SELECT id FROM facilities WHERE code = ?', args: [f.code] });
      if (exists.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO facilities (internal_id, code, name, location, facility_type, m1_fsms, m2_farm, m3_indoor_ag, m4_harvest, m5_facility, m6_haccp, m7_prev_controls, m8_grains, m9_ipm, organic_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [f.internal_id, f.code, f.name, f.location, f.facility_type, f.m1, f.m2, f.m3, f.m4, f.m5, f.m6, f.m7, f.m8, f.m9, f.organic],
        });
      }
    }
    seedData = true;
    return;
  }

  // SEED FACILITIES (internal_id from NetSuite Locations601.csv)
  const facilitySeeds = [
    { code: 'NH', name: 'New Hampton', location: 'New Hampton, NY', facility_type: 'Growing + Packing', internal_id: 2, m1: 1, m2: 1, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
    { code: 'AL', name: 'Allentown', location: 'Allentown, PA', facility_type: 'Growing + Packing', internal_id: 41, m1: 1, m2: 1, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
    { code: 'MI', name: 'Miami', location: 'Miami, FL', facility_type: 'Packing/Handling', internal_id: 17, m1: 1, m2: 0, m3: 0, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 0, organic: 'Handler' },
    { code: 'MG', name: 'McGregors', location: 'McGregors, FL', facility_type: 'Indoor Ag + Packing', internal_id: 36, m1: 1, m2: 0, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
    { code: 'SA', name: 'San Antonio', location: 'San Antonio, TX', facility_type: 'Packing/Handling', internal_id: 31, m1: 1, m2: 0, m3: 0, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 0, organic: 'Handler' },
    { code: 'PE', name: 'Pearsall', location: 'Pearsall, TX', facility_type: 'Growing + Indoor Ag', internal_id: 37, m1: 1, m2: 1, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower' },
    { code: 'IN', name: 'Indiana', location: 'Francesville, IN', facility_type: 'Indoor Ag + Packing', internal_id: 38, m1: 1, m2: 0, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
    { code: 'CORP', name: 'Corporate', location: 'New York, NY', facility_type: 'Corporate Office', internal_id: 28, m1: 1, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: '' },
    { code: 'GH', name: 'Greenhouse', location: 'New York, NY', facility_type: 'Indoor Ag', internal_id: 32, m1: 1, m2: 0, m3: 1, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: 'Grower' },
    { code: 'TV', name: 'Taylorville', location: 'Taylorville, IL', facility_type: 'Indoor Ag + Packing', internal_id: 39, m1: 1, m2: 0, m3: 1, m4: 0, m5: 1, m6: 1, m7: 1, m8: 0, m9: 1, organic: 'Grower + Handler' },
    { code: 'PU', name: 'Puebla', location: 'Puebla, MX', facility_type: 'Growing', internal_id: 48, m1: 1, m2: 1, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, organic: 'Grower' },
  ];

  const facilityIds: { [key: string]: number } = {};

  for (const facility of facilitySeeds) {
    const result = await db.execute({
      sql: `INSERT INTO facilities (internal_id, code, name, location, facility_type, m1_fsms, m2_farm, m3_indoor_ag, m4_harvest, m5_facility, m6_haccp, m7_prev_controls, m8_grains, m9_ipm, organic_scope)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [facility.internal_id, facility.code, facility.name, facility.location, facility.facility_type, facility.m1, facility.m2, facility.m3, facility.m4, facility.m5, facility.m6, facility.m7, facility.m8, facility.m9, facility.organic],
    });
    const lastId = (result as any).lastInsertRowid;
    facilityIds[facility.code] = lastId;
  }

  // SEED AUDIT MODULES (M1-M9)
  const auditModuleSeeds = [
    { code: 'M1', name: 'Food Safety Management System', description: 'Company Administration & Food Safety Culture' },
    { code: 'M2', name: 'Farm Operations (Field)', description: 'Open field growing operations' },
    { code: 'M3', name: 'Indoor Agriculture', description: 'CEA/greenhouse operations' },
    { code: 'M4', name: 'Harvest Operations', description: 'Harvest crew and field packing' },
    { code: 'M5', name: 'Facility Operations', description: 'Packing/handling facility GMP' },
    { code: 'M6', name: 'HACCP Program', description: 'Hazard Analysis Critical Control Points' },
    { code: 'M7', name: 'Preventive Controls', description: 'FSMA Preventive Controls' },
    { code: 'M8', name: 'Grain Operations', description: 'Grain storage and handling' },
    { code: 'M9', name: 'Integrated Pest Management', description: 'IPM program operations' },
  ];

  const moduleIds: { [key: string]: number } = {};

  for (const module of auditModuleSeeds) {
    const result = await db.execute({
      sql: `INSERT INTO audit_modules (code, name, description) VALUES (?, ?, ?)`,
      args: [module.code, module.name, module.description],
    });
    const lastId = (result as any).lastInsertRowid;
    moduleIds[module.code] = lastId;
  }

  // SEED FACILITY-MODULE MAPPINGS based on facility flags
  for (const facility of facilitySeeds) {
    const facilityId = facilityIds[facility.code];
    const moduleMap = [
      { code: 'M1', flag: facility.m1 },
      { code: 'M2', flag: facility.m2 },
      { code: 'M3', flag: facility.m3 },
      { code: 'M4', flag: facility.m4 },
      { code: 'M5', flag: facility.m5 },
      { code: 'M6', flag: facility.m6 },
      { code: 'M7', flag: facility.m7 },
      { code: 'M8', flag: facility.m8 },
      { code: 'M9', flag: facility.m9 },
    ];

    for (const mapping of moduleMap) {
      if (mapping.flag === 1) {
        const moduleId = moduleIds[mapping.code];
        await db.execute({
          sql: `INSERT INTO facility_modules (facility_id, module_id, is_applicable) VALUES (?, ?, 1)`,
          args: [facilityId, moduleId],
        });
      }
    }
  }

  // SEED CHECKLIST TEMPLATES
  const checklistSeeds = [
    { code: 'GG-CL-001', name: 'Daily Pre-Op Sanitation Inspection (Facility)', linked_sop: 'GG-GMP-001', primus_ref: '5.13.08', facility_type: 'Packing/Handling', frequency: 'Daily (pre-shift)', item_count: 20, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-002', name: 'Daily Pre-Op Sanitation Inspection (Growing)', linked_sop: 'GG-GAP-001', primus_ref: '3.06.01', facility_type: 'Growing (CEA)', frequency: 'Daily (pre-shift)', item_count: 15, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-003', name: 'GMP/Hygiene Walkthrough', linked_sop: 'GG-GMP-010', primus_ref: '5.05.01-13', facility_type: 'Packing/Handling', frequency: 'Daily (during production)', item_count: 15, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-004', name: 'Worker Hygiene Check (Growing)', linked_sop: 'GG-GAP-008', primus_ref: '3.09.01-18', facility_type: 'Growing', frequency: 'Daily', item_count: 12, requires_photos: 0, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-005', name: 'Receiving Inspection Log', linked_sop: 'GG-GMP-007', primus_ref: '5.13.01-02', facility_type: 'All', frequency: 'Per receipt', item_count: 10, requires_photos: 1, requires_signoff: 0, phase: 'Phase 1' },
    { code: 'GG-CL-006', name: 'Shipping Trailer Inspection', linked_sop: 'GG-GMP-007', primus_ref: '5.17.04-06', facility_type: 'Packing/Handling', frequency: 'Per shipment', item_count: 8, requires_photos: 1, requires_signoff: 0, phase: 'Phase 1' },
    { code: 'GG-CL-007', name: 'Chemical Concentration Verification Log', linked_sop: 'GG-GMP-006', primus_ref: '5.04.09; 5.13.04', facility_type: 'All', frequency: 'Per shift / per batch', item_count: 6, requires_photos: 0, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-008', name: 'Temperature Monitoring Log (Coolers/Storage)', linked_sop: 'GG-GMP-009', primus_ref: '5.17.01-03', facility_type: 'Packing/Handling', frequency: 'Every 4 hours minimum', item_count: 5, requires_photos: 0, requires_signoff: 0, phase: 'Phase 1' },
    { code: 'GG-CL-009', name: 'Pest Control Device Inspection', linked_sop: 'GG-GMP-003 / GG-GAP-003', primus_ref: '5.02.07-10; 3.03.09-12', facility_type: 'All', frequency: 'Per pest control service visit', item_count: 20, requires_photos: 1, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-010', name: 'Sanitation Verification (ATP/Visual)', linked_sop: 'GG-GMP-002', primus_ref: '5.14.12', facility_type: 'Packing/Handling', frequency: 'Post-sanitation', item_count: 10, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-011', name: 'Calibration Verification Log', linked_sop: 'GG-FSMS-008', primus_ref: '1.04.05-06', facility_type: 'All', frequency: 'Per calibration schedule', item_count: 8, requires_photos: 0, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-012', name: 'Water Testing Log (Growing)', linked_sop: 'GG-GAP-004', primus_ref: '3.11.05-05c', facility_type: 'Growing', frequency: 'Per testing schedule', item_count: 6, requires_photos: 0, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-013', name: 'Environmental Monitoring Sampling Log', linked_sop: 'GG-GMP-008 / GG-GAP-007', primus_ref: '5.16.01-03; 3.14.02', facility_type: 'All', frequency: 'Per sampling schedule', item_count: 8, requires_photos: 0, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-014', name: 'Foreign Material Control Check', linked_sop: 'GG-GMP-001', primus_ref: '5.04.08', facility_type: 'Packing/Handling', frequency: 'Per shift', item_count: 5, requires_photos: 1, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-015', name: 'Glass & Brittle Plastic Register Check', linked_sop: 'GG-GMP-005', primus_ref: '5.14.13', facility_type: 'Packing/Handling', frequency: 'Daily + per breakage', item_count: 5, requires_photos: 1, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-016', name: 'Visitor/Contractor Sign-In & GMP Compliance', linked_sop: 'GG-FSMS-015', primus_ref: '1.08.06; 5.15.06', facility_type: 'All', frequency: 'Per visit', item_count: 5, requires_photos: 0, requires_signoff: 0, phase: 'Phase 2' },
    { code: 'GG-CL-017', name: 'Weekly Deep Clean Verification', linked_sop: 'GG-GMP-002', primus_ref: '5.14.04-06', facility_type: 'All', frequency: 'Weekly', item_count: 25, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-018', name: 'Monthly Food Safety Committee Meeting Checklist', linked_sop: 'GG-FSMS-001', primus_ref: '1.01.04', facility_type: 'All (corporate)', frequency: 'Monthly', item_count: 10, requires_photos: 0, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-019', name: 'Organic Input Verification Check', linked_sop: 'GG-ORG-003', primus_ref: '1.06.01-04', facility_type: 'All Organic', frequency: 'Per receipt', item_count: 8, requires_photos: 1, requires_signoff: 1, phase: 'Phase 1' },
    { code: 'GG-CL-020', name: 'Semi-Annual Mock Recall Exercise', linked_sop: 'GG-FSMS-013', primus_ref: '1.07.03', facility_type: 'All (corporate)', frequency: 'Every 6 months', item_count: 15, requires_photos: 0, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-021', name: 'Monthly Pest Activity Review', linked_sop: 'GG-GMP-003', primus_ref: '5.02.01-06', facility_type: 'All', frequency: 'Monthly', item_count: 10, requires_photos: 1, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-022', name: 'Annual Management Review Checklist', linked_sop: 'GG-FSMS-018', primus_ref: '1.01.07', facility_type: 'All (corporate)', frequency: 'Annual', item_count: 15, requires_photos: 0, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-023', name: 'Internal Audit Checklist', linked_sop: 'GG-FSMS-007', primus_ref: '1.04.01-02', facility_type: 'All', frequency: 'Semi-annual minimum', item_count: 30, requires_photos: 0, requires_signoff: 1, phase: 'Phase 2' },
    { code: 'GG-CL-024', name: 'Food Safety Culture Survey', linked_sop: 'GG-FSMS-002', primus_ref: '1.01.02', facility_type: 'All', frequency: 'Annual', item_count: 20, requires_photos: 0, requires_signoff: 0, phase: 'Phase 2' },
  ];

  const checklistIds: { [key: string]: number } = {};

  for (const checklist of checklistSeeds) {
    const result = await db.execute({
      sql: `INSERT INTO checklist_templates (code, name, linked_sop, primus_ref, facility_type, frequency, item_count, requires_photos, requires_signoff, phase)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [checklist.code, checklist.name, checklist.linked_sop, checklist.primus_ref, checklist.facility_type, checklist.frequency, checklist.item_count, checklist.requires_photos, checklist.requires_signoff, checklist.phase],
    });
    const lastId = (result as any).lastInsertRowid;
    checklistIds[checklist.code] = lastId;
  }

  // SEED SOPs (43 total)
  const sopSeeds = [
    { code: 'GG-FSMS-001', title: 'Food Safety Policy & Commitment Statement', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.01.01', nop_ref: '§205.201', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-002', title: 'Food Safety Culture Assessment Program', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.01.02', nop_ref: null, sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-003', title: 'Allergen Control Program', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.01.06; 5.18.01-08', nop_ref: null, sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-004', title: 'Document Control Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.02.01-05', nop_ref: '§205.201', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-005', title: 'Master SOP Template & Creation Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.03.01-02', nop_ref: '§205.201', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-006', title: 'Corrective Action Procedure (CAP)', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.03.03-04', nop_ref: '§205.201(a)(4)', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-007', title: 'Internal Audit Program', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.04.01-02', nop_ref: '§205.201(a)(3)', sedex_ref: null, owner: 'Audit Coordinator', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-008', title: 'Calibration & Verification Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.04.05-06', nop_ref: null, sedex_ref: null, owner: 'Maintenance Supervisor', status: 'Draft', priority: 'MEDIUM' },
    { code: 'GG-FSMS-009', title: 'Product Release / Hold / Reject Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.05.01-04', nop_ref: '§205.272', sedex_ref: null, owner: 'QA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-010', title: 'Customer Complaint / Feedback Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.05.05', nop_ref: null, sedex_ref: null, owner: 'QA Manager', status: 'Draft', priority: 'MEDIUM' },
    { code: 'GG-FSMS-011', title: 'Supplier Approval & Monitoring Program', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.06.01-05', nop_ref: '§205.201(a)(2); §205.400(d)', sedex_ref: null, owner: 'Procurement / QA', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-012', title: 'Traceability & Lot Coding Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.07.01', nop_ref: '§205.201(a)(2); §205.400', sedex_ref: null, owner: 'QA / IT', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-FSMS-013', title: 'Recall / Withdrawal Program', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.07.02-03', nop_ref: '§205.201(a)(4)', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-FSMS-014', title: 'Food Fraud Prevention Plan', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.08.01', nop_ref: '§205.201', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'MEDIUM' },
    { code: 'GG-FSMS-015', title: 'Food Defense Plan', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.08.02-03, 1.08.05-06', nop_ref: null, sedex_ref: null, owner: 'Facility Manager', status: 'Draft', priority: 'MEDIUM' },
    { code: 'GG-FSMS-016', title: 'Crisis Management Plan', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.08.04', nop_ref: null, sedex_ref: null, owner: 'CEO / FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-FSMS-017', title: 'Training Management System & Matrix', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.01.05; 3.08; 5.15', nop_ref: '§205.201(a)(3)', sedex_ref: null, owner: 'HR / FSQA', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-FSMS-018', title: 'Management Review Procedure', category: 'FSMS', applies_to: 'All Facilities', primus_ref: '1.01.07', nop_ref: '§205.201(a)(4)', sedex_ref: null, owner: 'CEO / FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-001', title: 'Pre-Op Sanitation Inspection (Growing)', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.06.01', nop_ref: '§205.271', sedex_ref: null, owner: 'Growing Supervisor', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-002', title: 'Master Sanitation Schedule (Indoor Ag)', category: 'GAP', applies_to: 'Indoor Ag Facilities', primus_ref: '3.05.03-05', nop_ref: '§205.271', sedex_ref: null, owner: 'Sanitation Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-003', title: 'Pest Control Program (Growing/CEA)', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.03.01-12', nop_ref: '§205.206', sedex_ref: null, owner: 'Pest Control Coordinator', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-004', title: 'Water Management & Testing Program', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.11.01-05c', nop_ref: '§205.202', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-GAP-005', title: 'Soil Amendment & Compost Management', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.10.01-07', nop_ref: '§205.203', sedex_ref: null, owner: 'Growing Supervisor', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-006', title: 'Harvest Crew Hygiene & Sanitation', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.09.01-18', nop_ref: null, sedex_ref: null, owner: 'Growing Supervisor', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-007', title: 'Environmental Monitoring Program (CEA)', category: 'GAP', applies_to: 'Indoor Ag Facilities', primus_ref: '3.14.01-05', nop_ref: null, sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GAP-008', title: 'Chemical/Pesticide Application Program', category: 'GAP', applies_to: 'Growing Facilities', primus_ref: '3.12.01-09', nop_ref: '§205.206', sedex_ref: null, owner: 'Chemical Coordinator', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-001', title: 'Facility Pre-Op Sanitation & Foreign Material Control', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.13.08; 5.04.08', nop_ref: '§205.270', sedex_ref: null, owner: 'Sanitation Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-002', title: 'Master Sanitation Schedule & Verification', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.14.01-12', nop_ref: '§205.272', sedex_ref: null, owner: 'Sanitation Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-003', title: 'Facility Pest Control Program', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.02.01-10', nop_ref: '§205.271', sedex_ref: null, owner: 'Pest Control Coordinator', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-004', title: 'Facility Maintenance & Repair Program', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.01.01-14', nop_ref: null, sedex_ref: null, owner: 'Maintenance Supervisor', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-005', title: 'Glass & Brittle Plastic Control Program', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.14.13', nop_ref: null, sedex_ref: null, owner: 'QA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-006', title: 'Chemical Control Program (Facility)', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.04.01-09', nop_ref: '§205.272', sedex_ref: null, owner: 'Chemical Coordinator', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-007', title: 'Receiving & Shipping Procedures', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.13.01-02; 5.17.04-06', nop_ref: '§205.270', sedex_ref: null, owner: 'Warehouse Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-008', title: 'Environmental Monitoring Program (Facility)', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.16.01-04', nop_ref: null, sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-009', title: 'Cold Chain Management & Temperature Control', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.17.01-03', nop_ref: null, sedex_ref: null, owner: 'Warehouse Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-GMP-010', title: 'Personnel Hygiene & GMP Program', category: 'GMP', applies_to: 'Packing/Handling Facilities', primus_ref: '5.05.01-13', nop_ref: null, sedex_ref: null, owner: 'HR / FSQA', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-ORG-001', title: 'Organic System Plan (OSP) Management', category: 'Organic', applies_to: 'All Organic Facilities', primus_ref: 'M1 (all)', nop_ref: '§205.201(a)', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-ORG-002', title: 'Organic Integrity & Commingling Prevention', category: 'Organic', applies_to: 'All Organic Facilities', primus_ref: '5.03.01; 5.04.01', nop_ref: '§205.201(a)(1)', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'CRITICAL' },
    { code: 'GG-ORG-003', title: 'Approved Input Verification & Material Review', category: 'Organic', applies_to: 'All Organic Facilities', primus_ref: '1.06.01-04', nop_ref: '§205.201(a)(2)', sedex_ref: null, owner: 'Procurement / QA', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-ORG-004', title: 'Organic Recordkeeping & NOP Compliance', category: 'Organic', applies_to: 'All Organic Facilities', primus_ref: '1.02.02', nop_ref: '§205.400', sedex_ref: null, owner: 'FSQA Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-SC-001', title: 'Worker Welfare & Ethical Standards Program', category: 'Social', applies_to: 'All Facilities', primus_ref: null, nop_ref: null, sedex_ref: 'ETI 1-6', owner: 'HR Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-SC-002', title: 'Health & Safety Program', category: 'Social', applies_to: 'All Facilities', primus_ref: null, nop_ref: null, sedex_ref: 'ETI 7-8', owner: 'Safety Manager', status: 'Draft', priority: 'HIGH' },
    { code: 'GG-SC-003', title: 'Grievance & Whistleblower Procedure', category: 'Social', applies_to: 'All Facilities', primus_ref: null, nop_ref: null, sedex_ref: 'ETI 9-10', owner: 'HR Manager', status: 'Draft', priority: 'MEDIUM' },
  ];

  const sopIds: { [key: string]: number } = {};

  for (const sop of sopSeeds) {
    const result = await db.execute({
      sql: `INSERT INTO sop_documents (code, title, category, applies_to, primus_ref, nop_ref, sedex_ref, owner, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [sop.code, sop.title, sop.category, sop.applies_to, sop.primus_ref, sop.nop_ref, sop.sedex_ref, sop.owner, sop.status, sop.priority],
    });
    const lastId = (result as any).lastInsertRowid;
    sopIds[sop.code] = lastId;
  }

  // SEED SOP_FACILITY_STATUS for all "All Facilities" SOPs
  for (const sop of sopSeeds) {
    if (sop.applies_to === 'All Facilities') {
      const sopId = sopIds[sop.code];
      for (const facilityCode in facilityIds) {
        const facilityId = facilityIds[facilityCode];
        await db.execute({
          sql: `INSERT INTO sop_facility_status (sop_id, facility_id, status) VALUES (?, ?, 'missing')`,
          args: [sopId, facilityId],
        });
      }
    }
  }

  // SEED AUDIT QUESTIONS V2 (M1 module, first 20 questions)
  const m1Module = moduleIds['M1'];
  const m1QuestionSeeds = [
    { code: '1.01.01', text: 'Documented food safety policy detailing company commitment to food safety', points: 5, auto_fail: 0, new_v4: 0, category: 'Core Documentation', nop_ref: '§205.201', required_sop: 'Food Safety Policy Statement', frequency: 'Annual review', role: 'FSQA Manager' },
    { code: '1.01.02', text: 'Food safety culture assessment plan (communication, training, employee feedback, performance measurement)', points: 5, auto_fail: 0, new_v4: 1, category: 'Core Documentation', nop_ref: null, required_sop: 'Food Safety Culture Program', frequency: 'Annual assessment', role: 'FSQA Manager / HR' },
    { code: '1.01.03', text: 'Org chart showing all management/workers in food safety + job descriptions with FS responsibilities', points: 10, auto_fail: 0, new_v4: 0, category: 'Core Documentation', nop_ref: '§205.201(a)', required_sop: 'Org Chart + Job Descriptions', frequency: 'Update with personnel changes', role: 'HR / Facility Manager' },
    { code: '1.01.04', text: 'Food safety committee with meeting logs (topics + attendees)', points: 5, auto_fail: 0, new_v4: 0, category: 'Core Documentation', nop_ref: null, required_sop: 'FS Committee Charter + Meeting Minutes', frequency: 'Monthly minimum', role: 'FSQA Manager' },
    { code: '1.01.05', text: 'Training management system (required training by role, who trained, when, schedule)', points: 5, auto_fail: 0, new_v4: 0, category: 'Training & Education', nop_ref: '§205.201(a)(3)', required_sop: 'Training Management System/Matrix', frequency: 'Ongoing / per new hire', role: 'HR / FSQA Manager' },
    { code: '1.01.06', text: 'Documented allergen control program', points: 10, auto_fail: 0, new_v4: 1, category: 'Quality Assurance', nop_ref: null, required_sop: 'Allergen Control Program', frequency: 'Annual review + per change', role: 'FSQA Manager' },
    { code: '1.01.07', text: 'Management verification review of entire FSMS at least every 12 months + records of changes', points: 15, auto_fail: 0, new_v4: 0, category: 'Audits & Inspections', nop_ref: '§205.201(a)(4)', required_sop: 'Management Review Procedure', frequency: 'Annual minimum', role: 'CEO / FSQA Manager' },
    { code: '1.01.08', text: 'Current copy of industry guidelines/best practices for crop/product', points: 3, auto_fail: 0, new_v4: 0, category: 'Core Documentation', nop_ref: null, required_sop: 'Industry Guidelines Library', frequency: 'Update as published', role: 'FSQA Manager' },
    { code: '1.02.01', text: 'Written document control procedure with register', points: 5, auto_fail: 0, new_v4: 0, category: 'Administrative & Maintenance', nop_ref: '§205.201', required_sop: 'Document Control SOP', frequency: 'Per document change', role: 'FSQA Manager' },
    { code: '1.02.02', text: 'Records stored minimum 24 months (or shelf life if greater)', points: 3, auto_fail: 0, new_v4: 0, category: 'Traceability & Recordkeeping', nop_ref: '§205.400(f)', required_sop: 'Record Retention Policy', frequency: 'Ongoing', role: 'FSQA Manager' },
    { code: '1.02.03', text: 'Paper and electronic documents created/stored/handled securely', points: 5, auto_fail: 0, new_v4: 0, category: 'Administrative & Maintenance', nop_ref: '§205.201', required_sop: 'Document Security Procedure', frequency: 'Ongoing', role: 'IT / FSQA Manager' },
    { code: '1.02.04', text: 'Records maintained organized and retrievable', points: 3, auto_fail: 0, new_v4: 0, category: 'Administrative & Maintenance', nop_ref: '§205.201', required_sop: 'Record Organization System', frequency: 'Ongoing', role: 'FSQA Manager' },
    { code: '1.02.05', text: 'Records/test results verified by qualified person independent of completers', points: 5, auto_fail: 0, new_v4: 0, category: 'Audits & Inspections', nop_ref: null, required_sop: 'Record Verification Procedure', frequency: 'Per record completion', role: 'FSQA Supervisor' },
    { code: '1.03.01', text: 'Written standardized procedure for creating SOPs', points: 5, auto_fail: 0, new_v4: 0, category: 'General Compliance & Operations', nop_ref: '§205.201', required_sop: 'SOP for SOPs (Master SOP Template)', frequency: 'Per SOP creation/revision', role: 'FSQA Manager' },
    { code: '1.03.02', text: 'Written procedures available to users + master copy in central file', points: 5, auto_fail: 0, new_v4: 0, category: 'General Compliance & Operations', nop_ref: '§205.201', required_sop: 'Document Distribution Procedure', frequency: 'Ongoing', role: 'FSQA Manager' },
    { code: '1.03.03', text: 'Documented corrective action procedure for all non-conformances', points: 5, auto_fail: 0, new_v4: 0, category: 'General Compliance & Operations', nop_ref: '§205.201(a)(4)', required_sop: 'Corrective Action Procedure (CAP)', frequency: 'Per non-conformance', role: 'FSQA Manager' },
    { code: '1.03.04', text: 'Incident reporting system (NUOCA) + Corrective Actions Log', points: 5, auto_fail: 0, new_v4: 0, category: 'General Compliance & Operations', nop_ref: null, required_sop: 'NUOCA Procedure + Log', frequency: 'Per incident', role: 'FSQA Manager' },
    { code: '1.04.01', text: 'Internal audit program covering entire FSMS and all applicable modules', points: 10, auto_fail: 0, new_v4: 0, category: 'Audits & Inspections', nop_ref: '§205.201(a)(3)', required_sop: 'Internal Audit Program', frequency: 'At least annually', role: 'Audit Coordinator' },
    { code: '1.04.02', text: 'Internal audit evidence and records maintained with corrective actions tracked', points: 5, auto_fail: 0, new_v4: 1, category: 'Audits & Inspections', nop_ref: null, required_sop: 'Internal Audit Records', frequency: 'Per audit', role: 'Audit Coordinator' },
    { code: '1.05.01', text: 'Product release procedure with sign-off by authorized person', points: 5, auto_fail: 0, new_v4: 0, category: 'Quality Assurance', nop_ref: '§205.272', required_sop: 'Product Release Procedure', frequency: 'Per lot/batch', role: 'QA Manager' },
  ];

  for (const question of m1QuestionSeeds) {
    await db.execute({
      sql: `INSERT INTO audit_questions_v2 (module_id, question_code, question_text, points, is_auto_fail, is_new_v4, category, nop_ref, required_sop, frequency, responsible_role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [m1Module, question.code, question.text, question.points, question.auto_fail, question.new_v4, question.category, question.nop_ref, question.required_sop, question.frequency, question.role],
    });
  }

  seedData = true;
}
