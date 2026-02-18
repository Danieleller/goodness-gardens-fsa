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
      title TEXT DEFAULT '',
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
    )`,
    `CREATE TABLE IF NOT EXISTS vendor_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      item_type TEXT DEFAULT '',
      cert_file_name TEXT,
      cert_file_data TEXT,
      cert_content_type TEXT,
      expiration_date TEXT,
      notification_email TEXT,
      notification_sent INTEGER DEFAULT 0,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS primus_checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_number INTEGER NOT NULL,
      module_name TEXT NOT NULL,
      module_color TEXT DEFAULT '',
      section_number TEXT NOT NULL,
      section_name TEXT NOT NULL,
      item_code TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      has_document INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS primus_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      content_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      notes TEXT DEFAULT '',
      FOREIGN KEY (item_id) REFERENCES primus_checklist_items(id)
    )`,
    // ====================================================================
    // PHASE 1: RBAC, Search, Transactions, Audit Log
    // ====================================================================
    `CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission_code TEXT NOT NULL,
      UNIQUE(role, permission_code)
    )`,
    `CREATE TABLE IF NOT EXISTS search_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      tokens TEXT,
      tags TEXT,
      facility_id INTEGER,
      url TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id)
    )`,
    `CREATE TABLE IF NOT EXISTS transaction_prefix_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_type TEXT UNIQUE NOT NULL,
      prefix TEXT NOT NULL,
      next_number INTEGER DEFAULT 100001,
      is_active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS transaction_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      facility_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'submitted',
      approved_by INTEGER,
      approved_at TEXT,
      voided_by INTEGER,
      voided_at TEXT,
      void_reason TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS transaction_print_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL,
      printed_by INTEGER NOT NULL,
      printed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (printed_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS system_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      before_value TEXT,
      after_value TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    // ====================================================================
    // PHASE 2: Document Files, Tags, Audit Findings
    // ====================================================================
    `CREATE TABLE IF NOT EXISTS sop_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL,
      version_id INTEGER,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      content_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploaded_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sop_id) REFERENCES sop_documents(id),
      FOREIGN KEY (version_id) REFERENCES sop_versions(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sop_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sop_id) REFERENCES sop_documents(id),
      UNIQUE(sop_id, tag)
    )`,
    `CREATE TABLE IF NOT EXISTS audit_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      simulation_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      finding_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence_notes TEXT,
      required_sop_code TEXT,
      is_auto_fail INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      resolved_by INTEGER,
      resolved_at TEXT,
      resolution_notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (simulation_id) REFERENCES audit_simulations(id),
      FOREIGN KEY (question_id) REFERENCES audit_questions_v2(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // ── PHASE 3: FSMS Matrix Integration ──
    `CREATE TABLE IF NOT EXISTS fsms_standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT DEFAULT '1.0',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS fsms_clauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standard_id INTEGER NOT NULL,
      clause_code TEXT NOT NULL,
      clause_title TEXT NOT NULL,
      description TEXT,
      parent_clause_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (standard_id) REFERENCES fsms_standards(id),
      FOREIGN KEY (parent_clause_id) REFERENCES fsms_clauses(id),
      UNIQUE(standard_id, clause_code)
    )`,
    `CREATE TABLE IF NOT EXISTS fsms_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clause_id INTEGER NOT NULL,
      requirement_code TEXT UNIQUE NOT NULL,
      requirement_text TEXT NOT NULL,
      criticality TEXT DEFAULT 'major',
      module_id INTEGER,
      is_required INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (clause_id) REFERENCES fsms_clauses(id),
      FOREIGN KEY (module_id) REFERENCES audit_modules(id)
    )`,
    `CREATE TABLE IF NOT EXISTS requirement_evidence_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_id INTEGER NOT NULL,
      evidence_type TEXT NOT NULL,
      evidence_id INTEGER,
      evidence_code TEXT,
      evidence_title TEXT,
      is_primary INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (requirement_id) REFERENCES fsms_requirements(id),
      UNIQUE(requirement_id, evidence_type, evidence_id)
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      assessment_date TEXT NOT NULL,
      assessment_type TEXT DEFAULT 'audit',
      scope TEXT DEFAULT 'all_modules',
      overall_score REAL,
      overall_grade TEXT,
      module_scores TEXT,
      module_statuses TEXT,
      sop_readiness_pct REAL,
      checklist_submissions_pct REAL,
      audit_coverage_pct REAL,
      critical_findings_count INTEGER DEFAULT 0,
      major_findings_count INTEGER DEFAULT 0,
      minor_findings_count INTEGER DEFAULT 0,
      assessed_by INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (assessed_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_code TEXT UNIQUE NOT NULL,
      rule_name TEXT NOT NULL,
      description TEXT,
      rule_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      condition_json TEXT NOT NULL,
      severity TEXT DEFAULT 'major',
      module_code TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_rule_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL,
      facility_id INTEGER NOT NULL,
      assessment_id INTEGER,
      status TEXT NOT NULL,
      details TEXT,
      evaluated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (rule_id) REFERENCES compliance_rules(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (assessment_id) REFERENCES compliance_assessments(id)
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_monitoring_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      frequency TEXT DEFAULT 'weekly',
      last_run TEXT,
      next_run TEXT,
      is_active INTEGER DEFAULT 1,
      notify_on_fail INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )`,
    `CREATE TABLE IF NOT EXISTS compliance_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      period_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      overall_score REAL,
      overall_grade TEXT,
      module_scores TEXT,
      sop_readiness_pct REAL,
      checklist_pct REAL,
      audit_pct REAL,
      critical_count INTEGER DEFAULT 0,
      major_count INTEGER DEFAULT 0,
      minor_count INTEGER DEFAULT 0,
      rules_passed INTEGER DEFAULT 0,
      rules_failed INTEGER DEFAULT 0,
      rules_total INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )`,
    `CREATE TABLE IF NOT EXISTS risk_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id INTEGER NOT NULL,
      module_code TEXT,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      contributing_factors TEXT,
      recommendations TEXT,
      calculated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )`,
    // ====================================================================
    // PHASE 5: Training & Certification Module + Notifications
    // ====================================================================
    `CREATE TABLE IF NOT EXISTS training_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      facility_id INTEGER,
      training_type TEXT NOT NULL,
      training_title TEXT NOT NULL,
      description TEXT,
      trainer_name TEXT,
      training_date TEXT NOT NULL,
      expiry_date TEXT,
      hours REAL DEFAULT 0,
      score REAL,
      status TEXT DEFAULT 'completed',
      certificate_file TEXT,
      module_code TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS training_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      training_type TEXT NOT NULL,
      frequency_days INTEGER,
      is_required INTEGER DEFAULT 1,
      module_code TEXT,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS worker_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cert_type TEXT NOT NULL,
      cert_name TEXT NOT NULL,
      issuing_body TEXT,
      cert_number TEXT,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      cert_file TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      facility_id INTEGER,
      notification_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      is_read INTEGER DEFAULT 0,
      is_dismissed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    )`,
    `CREATE TABLE IF NOT EXISTS app_module_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_key TEXT UNIQUE NOT NULL,
      module_name TEXT NOT NULL,
      module_group TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      description TEXT
    )`
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }

  // ── Performance indexes ──────────────────────────────────────────
  const indexes = [
    // users
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    // pre_harvest_logs
    'CREATE INDEX IF NOT EXISTS idx_phl_user ON pre_harvest_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_phl_type ON pre_harvest_logs(log_type)',
    'CREATE INDEX IF NOT EXISTS idx_phl_created ON pre_harvest_logs(created_at)',
    // chemical_applications
    'CREATE INDEX IF NOT EXISTS idx_chem_app_user ON chemical_applications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_chem_app_date ON chemical_applications(application_date)',
    // chemical_storage
    'CREATE INDEX IF NOT EXISTS idx_chem_stor_user ON chemical_storage(user_id)',
    // nonconformances
    'CREATE INDEX IF NOT EXISTS idx_nc_user ON nonconformances(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_nc_severity ON nonconformances(severity)',
    // corrective_actions
    'CREATE INDEX IF NOT EXISTS idx_ca_user ON corrective_actions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ca_nc ON corrective_actions(nonconformance_id)',
    'CREATE INDEX IF NOT EXISTS idx_ca_status ON corrective_actions(status)',
    // audit_checklists
    'CREATE INDEX IF NOT EXISTS idx_ac_user ON audit_checklists(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_ac_date ON audit_checklists(audit_date)',
    // facilities
    'CREATE INDEX IF NOT EXISTS idx_fac_active ON facilities(is_active)',
    // user_facilities
    'CREATE INDEX IF NOT EXISTS idx_uf_user ON user_facilities(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_uf_fac ON user_facilities(facility_id)',
    // checklist_submissions
    'CREATE INDEX IF NOT EXISTS idx_cs_fac ON checklist_submissions(facility_id)',
    'CREATE INDEX IF NOT EXISTS idx_cs_template ON checklist_submissions(template_id)',
    'CREATE INDEX IF NOT EXISTS idx_cs_submitted ON checklist_submissions(submitted_by)',
    // sop_documents
    'CREATE INDEX IF NOT EXISTS idx_sop_status ON sop_documents(status)',
    'CREATE INDEX IF NOT EXISTS idx_sop_category ON sop_documents(category)',
    'CREATE INDEX IF NOT EXISTS idx_sop_created ON sop_documents(created_at)',
    // suppliers
    'CREATE INDEX IF NOT EXISTS idx_sup_status ON suppliers(approval_status)',
    'CREATE INDEX IF NOT EXISTS idx_sup_active ON suppliers(is_active)',
    // search_index
    'CREATE INDEX IF NOT EXISTS idx_search_type ON search_index(entity_type)',
    'CREATE INDEX IF NOT EXISTS idx_search_tokens ON search_index(tokens)',
    // system_audit_log
    'CREATE INDEX IF NOT EXISTS idx_sal_user ON system_audit_log(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sal_created ON system_audit_log(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_sal_entity ON system_audit_log(entity_type, entity_id)',
    // notifications
    'CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at)',
    // transaction_prefix_config
    'CREATE INDEX IF NOT EXISTS idx_tpc_type ON transaction_prefix_config(program_type)',
    // app_module_config
    'CREATE INDEX IF NOT EXISTS idx_amc_enabled ON app_module_config(is_enabled)',
    // audit_simulations
    'CREATE INDEX IF NOT EXISTS idx_asim_fac ON audit_simulations(facility_id)',
    'CREATE INDEX IF NOT EXISTS idx_asim_user ON audit_simulations(user_id)',
    // compliance_assessments
    'CREATE INDEX IF NOT EXISTS idx_comply_fac ON compliance_assessments(facility_id)',
    // training_records
    'CREATE INDEX IF NOT EXISTS idx_train_user ON training_records(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_train_status ON training_records(status)',
    // audit_findings
    'CREATE INDEX IF NOT EXISTS idx_af_sim ON audit_findings(simulation_id)',
    'CREATE INDEX IF NOT EXISTS idx_af_severity ON audit_findings(severity)',
    'CREATE INDEX IF NOT EXISTS idx_af_status ON audit_findings(status)',
  ];
  for (const sql of indexes) {
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
    await db.execute('ALTER TABLE facilities ADD COLUMN internal_id INTEGER');
  } catch (_e) {
    // Column already exists, ignore
  }

  // Migrate: add title column to users if it doesn't exist
  try {
    await db.execute("ALTER TABLE users ADD COLUMN title TEXT DEFAULT ''");
  } catch (_e) {
    // Column already exists, ignore
  }

  // Seed PrimusGFS v4.0 checklist items if not already present
  const primusCheck = await db.execute({ sql: 'SELECT COUNT(*) as count FROM primus_checklist_items', args: [] });
  const primusCount = (primusCheck.rows[0] as any)?.count || 0;
  if (primusCount === 0) {
    const primusItems = [
      // MODULE 1 – FOOD SAFETY MANAGEMENT SYSTEM (FSMS/General GMP) #3B82F6 blue
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.01', itemName: 'Food Safety Policy (signed & current)', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.02', itemName: 'Scope of Certification Defined', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.03', itemName: 'Organizational Chart', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.04', itemName: 'Roles & Responsibilities Documented', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.05', itemName: 'Annual Management Review Performed', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.06', itemName: 'Food Safety Objectives Established', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.1', sectionName: 'Management Commitment', itemCode: '1.1.07', itemName: 'Resources Allocated', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.01', itemName: 'Document Control Procedure', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.02', itemName: 'Master Document List', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.03', itemName: 'SOP & Document Control System', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.04', itemName: 'Obsolete Document Control', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.05', itemName: 'Record Retention Defined', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.2', sectionName: 'Document Control', itemCode: '1.2.06', itemName: 'Document Control Log', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.3', sectionName: 'Internal Audit', itemCode: '1.3.01', itemName: 'Internal Audit Program', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.3', sectionName: 'Internal Audit', itemCode: '1.3.02', itemName: 'Annual Audit Conducted', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.3', sectionName: 'Internal Audit', itemCode: '1.3.03', itemName: 'Audit Checklist Available', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.3', sectionName: 'Internal Audit', itemCode: '1.3.04', itemName: 'Findings Documented', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.3', sectionName: 'Internal Audit', itemCode: '1.3.05', itemName: 'Corrective Actions Closed', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.4', sectionName: 'Corrective Action', itemCode: '1.4.01', itemName: 'Corrective Action Procedure', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.4', sectionName: 'Corrective Action', itemCode: '1.4.02', itemName: 'Root Cause Analysis Method Defined', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.4', sectionName: 'Corrective Action', itemCode: '1.4.03', itemName: 'CAPA Records Maintained', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.4', sectionName: 'Corrective Action', itemCode: '1.4.04', itemName: 'Effectiveness Verification Documented', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.4', sectionName: 'Corrective Action', itemCode: '1.4.05', itemName: 'Corrective Action Form', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.5', sectionName: 'Food Defense', itemCode: '1.5.01', itemName: 'Food Defense Plan', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.5', sectionName: 'Food Defense', itemCode: '1.5.02', itemName: 'Food Defense Assessment', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.5', sectionName: 'Food Defense', itemCode: '1.5.03', itemName: 'Facility Access Controls', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.5', sectionName: 'Food Defense', itemCode: '1.5.04', itemName: 'Visitor Management', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.5', sectionName: 'Food Defense', itemCode: '1.5.05', itemName: 'Mitigation Strategies', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.6', sectionName: 'Food Fraud', itemCode: '1.6.01', itemName: 'Food Fraud Risk Assessment', hasDocument: 1 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.6', sectionName: 'Food Fraud', itemCode: '1.6.02', itemName: 'Supplier Vulnerability Review', hasDocument: 0 },
      { moduleNumber: 1, moduleName: 'Food Safety Management System (FSMS/General GMP)', moduleColor: '#3B82F6', sectionNumber: '1.6', sectionName: 'Food Fraud', itemCode: '1.6.03', itemName: 'Mitigation Strategy Documented', hasDocument: 0 },
      // MODULE 2 – TRACEABILITY & RECALL #22C55E green
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.1', sectionName: 'Lot Identification', itemCode: '2.1.01', itemName: 'Lot Coding System Documented', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.1', sectionName: 'Lot Identification', itemCode: '2.1.02', itemName: 'Product Code List', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.1', sectionName: 'Lot Identification', itemCode: '2.1.03', itemName: 'Field/Area Identification', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.2', sectionName: 'Traceability', itemCode: '2.2.01', itemName: 'Traceability SOP', hasDocument: 1 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.2', sectionName: 'Traceability', itemCode: '2.2.02', itemName: 'Backward Trace to Raw Source', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.2', sectionName: 'Traceability', itemCode: '2.2.03', itemName: 'Forward Trace to Customer', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.2', sectionName: 'Traceability', itemCode: '2.2.04', itemName: 'Trace Completed Within 2 Hours', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.3', sectionName: 'Mock Recall', itemCode: '2.3.01', itemName: 'Annual Mock Recall Form', hasDocument: 1 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.3', sectionName: 'Mock Recall', itemCode: '2.3.02', itemName: 'Mock Recall Time Documented', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.3', sectionName: 'Mock Recall', itemCode: '2.3.03', itemName: 'Mock Recall Effectiveness Reviewed', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.01', itemName: 'Recall Procedure', hasDocument: 1 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.02', itemName: 'Recall Team List', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.03', itemName: 'Regulatory Contact List', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.04', itemName: 'Customer Notification Template', hasDocument: 1 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.05', itemName: 'Product Withdrawal Process', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.06', itemName: 'Recall Form', hasDocument: 0 },
      { moduleNumber: 2, moduleName: 'Traceability & Recall', moduleColor: '#22C55E', sectionNumber: '2.4', sectionName: 'Recall Program', itemCode: '2.4.07', itemName: 'Recall Inventory Log', hasDocument: 1 },
      // MODULE 3 – TRAINING #22C55E green
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.1', sectionName: 'Training Program', itemCode: '3.1.01', itemName: 'Training Matrix by Job Role', hasDocument: 1 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.1', sectionName: 'Training Program', itemCode: '3.1.02', itemName: 'New Hire Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.1', sectionName: 'Training Program', itemCode: '3.1.03', itemName: 'Annual Refresher Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.2', sectionName: 'GMP Training', itemCode: '3.2.01', itemName: 'Personal Hygiene Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.2', sectionName: 'GMP Training', itemCode: '3.2.02', itemName: 'Illness Reporting Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.2', sectionName: 'GMP Training', itemCode: '3.2.03', itemName: 'PPE Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.2', sectionName: 'GMP Training', itemCode: '3.2.04', itemName: 'Visitor Control Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.3', sectionName: 'Job-Specific Training', itemCode: '3.3.01', itemName: 'Equipment Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.3', sectionName: 'Job-Specific Training', itemCode: '3.3.02', itemName: 'Chemical Handling Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.3', sectionName: 'Job-Specific Training', itemCode: '3.3.03', itemName: 'HACCP/Preventive Controls Training', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.4', sectionName: 'Training Records', itemCode: '3.4.01', itemName: 'Training Sign-In Sheets', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.4', sectionName: 'Training Records', itemCode: '3.4.02', itemName: 'Competency Verification', hasDocument: 0 },
      { moduleNumber: 3, moduleName: 'Training', moduleColor: '#22C55E', sectionNumber: '3.4', sectionName: 'Training Records', itemCode: '3.4.03', itemName: 'Supervisor Verification', hasDocument: 0 },
      // MODULE 4 – FARM OPERATIONS #22C55E green
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.1', sectionName: 'Pre-Harvest Risk Assessment', itemCode: '4.1.01', itemName: 'Flooding Assessment', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.1', sectionName: 'Pre-Harvest Risk Assessment', itemCode: '4.1.02', itemName: 'Animal Intrusion Inspection', hasDocument: 1 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.1', sectionName: 'Pre-Harvest Risk Assessment', itemCode: '4.1.03', itemName: 'Adjacent Land Use Review', hasDocument: 1 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.1', sectionName: 'Pre-Harvest Risk Assessment', itemCode: '4.1.04', itemName: 'Pre/Post Harvest Checklist', hasDocument: 1 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.2', sectionName: 'Field Sanitation', itemCode: '4.2.01', itemName: 'Toilets (1 per 20 workers)', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.2', sectionName: 'Field Sanitation', itemCode: '4.2.02', itemName: 'Handwashing Stations', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.2', sectionName: 'Field Sanitation', itemCode: '4.2.03', itemName: 'Restroom Service Logs', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.2', sectionName: 'Field Sanitation', itemCode: '4.2.04', itemName: 'Sanitation Supplies Available', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.2', sectionName: 'Field Sanitation', itemCode: '4.2.05', itemName: 'Sanitation Practices', hasDocument: 1 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.3', sectionName: 'Harvest Operations', itemCode: '4.3.01', itemName: 'Harvest SOP', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.3', sectionName: 'Harvest Operations', itemCode: '4.3.02', itemName: 'Tool Sanitation', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.3', sectionName: 'Harvest Operations', itemCode: '4.3.03', itemName: 'Container Sanitation', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.3', sectionName: 'Harvest Operations', itemCode: '4.3.04', itemName: 'Harvest Logs', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.4', sectionName: 'Soil Amendments', itemCode: '4.4.01', itemName: 'Compost Documentation', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.4', sectionName: 'Soil Amendments', itemCode: '4.4.02', itemName: 'Raw Manure Interval (90/120 Day)', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.4', sectionName: 'Soil Amendments', itemCode: '4.4.03', itemName: 'Soil Amendment Application Logs', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.5', sectionName: 'Agricultural Water', itemCode: '4.5.01', itemName: 'Water Source Identification', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.5', sectionName: 'Agricultural Water', itemCode: '4.5.02', itemName: 'Water Testing Results', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.5', sectionName: 'Agricultural Water', itemCode: '4.5.03', itemName: 'Water Corrective Actions', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.5', sectionName: 'Agricultural Water', itemCode: '4.5.04', itemName: 'Irrigation Method Documented', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.6', sectionName: 'Equipment & Tools', itemCode: '4.6.01', itemName: 'Equipment Cleaning SOP', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.6', sectionName: 'Equipment & Tools', itemCode: '4.6.02', itemName: 'Cleaning Logs', hasDocument: 0 },
      { moduleNumber: 4, moduleName: 'Farm Operations', moduleColor: '#22C55E', sectionNumber: '4.6', sectionName: 'Equipment & Tools', itemCode: '4.6.03', itemName: 'Maintenance Documentation', hasDocument: 0 },
      // MODULE 5 – GREENHOUSE #A855F7 purple
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.1', sectionName: 'Environmental Controls', itemCode: '5.1.01', itemName: 'Temperature Monitoring', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.1', sectionName: 'Environmental Controls', itemCode: '5.1.02', itemName: 'Humidity Monitoring', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.1', sectionName: 'Environmental Controls', itemCode: '5.1.03', itemName: 'Ventilation Control', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.2', sectionName: 'Water & Nutrient Management', itemCode: '5.2.01', itemName: 'Water Testing', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.2', sectionName: 'Water & Nutrient Management', itemCode: '5.2.02', itemName: 'Nutrient Solution Monitoring', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.2', sectionName: 'Water & Nutrient Management', itemCode: '5.2.03', itemName: 'pH/EC Logs', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.3', sectionName: 'IPM', itemCode: '5.3.01', itemName: 'Integrated Pest Management Program', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.3', sectionName: 'IPM', itemCode: '5.3.02', itemName: 'Pesticide Application Logs', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.3', sectionName: 'IPM', itemCode: '5.3.03', itemName: 'Approved Chemical List', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.4', sectionName: 'Cleaning & Sanitation', itemCode: '5.4.01', itemName: 'Growing Area Cleaning SOP', hasDocument: 0 },
      { moduleNumber: 5, moduleName: 'Greenhouse', moduleColor: '#A855F7', sectionNumber: '5.4', sectionName: 'Cleaning & Sanitation', itemCode: '5.4.02', itemName: 'System Cleaning Documentation', hasDocument: 0 },
      // MODULE 6 – FACILITY GMP (PACKHOUSE) #EAB308 yellow
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.1', sectionName: 'Personnel Practices', itemCode: '6.1.01', itemName: 'Hygiene Policy', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.1', sectionName: 'Personnel Practices', itemCode: '6.1.02', itemName: 'Illness Reporting', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.1', sectionName: 'Personnel Practices', itemCode: '6.1.03', itemName: 'Return-to-Work Policy', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.1', sectionName: 'Personnel Practices', itemCode: '6.1.04', itemName: 'Jewelry Policy', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.1', sectionName: 'Personnel Practices', itemCode: '6.1.05', itemName: 'Handwashing Compliance', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.2', sectionName: 'Glass & Brittle Plastic', itemCode: '6.2.01', itemName: 'Glass Register', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.2', sectionName: 'Glass & Brittle Plastic', itemCode: '6.2.02', itemName: 'Inspection Schedule', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.2', sectionName: 'Glass & Brittle Plastic', itemCode: '6.2.03', itemName: 'Breakage Procedure', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.2', sectionName: 'Glass & Brittle Plastic', itemCode: '6.2.04', itemName: 'Breakage Log', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.2', sectionName: 'Glass & Brittle Plastic', itemCode: '6.2.05', itemName: 'Glass & Brittle Plastic Policy', hasDocument: 1 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.3', sectionName: 'Pest Control', itemCode: '6.3.01', itemName: 'Pest Control Contract', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.3', sectionName: 'Pest Control', itemCode: '6.3.02', itemName: 'Trap Map', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.3', sectionName: 'Pest Control', itemCode: '6.3.03', itemName: 'Trap Inspection Logs', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.3', sectionName: 'Pest Control', itemCode: '6.3.04', itemName: 'Pest Sighting Log', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.3', sectionName: 'Pest Control', itemCode: '6.3.05', itemName: 'Pest Corrective Action Log', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.4', sectionName: 'Facility Maintenance', itemCode: '6.4.01', itemName: 'Building Condition', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.4', sectionName: 'Facility Maintenance', itemCode: '6.4.02', itemName: 'Floors/Walls/Ceilings Intact', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.4', sectionName: 'Facility Maintenance', itemCode: '6.4.03', itemName: 'Drainage Adequate', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.4', sectionName: 'Facility Maintenance', itemCode: '6.4.04', itemName: 'Lighting Protected', hasDocument: 0 },
      { moduleNumber: 6, moduleName: 'Facility GMP (Packhouse)', moduleColor: '#EAB308', sectionNumber: '6.4', sectionName: 'Facility Maintenance', itemCode: '6.4.05', itemName: 'Airflow Appropriate', hasDocument: 0 },
      // MODULE 7 – SANITATION #EAB308 yellow
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.1', sectionName: 'Sanitation Program', itemCode: '7.1.01', itemName: 'Master Sanitation Schedule', hasDocument: 1 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.1', sectionName: 'Sanitation Program', itemCode: '7.1.02', itemName: 'SSOPs for All Equipment', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.1', sectionName: 'Sanitation Program', itemCode: '7.1.03', itemName: 'Pre-Operational Inspections', hasDocument: 1 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.1', sectionName: 'Sanitation Program', itemCode: '7.1.04', itemName: 'Cleaning Logs', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.1', sectionName: 'Sanitation Program', itemCode: '7.1.05', itemName: 'Cleaning & Sanitation Policy', hasDocument: 1 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.2', sectionName: 'Chemical Control', itemCode: '7.2.01', itemName: 'Chemical Inventory', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.2', sectionName: 'Chemical Control', itemCode: '7.2.02', itemName: 'SDS Available', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.2', sectionName: 'Chemical Control', itemCode: '7.2.03', itemName: 'Locked Storage', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.2', sectionName: 'Chemical Control', itemCode: '7.2.04', itemName: 'Dilution Procedures', hasDocument: 0 },
      { moduleNumber: 7, moduleName: 'Sanitation', moduleColor: '#EAB308', sectionNumber: '7.2', sectionName: 'Chemical Control', itemCode: '7.2.05', itemName: 'Concentration Verification', hasDocument: 0 },
      // MODULE 8 – ENVIRONMENTAL MONITORING #EAB308 yellow
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.01', itemName: 'Zone Map (1-4)', hasDocument: 0 },
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.02', itemName: 'Swabbing Schedule', hasDocument: 0 },
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.03', itemName: 'Target Organisms Defined', hasDocument: 0 },
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.04', itemName: 'Lab Accreditation Verified', hasDocument: 0 },
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.05', itemName: 'Trend Analysis Documented', hasDocument: 0 },
      { moduleNumber: 8, moduleName: 'Environmental Monitoring', moduleColor: '#EAB308', sectionNumber: '8.1', sectionName: 'Environmental Monitoring', itemCode: '8.1.06', itemName: 'Positive Result Corrective Actions', hasDocument: 0 },
      // MODULE 9 – TEMPERATURE & CALIBRATION #EAB308 yellow
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.01', itemName: 'Temperature Monitoring SOP', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.02', itemName: 'Cooler Logs', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.03', itemName: 'Freezer Logs', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.04', itemName: 'Packing Area Temperature Logs', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.05', itemName: 'Temperature Corrective Action Documentation', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.06', itemName: 'Calibration Schedule', hasDocument: 0 },
      { moduleNumber: 9, moduleName: 'Temperature & Calibration', moduleColor: '#EAB308', sectionNumber: '9.1', sectionName: 'Temperature & Calibration', itemCode: '9.1.07', itemName: 'Calibration Records', hasDocument: 0 },
      // MODULE 10 – RECEIVING & SHIPPING #EAB308 yellow
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.1', sectionName: 'Receiving', itemCode: '10.1.01', itemName: 'Incoming Inspection SOP', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.1', sectionName: 'Receiving', itemCode: '10.1.02', itemName: 'Trailer Inspection Logs', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.1', sectionName: 'Receiving', itemCode: '10.1.03', itemName: 'Temperature Verification', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.1', sectionName: 'Receiving', itemCode: '10.1.04', itemName: 'Rejection Procedure', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.2', sectionName: 'Shipping', itemCode: '10.2.01', itemName: 'Shipping SOP', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.2', sectionName: 'Shipping', itemCode: '10.2.02', itemName: 'Lot Code Verification', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.2', sectionName: 'Shipping', itemCode: '10.2.03', itemName: 'Seal Verification', hasDocument: 0 },
      { moduleNumber: 10, moduleName: 'Receiving & Shipping', moduleColor: '#EAB308', sectionNumber: '10.2', sectionName: 'Shipping', itemCode: '10.2.04', itemName: 'Bill of Lading Control', hasDocument: 0 },
      // MODULE 11 – HACCP / PREVENTIVE CONTROLS #EF4444 red
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.01', itemName: 'Hazard Analysis', hasDocument: 1 },
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.02', itemName: 'Process Flow Diagrams', hasDocument: 1 },
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.03', itemName: 'CCP Determination', hasDocument: 0 },
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.04', itemName: 'CCP Monitoring Logs', hasDocument: 0 },
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.05', itemName: 'Verification Records', hasDocument: 0 },
      { moduleNumber: 11, moduleName: 'HACCP / Preventive Controls', moduleColor: '#EF4444', sectionNumber: '11.1', sectionName: 'HACCP Program', itemCode: '11.1.06', itemName: 'Validation Documentation', hasDocument: 0 },
      // MODULE 12 – ORGANIC / NOP #059669 emerald
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.1', sectionName: 'Organic Traceability (NOP)', itemCode: '12.1.01', itemName: 'Organic Sales Records', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.1', sectionName: 'Organic Traceability (NOP)', itemCode: '12.1.02', itemName: 'Organic Certificates from Suppliers', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.1', sectionName: 'Organic Traceability (NOP)', itemCode: '12.1.03', itemName: 'Organic Lot Verification Documentation', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.2', sectionName: 'Organic Training (NOP)', itemCode: '12.2.01', itemName: 'Organic Compliance Training Records', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.2', sectionName: 'Organic Training (NOP)', itemCode: '12.2.02', itemName: 'OSP Training Acknowledgment', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.01', itemName: 'Organic System Plan (OSP)', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.02', itemName: 'OSP Amendments', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.03', itemName: 'Buffer Zone Map', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.04', itemName: 'Approved Inputs Master List', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.05', itemName: 'Input Approval Letters', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.06', itemName: 'Input Application Logs', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.07', itemName: 'Plastic Mulch Removal Log', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.3', sectionName: 'Organic Integrity (NOP – Field)', itemCode: '12.3.08', itemName: 'Certifier Communication Log', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.4', sectionName: 'Organic Greenhouse (NOP)', itemCode: '12.4.01', itemName: 'NOP-Compliant Growing Media Documentation', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.4', sectionName: 'Organic Greenhouse (NOP)', itemCode: '12.4.02', itemName: 'Organic Pesticide Approval Records', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.5', sectionName: 'Organic Shipping (NOP)', itemCode: '12.5.01', itemName: 'Organic Certificate Verification', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.5', sectionName: 'Organic Shipping (NOP)', itemCode: '12.5.02', itemName: 'Organic Shipping Records', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.5', sectionName: 'Organic Shipping (NOP)', itemCode: '12.5.03', itemName: 'Organic Label Approval Records', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.6', sectionName: 'Organic Packhouse', itemCode: '12.6.01', itemName: 'Organic Segregation Procedures', hasDocument: 0 },
      { moduleNumber: 12, moduleName: 'Organic / NOP', moduleColor: '#059669', sectionNumber: '12.6', sectionName: 'Organic Packhouse', itemCode: '12.6.02', itemName: 'Organic Cleaning Verification', hasDocument: 0 },
    ];

    let sortOrder = 1;
    for (const item of primusItems) {
      await db.execute({
        sql: `INSERT INTO primus_checklist_items (module_number, module_name, module_color, section_number, section_name, item_code, item_name, has_document, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [item.moduleNumber, item.moduleName, item.moduleColor, item.sectionNumber, item.sectionName, item.itemCode, item.itemName, item.hasDocument, sortOrder],
      });
      sortOrder++;
    }
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
    // Clean up: remove facilities that were added by mistake
    for (const code of ['CORP', 'GH', 'TV', 'PU']) {
      await db.execute({ sql: 'DELETE FROM facilities WHERE code = ?', args: [code] });
    }
    // Still run Phase 1 seeds on existing installations
    await seedPhase1(db);
    // Run Phase 3 seeds (M2-M9 questions, FSMS standards, requirements, evidence links)
    await seedPhase3(db);
    // Run Phase 4 seeds (compliance rules)
    await seedPhase4(db);
    // Run Phase 5 seeds (training requirements, notifications)
    await seedPhase5(db);
    // Run Phase 6 seeds (app module configuration)
    await seedPhase6(db);
    // Index all users for global search
    await seedUserSearchIndex(db);
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

  // SEED CHECKLIST ITEMS for each template
  const checklistItemSeeds: Record<string, { text: string; critical: boolean }[]> = {
    'GG-CL-001': [
      { text: 'All food contact surfaces cleaned and sanitized', critical: true },
      { text: 'Floors swept and mopped, no standing water', critical: false },
      { text: 'Drains clear and flowing properly', critical: false },
      { text: 'Walls and ceilings free of condensation/mold', critical: false },
      { text: 'All equipment properly assembled after cleaning', critical: true },
      { text: 'Sanitizer concentration at proper levels', critical: true },
      { text: 'Hand wash stations stocked (soap, paper towels)', critical: true },
      { text: 'Foot baths/sanitizer mats in place and effective', critical: false },
      { text: 'No pest activity observed', critical: true },
      { text: 'Waste bins emptied and clean', critical: false },
      { text: 'Light shields/covers intact', critical: false },
      { text: 'No foreign materials on or near food contact surfaces', critical: true },
      { text: 'Chemical storage area organized and labeled', critical: false },
      { text: 'PPE available and in good condition', critical: false },
      { text: 'No off-odors detected in production area', critical: false },
      { text: 'Cooling units at proper temperature', critical: true },
      { text: 'Loading dock clean and free of debris', critical: false },
      { text: 'Air curtains/strip curtains functional', critical: false },
      { text: 'Employee break room clean', critical: false },
      { text: 'Pre-op completed and documented before production start', critical: true },
    ],
    'GG-CL-017': [
      { text: 'All production equipment disassembled and deep cleaned', critical: true },
      { text: 'Conveyor belts removed and cleaned underneath', critical: true },
      { text: 'All drains dismantled and scrubbed', critical: true },
      { text: 'Walls washed from ceiling to floor', critical: false },
      { text: 'Ceiling tiles/panels inspected for damage', critical: false },
      { text: 'Light fixtures cleaned and shields intact', critical: false },
      { text: 'Cold storage units defrosted and cleaned', critical: false },
      { text: 'All gaskets and seals inspected and cleaned', critical: false },
      { text: 'Floor grout/joints scrubbed and sanitized', critical: false },
      { text: 'Condensation eliminated from overhead structures', critical: true },
      { text: 'Air handling units filters checked/replaced', critical: false },
      { text: 'Pest control devices inspected and cleaned', critical: false },
      { text: 'Chemical storage area reorganized', critical: false },
      { text: 'Sanitizer concentration verified post-clean', critical: true },
      { text: 'ATP/swab testing completed on all critical surfaces', critical: true },
      { text: 'All hand wash stations deep cleaned', critical: false },
      { text: 'Loading dock/receiving area power washed', critical: false },
      { text: 'Waste/recycling area deep cleaned', critical: false },
      { text: 'Break room and restrooms deep cleaned', critical: false },
      { text: 'Tool storage cleaned and organized', critical: false },
      { text: 'Exterior perimeter checked for pest entry points', critical: false },
      { text: 'Fire extinguishers inspected and accessible', critical: false },
      { text: 'Emergency exits clear and operational', critical: false },
      { text: 'Deep clean log completed and signed', critical: true },
      { text: 'Supervisor verification walkthrough completed', critical: true },
    ],
    'GG-CL-021': [
      { text: 'All interior trap stations inspected', critical: false },
      { text: 'All exterior bait stations inspected', critical: false },
      { text: 'Fly light traps checked and insects counted', critical: false },
      { text: 'Pest control service report reviewed', critical: false },
      { text: 'No new pest evidence (droppings, gnaw marks, nesting)', critical: true },
      { text: 'Entry points sealed and maintained', critical: false },
      { text: 'Landscaping trimmed away from building', critical: false },
      { text: 'Standing water eliminated around facility', critical: false },
      { text: 'Waste management areas clean and pest-free', critical: false },
      { text: 'Pest trend analysis updated', critical: false },
    ],
    'GG-CL-024': [
      { text: 'Management demonstrates commitment to food safety', critical: false },
      { text: 'Food safety policies are clearly communicated to all employees', critical: false },
      { text: 'Employees understand their role in food safety', critical: false },
      { text: 'Training is regular and adequate for all levels', critical: false },
      { text: 'Employees feel comfortable reporting food safety concerns', critical: true },
      { text: 'Near-misses and concerns are investigated promptly', critical: false },
      { text: 'Resources for food safety are adequate', critical: false },
      { text: 'Food safety rules are consistently enforced', critical: false },
      { text: 'Good practices are recognized and rewarded', critical: false },
      { text: 'Cross-functional collaboration on food safety is effective', critical: false },
      { text: 'Corrective actions are implemented in a timely manner', critical: false },
      { text: 'Communication about food safety changes is timely', critical: false },
      { text: 'New employees receive adequate food safety onboarding', critical: false },
      { text: 'Employees have access to updated food safety procedures', critical: false },
      { text: 'Personal hygiene practices are consistently followed', critical: true },
      { text: 'Work environment supports food safety compliance', critical: false },
      { text: 'Equipment is properly maintained for food safety', critical: false },
      { text: 'Supplier food safety standards are communicated', critical: false },
      { text: 'Continuous improvement in food safety is visible', critical: false },
      { text: 'Overall food safety culture rating (1-5)', critical: false },
    ],
  };

  // Generate generic items for templates not explicitly defined above
  for (const checklist of checklistSeeds) {
    const templateId = checklistIds[checklist.code];
    const explicitItems = checklistItemSeeds[checklist.code];

    if (explicitItems) {
      for (let i = 0; i < explicitItems.length; i++) {
        await db.execute({
          sql: `INSERT INTO checklist_items (template_id, item_number, item_text, item_type, is_critical, sort_order)
                VALUES (?, ?, ?, 'pass_fail', ?, ?)`,
          args: [templateId, i + 1, explicitItems[i].text, explicitItems[i].critical ? 1 : 0, i + 1],
        });
      }
    } else {
      // Generate generic items based on template name and item_count
      const itemCount = checklist.item_count;
      for (let i = 1; i <= itemCount; i++) {
        const isCritical = i <= Math.ceil(itemCount * 0.2) ? 1 : 0; // First 20% are critical
        await db.execute({
          sql: `INSERT INTO checklist_items (template_id, item_number, item_text, item_type, is_critical, sort_order)
                VALUES (?, ?, ?, 'pass_fail', ?, ?)`,
          args: [templateId, i, `${checklist.name} - Item ${i}`, isCritical, i],
        });
      }
    }
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

  // ====================================================================
  // PHASE 1: Seed RBAC permissions, transaction prefixes, migrate roles
  // ====================================================================
  await seedPhase1(db);
  await seedPhase3(db);
  await seedPhase4(db);
  await seedPhase5(db);
  await seedPhase6(db);
  await seedUserSearchIndex(db);

  seedData = true;
}

async function seedUserSearchIndex(db: ReturnType<typeof createClient>) {
  // Index all active users for global search
  const users = await db.execute({ sql: 'SELECT id, email, first_name, last_name, title, role FROM users WHERE is_active = 1', args: [] });
  for (const row of users.rows) {
    const u = row as any;
    const tokens = [u.first_name, u.last_name, u.email, u.title, u.role].filter(Boolean).join(' ').toLowerCase();
    await db.execute({
      sql: `INSERT INTO search_index (entity_type, entity_id, title, subtitle, tokens, tags, facility_id, url, updated_at)
            VALUES ('user', ?, ?, ?, ?, ?, NULL, '/admin', datetime('now'))
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
              title = excluded.title, subtitle = excluded.subtitle, tokens = excluded.tokens,
              tags = excluded.tags, url = excluded.url, updated_at = datetime('now')`,
      args: [u.id, `${u.first_name} ${u.last_name}`, `${u.email}${u.title ? ' · ' + u.title : ''}`, tokens, `${u.email} ${u.role}`],
    });
  }
}

async function seedPhase1(db: ReturnType<typeof createClient>) {
  // --- Migrate farmer → worker ---
  await db.execute({ sql: "UPDATE users SET role = 'worker' WHERE role = 'farmer'", args: [] });

  // --- Seed permissions ---
  const permissionSeeds = [
    // Operations
    { code: 'dashboard.view', description: 'View dashboard', category: 'operations' },
    { code: 'pre_harvest.view', description: 'View pre-harvest logs', category: 'operations' },
    { code: 'pre_harvest.edit', description: 'Create/edit pre-harvest logs', category: 'operations' },
    { code: 'chemicals.view', description: 'View chemical records', category: 'operations' },
    { code: 'chemicals.edit', description: 'Create/edit chemical records', category: 'operations' },
    { code: 'checklists.view', description: 'View checklists', category: 'operations' },
    { code: 'checklists.submit', description: 'Submit checklists', category: 'operations' },
    { code: 'checklists.approve', description: 'Approve/sign-off checklists', category: 'operations' },
    { code: 'supply_master.view', description: 'View supply master', category: 'operations' },
    // Compliance
    { code: 'audit_checklist.view', description: 'View audit checklist', category: 'compliance' },
    { code: 'audit_checklist.edit', description: 'Edit audit checklist', category: 'compliance' },
    { code: 'sops.view', description: 'View SOPs', category: 'compliance' },
    { code: 'sops.edit', description: 'Create/edit SOPs', category: 'compliance' },
    { code: 'gap_analysis.view', description: 'View gap analysis', category: 'compliance' },
    { code: 'audit_simulator.view', description: 'View audit simulator', category: 'compliance' },
    { code: 'audit_simulator.run', description: 'Run audit simulations', category: 'compliance' },
    // Management
    { code: 'corrective_actions.view', description: 'View corrective actions', category: 'management' },
    { code: 'corrective_actions.edit', description: 'Create/edit corrective actions', category: 'management' },
    { code: 'suppliers.view', description: 'View suppliers', category: 'management' },
    { code: 'suppliers.edit', description: 'Create/edit suppliers', category: 'management' },
    { code: 'facilities.view', description: 'View facilities', category: 'management' },
    { code: 'facilities.edit', description: 'Edit facilities', category: 'management' },
    { code: 'reports.view', description: 'View reports', category: 'management' },
    { code: 'reports.export', description: 'Export reports', category: 'management' },
    // Admin / Setup
    { code: 'admin.users', description: 'Manage users', category: 'admin' },
    { code: 'admin.roles', description: 'Manage roles & permissions', category: 'admin' },
    { code: 'admin.setup', description: 'Access setup panel', category: 'admin' },
    { code: 'admin.audit_log', description: 'View system audit log', category: 'admin' },
    { code: 'admin.transaction_config', description: 'Configure transaction prefixes', category: 'admin' },
  ];

  for (const p of permissionSeeds) {
    try {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO permissions (code, description, category) VALUES (?, ?, ?)',
        args: [p.code, p.description, p.category],
      });
    } catch (_e) { /* ignore duplicates */ }
  }

  // --- Seed role-permission mappings ---
  const roleMap: Record<string, string[]> = {
    worker: [
      'dashboard.view', 'pre_harvest.view', 'pre_harvest.edit',
      'chemicals.view', 'chemicals.edit', 'checklists.view', 'checklists.submit',
    ],
    supervisor: [
      'dashboard.view', 'pre_harvest.view', 'pre_harvest.edit',
      'chemicals.view', 'chemicals.edit', 'checklists.view', 'checklists.submit', 'checklists.approve',
      'corrective_actions.view', 'corrective_actions.edit',
      'facilities.view', 'reports.view',
    ],
    fsqa: [
      'dashboard.view', 'pre_harvest.view', 'pre_harvest.edit',
      'chemicals.view', 'chemicals.edit', 'checklists.view', 'checklists.submit', 'checklists.approve',
      'supply_master.view',
      'audit_checklist.view', 'audit_checklist.edit', 'sops.view', 'sops.edit',
      'gap_analysis.view', 'audit_simulator.view', 'audit_simulator.run',
      'corrective_actions.view', 'corrective_actions.edit',
      'suppliers.view', 'suppliers.edit',
      'facilities.view', 'reports.view', 'reports.export',
    ],
    management: [
      'dashboard.view', 'pre_harvest.view', 'chemicals.view',
      'checklists.view', 'supply_master.view',
      'audit_checklist.view', 'sops.view', 'gap_analysis.view',
      'audit_simulator.view', 'audit_simulator.run',
      'corrective_actions.view', 'suppliers.view',
      'facilities.view', 'reports.view', 'reports.export',
    ],
    admin: permissionSeeds.map(p => p.code),
  };

  for (const [role, perms] of Object.entries(roleMap)) {
    for (const permCode of perms) {
      try {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES (?, ?)',
          args: [role, permCode],
        });
      } catch (_e) { /* ignore duplicates */ }
    }
  }

  // --- Seed transaction prefix config ---
  const prefixSeeds = [
    { program_type: 'sanitation', prefix: 'S' },
    { program_type: 'pre_harvest', prefix: 'PH' },
    { program_type: 'chemical', prefix: 'CH' },
    { program_type: 'general', prefix: 'GN' },
    { program_type: 'corrective_action', prefix: 'CA' },
    { program_type: 'audit', prefix: 'AU' },
  ];

  for (const s of prefixSeeds) {
    try {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO transaction_prefix_config (program_type, prefix) VALUES (?, ?)',
        args: [s.program_type, s.prefix],
      });
    } catch (_e) { /* ignore duplicates */ }
  }

  // --- Phase 2: Extend corrective_actions with audit_finding_id, facility_id, priority ---
  const phase2Migrations = [
    "ALTER TABLE corrective_actions ADD COLUMN audit_finding_id INTEGER",
    "ALTER TABLE corrective_actions ADD COLUMN facility_id INTEGER",
    "ALTER TABLE corrective_actions ADD COLUMN priority TEXT DEFAULT 'medium'",
    "ALTER TABLE corrective_actions ADD COLUMN due_date_source TEXT DEFAULT 'manual'",
  ];
  for (const sql of phase2Migrations) {
    try { await db.execute(sql); } catch (_e) { /* column already exists */ }
  }
}

async function seedPhase3(db: ReturnType<typeof createClient>) {
  // ====================================================================
  // PHASE 3: Seed M2-M9 audit questions, FSMS standards, clauses, requirements, and evidence links
  // ====================================================================

  // Check if M2-M9 questions already exist
  const existingQCheck = await db.execute("SELECT COUNT(*) as cnt FROM audit_questions_v2 WHERE question_code LIKE '2.%'");
  if ((existingQCheck.rows[0] as any).cnt > 0) {
    return; // Already seeded
  }

  // Get module IDs
  const moduleRows = await db.execute("SELECT id, code FROM audit_modules");
  const moduleMap: Record<string, number> = {};
  for (const r of moduleRows.rows) {
    moduleMap[(r as any).code] = (r as any).id;
  }

  // ====================================================================
  // 1. SEED M2-M9 AUDIT QUESTIONS
  // ====================================================================

  // M2 - Farm Operations (15 questions)
  const m2Questions = [
    { code: '2.01.01', text: 'Pre-plant soil testing program with documented results and corrective actions', points: 10, auto_fail: 0, category: 'Soil Management', nop_ref: '§205.203', required_sop: 'GG-GAP-001', frequency: 'Per season', role: 'Farm Manager' },
    { code: '2.01.02', text: 'Water source risk assessment and testing schedule (pre-harvest agricultural water)', points: 10, auto_fail: 1, category: 'Water Testing', nop_ref: '§205.202', required_sop: 'GG-GAP-002', frequency: 'Per season', role: 'FSQA Manager' },
    { code: '2.01.03', text: 'Biological soil amendment application records with required intervals', points: 5, auto_fail: 0, category: 'Soil Management', nop_ref: '§205.203(c)', required_sop: 'GG-GAP-001', frequency: 'Per application', role: 'Farm Manager' },
    { code: '2.01.04', text: 'Field history and adjacent land-use assessment documentation', points: 5, auto_fail: 0, category: 'Field Assessment', nop_ref: '§205.202(b)', required_sop: 'GG-GAP-003', frequency: 'Annual', role: 'Farm Manager' },
    { code: '2.02.01', text: 'Worker hygiene training records for field personnel', points: 5, auto_fail: 0, category: 'Training', nop_ref: null, required_sop: 'GG-GAP-004', frequency: 'Annual', role: 'HR/Training' },
    { code: '2.02.02', text: 'Portable toilet and handwashing station placement and maintenance logs', points: 5, auto_fail: 0, category: 'Field Sanitation', nop_ref: null, required_sop: 'GG-GAP-004', frequency: 'Daily', role: 'Field Supervisor' },
    { code: '2.02.03', text: 'Field equipment cleaning and sanitization procedures with verification', points: 5, auto_fail: 0, category: 'Equipment', nop_ref: null, required_sop: 'GG-GAP-005', frequency: 'Per use', role: 'Farm Manager' },
    { code: '2.03.01', text: 'Harvest crew health screening and illness reporting procedures', points: 10, auto_fail: 1, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'Field Supervisor' },
    { code: '2.03.02', text: 'Harvest container inspection and cleaning logs', points: 5, auto_fail: 0, category: 'Harvest', nop_ref: null, required_sop: 'GG-GAP-005', frequency: 'Per harvest', role: 'Field Supervisor' },
    { code: '2.03.03', text: 'Field-pack temperature monitoring and cold chain initiation records', points: 5, auto_fail: 0, category: 'Cold Chain', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Per harvest', role: 'Quality Technician' },
    { code: '2.04.01', text: 'Growing area wildlife and domestic animal intrusion prevention', points: 3, auto_fail: 0, category: 'Field Assessment', nop_ref: null, required_sop: 'GG-GAP-003', frequency: 'Daily', role: 'Farm Manager' },
    { code: '2.04.02', text: 'Flooding history assessment and post-flood response procedures', points: 5, auto_fail: 0, category: 'Environmental', nop_ref: null, required_sop: 'GG-GAP-003', frequency: 'Per event', role: 'FSQA Manager' },
    { code: '2.05.01', text: 'Approved crop protection product list and application records', points: 5, auto_fail: 0, category: 'Chemicals', nop_ref: '§205.206', required_sop: 'GG-GAP-006', frequency: 'Per application', role: 'Farm Manager' },
    { code: '2.05.02', text: 'Pre-harvest interval compliance verification records', points: 10, auto_fail: 1, category: 'Chemicals', nop_ref: null, required_sop: 'GG-GAP-006', frequency: 'Per harvest', role: 'FSQA Manager' },
    { code: '2.05.03', text: 'Spray equipment calibration and maintenance records', points: 3, auto_fail: 0, category: 'Equipment', nop_ref: null, required_sop: 'GG-GAP-006', frequency: 'Annual', role: 'Farm Manager' },
  ];

  // M3 - Indoor Agriculture (12 questions)
  const m3Questions = [
    { code: '3.01.01', text: 'Controlled environment agriculture (CEA) standard operating procedures', points: 5, auto_fail: 0, category: 'Core Documentation', nop_ref: null, required_sop: 'GG-GAP-007', frequency: 'Annual', role: 'CEA Manager' },
    { code: '3.01.02', text: 'Grow media sourcing verification and testing records', points: 5, auto_fail: 0, category: 'Input Verification', nop_ref: '§205.203', required_sop: 'GG-GAP-007', frequency: 'Per lot', role: 'CEA Manager' },
    { code: '3.01.03', text: 'Nutrient solution formulation and monitoring records', points: 5, auto_fail: 0, category: 'Process Control', nop_ref: null, required_sop: 'GG-GAP-007', frequency: 'Daily', role: 'CEA Technician' },
    { code: '3.02.01', text: 'Climate control system calibration and maintenance logs', points: 5, auto_fail: 0, category: 'Equipment', nop_ref: null, required_sop: 'GG-GAP-008', frequency: 'Monthly', role: 'Maintenance' },
    { code: '3.02.02', text: 'Lighting system management and photoperiod documentation', points: 3, auto_fail: 0, category: 'Process Control', nop_ref: null, required_sop: 'GG-GAP-008', frequency: 'Weekly', role: 'CEA Technician' },
    { code: '3.02.03', text: 'Air filtration and ventilation system maintenance records', points: 5, auto_fail: 0, category: 'Environmental', nop_ref: null, required_sop: 'GG-GAP-008', frequency: 'Monthly', role: 'Maintenance' },
    { code: '3.03.01', text: 'Indoor growing area sanitation schedule and verification', points: 10, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Daily', role: 'Sanitation Manager' },
    { code: '3.03.02', text: 'Water recycling system treatment and testing records', points: 5, auto_fail: 0, category: 'Water Testing', nop_ref: null, required_sop: 'GG-GAP-002', frequency: 'Weekly', role: 'Quality Technician' },
    { code: '3.04.01', text: 'Integrated pest management plan specific to indoor operations', points: 5, auto_fail: 0, category: 'Pest Management', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Monthly', role: 'CEA Manager' },
    { code: '3.04.02', text: 'Biological control agent usage and efficacy records', points: 3, auto_fail: 0, category: 'Pest Management', nop_ref: '§205.206(e)', required_sop: 'GG-GMP-009', frequency: 'Per application', role: 'CEA Technician' },
    { code: '3.05.01', text: 'Indoor harvest procedures and product handling protocols', points: 5, auto_fail: 0, category: 'Harvest', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Per harvest', role: 'CEA Manager' },
    { code: '3.05.02', text: 'Employee access controls and hygiene requirements for grow rooms', points: 5, auto_fail: 0, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'CEA Manager' },
  ];

  // M4 - Harvest Operations (18 questions)
  const m4Questions = [
    { code: '4.01.01', text: 'Harvest crew daily health screening and sign-off records', points: 10, auto_fail: 1, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'Harvest Supervisor' },
    { code: '4.01.02', text: 'Harvest equipment sanitization before and after use', points: 5, auto_fail: 0, category: 'Equipment', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Per use', role: 'Harvest Supervisor' },
    { code: '4.01.03', text: 'Personal protective equipment requirements and compliance checks', points: 3, auto_fail: 0, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'Harvest Supervisor' },
    { code: '4.02.01', text: 'Harvest lot identification and traceability system', points: 15, auto_fail: 1, category: 'Traceability', nop_ref: '§205.103', required_sop: 'GG-GMP-007', frequency: 'Per lot', role: 'Quality Manager' },
    { code: '4.02.02', text: 'Field-to-cooler time tracking and temperature logging', points: 10, auto_fail: 0, category: 'Cold Chain', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Per harvest', role: 'Quality Technician' },
    { code: '4.02.03', text: 'Product sampling and quality inspection at harvest', points: 5, auto_fail: 0, category: 'Quality', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Per lot', role: 'Quality Technician' },
    { code: '4.03.01', text: 'Harvest vehicle and transport container cleaning procedures', points: 5, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Per use', role: 'Sanitation Supervisor' },
    { code: '4.03.02', text: 'Ice and water used during harvest: source verification and testing', points: 5, auto_fail: 0, category: 'Water Testing', nop_ref: null, required_sop: 'GG-GAP-002', frequency: 'Per use', role: 'Quality Technician' },
    { code: '4.03.03', text: 'Glass and brittle materials policy in harvest areas', points: 5, auto_fail: 0, category: 'Foreign Material', nop_ref: null, required_sop: 'GG-GMP-004', frequency: 'Daily', role: 'Quality Manager' },
    { code: '4.04.01', text: 'Organic product segregation procedures during harvest', points: 10, auto_fail: 1, category: 'Organic Integrity', nop_ref: '§205.272', required_sop: 'GG-ORG-002', frequency: 'Per harvest', role: 'Organic Coordinator' },
    { code: '4.04.02', text: 'Non-conforming product handling and disposition during harvest', points: 5, auto_fail: 0, category: 'Quality', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Per event', role: 'Quality Manager' },
    { code: '4.04.03', text: 'Injured or ill worker exclusion protocol documentation', points: 10, auto_fail: 1, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Per event', role: 'HR Manager' },
    { code: '4.05.01', text: 'Harvest waste management and disposal procedures', points: 3, auto_fail: 0, category: 'Waste Management', nop_ref: null, required_sop: 'GG-GMP-010', frequency: 'Daily', role: 'Farm Manager' },
    { code: '4.05.02', text: 'End-of-harvest cleaning and facility reset procedures', points: 3, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Per season', role: 'Sanitation Supervisor' },
    { code: '4.06.01', text: 'Product recall or withdrawal mock drill during harvest season', points: 5, auto_fail: 0, category: 'Recall', nop_ref: null, required_sop: 'GG-GMP-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '4.06.02', text: 'Corrective action records for harvest deviations', points: 5, auto_fail: 0, category: 'CAPA', nop_ref: null, required_sop: 'GG-FSMS-014', frequency: 'Per event', role: 'FSQA Manager' },
    { code: '4.06.03', text: 'Supplier vehicle inspection and acceptance criteria', points: 3, auto_fail: 0, category: 'Receiving', nop_ref: null, required_sop: 'GG-GMP-005', frequency: 'Per delivery', role: 'Receiving Clerk' },
    { code: '4.06.04', text: 'Harvest season pre-operational assessment completion', points: 5, auto_fail: 0, category: 'Assessment', nop_ref: null, required_sop: 'GG-FSMS-004', frequency: 'Per season', role: 'FSQA Manager' },
  ];

  // M5 - Facility Operations (20 questions)
  const m5Questions = [
    { code: '5.01.01', text: 'Master sanitation schedule with daily, weekly, and monthly tasks', points: 10, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Daily', role: 'Sanitation Manager' },
    { code: '5.01.02', text: 'Pre-operational sanitation verification records (ATP/visual)', points: 10, auto_fail: 1, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Daily', role: 'Quality Technician' },
    { code: '5.01.03', text: 'Chemical concentration verification for sanitizers and cleaners', points: 5, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Per use', role: 'Sanitation Manager' },
    { code: '5.02.01', text: 'Facility maintenance program with preventive maintenance schedule', points: 5, auto_fail: 0, category: 'Maintenance', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Monthly', role: 'Maintenance Manager' },
    { code: '5.02.02', text: 'Roof, walls, and floor condition assessment and repair logs', points: 3, auto_fail: 0, category: 'Maintenance', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Quarterly', role: 'Maintenance Manager' },
    { code: '5.02.03', text: 'Loading dock and receiving area condition and cleanliness', points: 5, auto_fail: 0, category: 'Facility Design', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Daily', role: 'Receiving Supervisor' },
    { code: '5.03.01', text: 'Potable water system testing and backflow prevention verification', points: 10, auto_fail: 1, category: 'Water Systems', nop_ref: '§205.202', required_sop: 'GG-GAP-002', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '5.03.02', text: 'Ice machine cleaning, maintenance, and water quality records', points: 5, auto_fail: 0, category: 'Water Systems', nop_ref: null, required_sop: 'GG-GAP-002', frequency: 'Weekly', role: 'Quality Technician' },
    { code: '5.04.01', text: 'Temperature monitoring system calibration and alarm verification', points: 10, auto_fail: 0, category: 'Cold Chain', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Monthly', role: 'Quality Manager' },
    { code: '5.04.02', text: 'Cold storage temperature logs with deviation corrective actions', points: 10, auto_fail: 1, category: 'Cold Chain', nop_ref: null, required_sop: 'GG-GMP-006', frequency: 'Daily', role: 'Quality Technician' },
    { code: '5.05.01', text: 'Waste management program including organic and non-organic waste streams', points: 5, auto_fail: 0, category: 'Waste Management', nop_ref: null, required_sop: 'GG-GMP-010', frequency: 'Daily', role: 'Sanitation Manager' },
    { code: '5.05.02', text: 'Drainage system maintenance and inspection records', points: 3, auto_fail: 0, category: 'Facility Design', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Monthly', role: 'Maintenance Manager' },
    { code: '5.06.01', text: 'Employee facilities: restrooms, break rooms, locker areas condition', points: 5, auto_fail: 0, category: 'Worker Welfare', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'HR Manager' },
    { code: '5.06.02', text: 'Hand washing station adequacy and supply verification', points: 5, auto_fail: 0, category: 'Worker Health', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Daily', role: 'Quality Technician' },
    { code: '5.07.01', text: 'Foreign material control program (glass, wood, metal, plastic)', points: 10, auto_fail: 1, category: 'Foreign Material', nop_ref: null, required_sop: 'GG-GMP-004', frequency: 'Daily', role: 'Quality Manager' },
    { code: '5.07.02', text: 'Metal detector or X-ray equipment calibration and test records', points: 5, auto_fail: 0, category: 'Foreign Material', nop_ref: null, required_sop: 'GG-GMP-004', frequency: 'Per shift', role: 'Quality Technician' },
    { code: '5.08.01', text: 'Visitor and contractor access control and hygiene requirements', points: 3, auto_fail: 0, category: 'Access Control', nop_ref: null, required_sop: 'GG-GMP-003', frequency: 'Per visit', role: 'Security/Reception' },
    { code: '5.08.02', text: 'Traffic flow plan preventing cross-contamination between zones', points: 5, auto_fail: 0, category: 'Facility Design', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '5.09.01', text: 'Allergen management program with segregation and labeling controls', points: 10, auto_fail: 1, category: 'Allergen Control', nop_ref: null, required_sop: 'GG-GMP-004', frequency: 'Daily', role: 'Quality Manager' },
    { code: '5.09.02', text: 'Product labeling accuracy verification and compliance checks', points: 5, auto_fail: 0, category: 'Labeling', nop_ref: null, required_sop: 'GG-GMP-008', frequency: 'Per production run', role: 'Quality Technician' },
  ];

  // M6 - HACCP Program (15 questions)
  const m6Questions = [
    { code: '6.01.01', text: 'HACCP team composition with documented qualifications', points: 5, auto_fail: 0, category: 'HACCP Team', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.01.02', text: 'Product description and intended use documentation', points: 5, auto_fail: 0, category: 'HACCP Plan', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'Quality Manager' },
    { code: '6.01.03', text: 'Process flow diagram verified on-site with documentation', points: 5, auto_fail: 0, category: 'HACCP Plan', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.02.01', text: 'Comprehensive hazard analysis for biological, chemical, and physical hazards', points: 15, auto_fail: 1, category: 'Hazard Analysis', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.02.02', text: 'CCP identification and justification with decision tree documentation', points: 10, auto_fail: 1, category: 'CCP Management', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.02.03', text: 'Critical limits established for each CCP with scientific justification', points: 10, auto_fail: 0, category: 'CCP Management', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.03.01', text: 'CCP monitoring procedures and frequency documentation', points: 10, auto_fail: 1, category: 'CCP Monitoring', nop_ref: null, required_sop: 'GG-FSMS-009', frequency: 'Per CCP', role: 'Quality Manager' },
    { code: '6.03.02', text: 'CCP monitoring records complete and current', points: 10, auto_fail: 1, category: 'CCP Monitoring', nop_ref: null, required_sop: 'GG-FSMS-009', frequency: 'Daily', role: 'Quality Technician' },
    { code: '6.03.03', text: 'Corrective action procedures when CCP deviations occur', points: 10, auto_fail: 0, category: 'CAPA', nop_ref: null, required_sop: 'GG-FSMS-014', frequency: 'Per event', role: 'FSQA Manager' },
    { code: '6.04.01', text: 'HACCP plan verification activities schedule and records', points: 5, auto_fail: 0, category: 'Verification', nop_ref: null, required_sop: 'GG-FSMS-009', frequency: 'Monthly', role: 'FSQA Manager' },
    { code: '6.04.02', text: 'HACCP plan annual reassessment and update documentation', points: 5, auto_fail: 0, category: 'Verification', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.04.03', text: 'Validation of CCP critical limits with supporting evidence', points: 5, auto_fail: 0, category: 'Validation', nop_ref: null, required_sop: 'GG-FSMS-009', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '6.05.01', text: 'HACCP records retention policy and accessibility', points: 3, auto_fail: 0, category: 'Records', nop_ref: null, required_sop: 'GG-FSMS-004', frequency: 'Ongoing', role: 'Document Controller' },
    { code: '6.05.02', text: 'Employee HACCP training records with competency assessment', points: 5, auto_fail: 0, category: 'Training', nop_ref: null, required_sop: 'GG-FSMS-005', frequency: 'Annual', role: 'HR/Training' },
    { code: '6.05.03', text: 'HACCP plan signature and date of approval by responsible person', points: 3, auto_fail: 0, category: 'Authorization', nop_ref: null, required_sop: 'GG-FSMS-008', frequency: 'Annual', role: 'Plant Manager' },
  ];

  // M7 - Preventive Controls (12 questions)
  const m7Questions = [
    { code: '7.01.01', text: 'Written food safety plan meeting FSMA preventive controls requirements', points: 10, auto_fail: 1, category: 'Core Documentation', nop_ref: null, required_sop: 'GG-FSMS-010', frequency: 'Annual', role: 'PCQI' },
    { code: '7.01.02', text: 'Preventive Controls Qualified Individual (PCQI) designation and training', points: 10, auto_fail: 1, category: 'Authorization', nop_ref: null, required_sop: 'GG-FSMS-010', frequency: 'Current', role: 'Plant Manager' },
    { code: '7.02.01', text: 'Process preventive controls with monitoring and verification', points: 10, auto_fail: 0, category: 'Process Controls', nop_ref: null, required_sop: 'GG-FSMS-010', frequency: 'Per process', role: 'PCQI' },
    { code: '7.02.02', text: 'Allergen preventive controls including cross-contact prevention', points: 10, auto_fail: 1, category: 'Allergen Control', nop_ref: null, required_sop: 'GG-GMP-004', frequency: 'Daily', role: 'Quality Manager' },
    { code: '7.02.03', text: 'Sanitation preventive controls beyond prerequisite programs', points: 5, auto_fail: 0, category: 'Sanitation', nop_ref: null, required_sop: 'GG-GMP-001', frequency: 'Daily', role: 'Sanitation Manager' },
    { code: '7.03.01', text: 'Supply chain preventive controls for incoming materials', points: 5, auto_fail: 0, category: 'Supply Chain', nop_ref: null, required_sop: 'GG-FSMS-011', frequency: 'Per receipt', role: 'Procurement Manager' },
    { code: '7.03.02', text: 'Supplier approval program with hazard-based criteria', points: 5, auto_fail: 0, category: 'Supply Chain', nop_ref: null, required_sop: 'GG-FSMS-011', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '7.04.01', text: 'Recall plan with roles, procedures, and notification contacts', points: 10, auto_fail: 1, category: 'Recall', nop_ref: null, required_sop: 'GG-GMP-008', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '7.04.02', text: 'Mock recall exercise completed within 24-hour response', points: 5, auto_fail: 0, category: 'Recall', nop_ref: null, required_sop: 'GG-GMP-008', frequency: 'Annual', role: 'Quality Manager' },
    { code: '7.05.01', text: 'Preventive control management components: monitoring records', points: 5, auto_fail: 0, category: 'Records', nop_ref: null, required_sop: 'GG-FSMS-010', frequency: 'Daily', role: 'Quality Technician' },
    { code: '7.05.02', text: 'Corrective actions and corrections documentation for PC deviations', points: 5, auto_fail: 0, category: 'CAPA', nop_ref: null, required_sop: 'GG-FSMS-014', frequency: 'Per event', role: 'PCQI' },
    { code: '7.05.03', text: 'Reanalysis of food safety plan triggered by changes or failures', points: 3, auto_fail: 0, category: 'Verification', nop_ref: null, required_sop: 'GG-FSMS-010', frequency: 'Per event', role: 'PCQI' },
  ];

  // M8 - Grain Operations (10 questions)
  const m8Questions = [
    { code: '8.01.01', text: 'Grain receiving inspection and grading records', points: 5, auto_fail: 0, category: 'Receiving', nop_ref: null, required_sop: 'GG-GMP-005', frequency: 'Per delivery', role: 'Grain Manager' },
    { code: '8.01.02', text: 'Grain storage facility condition monitoring (temperature, moisture)', points: 10, auto_fail: 0, category: 'Storage', nop_ref: null, required_sop: 'GG-GMP-005', frequency: 'Daily', role: 'Storage Supervisor' },
    { code: '8.01.03', text: 'Mycotoxin testing program with documented results and limits', points: 10, auto_fail: 1, category: 'Testing', nop_ref: null, required_sop: 'GG-GMP-005', frequency: 'Per lot', role: 'Quality Manager' },
    { code: '8.02.01', text: 'Fumigation records with applicator certification and aeration logs', points: 5, auto_fail: 0, category: 'Pest Management', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Per treatment', role: 'Pest Operator' },
    { code: '8.02.02', text: 'Grain handler training on safe handling and contamination prevention', points: 5, auto_fail: 0, category: 'Training', nop_ref: null, required_sop: 'GG-FSMS-005', frequency: 'Annual', role: 'HR/Training' },
    { code: '8.02.03', text: 'Grain dust management and explosion prevention measures', points: 5, auto_fail: 0, category: 'Safety', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Daily', role: 'Safety Manager' },
    { code: '8.03.01', text: 'Grain lot traceability from field/supplier to customer', points: 10, auto_fail: 1, category: 'Traceability', nop_ref: null, required_sop: 'GG-GMP-007', frequency: 'Per lot', role: 'Quality Manager' },
    { code: '8.03.02', text: 'Organic grain segregation and identity preservation records', points: 10, auto_fail: 1, category: 'Organic Integrity', nop_ref: '§205.272', required_sop: 'GG-ORG-002', frequency: 'Ongoing', role: 'Organic Coordinator' },
    { code: '8.04.01', text: 'Grain cleaning equipment maintenance and inspection logs', points: 3, auto_fail: 0, category: 'Equipment', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Monthly', role: 'Maintenance Manager' },
    { code: '8.04.02', text: 'Post-harvest grain quality monitoring and shelf-life tracking', points: 5, auto_fail: 0, category: 'Quality', nop_ref: null, required_sop: 'GG-GMP-005', frequency: 'Monthly', role: 'Quality Technician' },
  ];

  // M9 - Integrated Pest Management (14 questions)
  const m9Questions = [
    { code: '9.01.01', text: 'Written IPM plan covering all facility and field areas', points: 5, auto_fail: 0, category: 'Core Documentation', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Annual', role: 'Pest Management Coordinator' },
    { code: '9.01.02', text: 'Licensed pest control operator (PCO) contract and qualifications', points: 5, auto_fail: 0, category: 'Authorization', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Annual', role: 'Facilities Manager' },
    { code: '9.02.01', text: 'Pest monitoring device placement map and inspection schedule', points: 5, auto_fail: 0, category: 'Monitoring', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Weekly', role: 'Pest Technician' },
    { code: '9.02.02', text: 'Pest monitoring inspection records and trend analysis', points: 5, auto_fail: 0, category: 'Monitoring', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Weekly', role: 'Pest Technician' },
    { code: '9.02.03', text: 'Pest activity threshold levels and escalation procedures', points: 5, auto_fail: 0, category: 'Process Control', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Per event', role: 'Pest Management Coordinator' },
    { code: '9.03.01', text: 'Pesticide application records with applicator license verification', points: 10, auto_fail: 0, category: 'Chemical Control', nop_ref: '§205.206', required_sop: 'GG-GMP-009', frequency: 'Per application', role: 'Pest Operator' },
    { code: '9.03.02', text: 'Approved pesticide/rodenticide list with SDS documentation', points: 5, auto_fail: 0, category: 'Chemical Control', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Annual', role: 'Pest Management Coordinator' },
    { code: '9.03.03', text: 'Bait station placement map and tamper-evidence inspections', points: 3, auto_fail: 0, category: 'Monitoring', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Monthly', role: 'Pest Technician' },
    { code: '9.04.01', text: 'Building exclusion measures: door sweeps, screens, gap sealing', points: 5, auto_fail: 0, category: 'Exclusion', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Quarterly', role: 'Maintenance Manager' },
    { code: '9.04.02', text: 'Exterior perimeter maintenance reducing pest harborage', points: 3, auto_fail: 0, category: 'Exclusion', nop_ref: null, required_sop: 'GG-GMP-002', frequency: 'Monthly', role: 'Facilities Manager' },
    { code: '9.05.01', text: 'Pest management corrective action records for sightings/incidents', points: 5, auto_fail: 0, category: 'CAPA', nop_ref: null, required_sop: 'GG-FSMS-014', frequency: 'Per event', role: 'Quality Manager' },
    { code: '9.05.02', text: 'Annual pest management program review and effectiveness evaluation', points: 5, auto_fail: 0, category: 'Verification', nop_ref: null, required_sop: 'GG-GMP-009', frequency: 'Annual', role: 'FSQA Manager' },
    { code: '9.05.03', text: 'Non-chemical pest control methods documentation and efficacy', points: 3, auto_fail: 0, category: 'Non-Chemical Control', nop_ref: '§205.206(e)', required_sop: 'GG-GMP-009', frequency: 'Ongoing', role: 'Pest Management Coordinator' },
    { code: '9.05.04', text: 'Pest control training for relevant staff members', points: 3, auto_fail: 0, category: 'Training', nop_ref: null, required_sop: 'GG-FSMS-005', frequency: 'Annual', role: 'HR/Training' },
  ];

  // Insert M2-M9 questions
  const allQuestions = [...m2Questions, ...m3Questions, ...m4Questions, ...m5Questions, ...m6Questions, ...m7Questions, ...m8Questions, ...m9Questions];

  for (const question of allQuestions) {
    const moduleCode = question.code.substring(0, 1);
    const moduleId = moduleMap[`M${moduleCode}`];

    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO audit_questions_v2 (module_id, question_code, question_text, points, is_auto_fail, category, nop_ref, required_sop, frequency, responsible_role)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [moduleId, question.code, question.text, question.points, question.auto_fail, question.category, question.nop_ref, question.required_sop, question.frequency, question.role],
      });
    } catch (_e) { /* ignore duplicates */ }
  }

  // ====================================================================
  // 2. SEED FSMS STANDARDS
  // ====================================================================

  const standards = [
    { code: 'PRIMUS-v4', name: 'PrimusGFS v4.0', description: 'Global food safety audit standard', version: '4.0' },
    { code: 'NOP', name: 'USDA National Organic Program', description: 'Organic certification requirements (7 CFR Part 205)', version: '2024' },
    { code: 'FSMA', name: 'FDA Food Safety Modernization Act', description: 'Produce Safety Rule and Preventive Controls', version: '2024' },
    { code: 'SEDEX', name: 'Sedex/SMETA Ethical Trade', description: 'Ethical trade assurance framework', version: '6.1' },
  ];

  const standardIds: Record<string, number> = {};

  for (const standard of standards) {
    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO fsms_standards (code, name, description, version) VALUES (?, ?, ?, ?)`,
        args: [standard.code, standard.name, standard.description, standard.version],
      });
      if ((result as any).changes > 0) {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_standards WHERE code = ?", args: [standard.code] });
        standardIds[standard.code] = (fetchResult.rows[0] as any).id;
      } else {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_standards WHERE code = ?", args: [standard.code] });
        standardIds[standard.code] = (fetchResult.rows[0] as any).id;
      }
    } catch (_e) { /* ignore duplicates */ }
  }

  // Ensure all standards were fetched
  for (const standard of standards) {
    if (!standardIds[standard.code]) {
      const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_standards WHERE code = ?", args: [standard.code] });
      if (fetchResult.rows.length > 0) {
        standardIds[standard.code] = (fetchResult.rows[0] as any).id;
      }
    }
  }

  // ====================================================================
  // 3. SEED FSMS CLAUSES (~40 PRIMUS clauses + 10 NOP clauses)
  // ====================================================================

  const primusClausesData = [
    // Section 1: Management Responsibility
    { code: '1.01', title: 'Management Responsibility & Food Safety Culture', description: 'Company commitment to food safety and culture' },
    { code: '1.02', title: 'Document & Records Control', description: 'Documentation and record management systems' },
    { code: '1.03', title: 'Procedures & Corrective Actions', description: 'SOP creation and corrective action management' },
    { code: '1.04', title: 'Internal Audits & Verification', description: 'Internal audit programs and verification activities' },
    { code: '1.05', title: 'Product Release & Feedback', description: 'Product release procedures and customer feedback' },
    { code: '1.06', title: 'Supplier Management', description: 'Supplier approval and monitoring programs' },
    { code: '1.07', title: 'Traceability & Recalls', description: 'Traceability systems and recall procedures' },
    { code: '1.08', title: 'Food Fraud & Defense', description: 'Food fraud prevention and defense programs' },
    // Section 2: Farm Operations
    { code: '2.01', title: 'Pre-Plant Assessment & Soil Management', description: 'Soil testing and field assessment' },
    { code: '2.02', title: 'Worker Hygiene & Field Sanitation', description: 'Worker training and field sanitation' },
    { code: '2.03', title: 'Harvest Operations & Cold Chain', description: 'Harvest crew and cold chain management' },
    { code: '2.04', title: 'Environmental Risk Assessment', description: 'Wildlife, flooding, and environmental risks' },
    { code: '2.05', title: 'Crop Protection & Equipment', description: 'Approved chemical products and equipment' },
    // Section 3: Indoor Agriculture
    { code: '3.01', title: 'CEA Systems & Growing Media', description: 'Indoor growing systems and media control' },
    { code: '3.02', title: 'Environmental Controls', description: 'Climate, lighting, and ventilation control' },
    { code: '3.03', title: 'Sanitation Programs (CEA)', description: 'Indoor facility sanitation' },
    { code: '3.04', title: 'Pest Management (CEA)', description: 'IPM specific to indoor operations' },
    { code: '3.05', title: 'Harvest & Personnel Access (CEA)', description: 'Indoor harvest and personnel control' },
    // Section 4: Harvest Operations
    { code: '4.01', title: 'Harvest Crew Health & Equipment', description: 'Harvest crew screening and sanitization' },
    { code: '4.02', title: 'Traceability & Cold Chain (Harvest)', description: 'Lot tracking and temperature control at harvest' },
    { code: '4.03', title: 'Transport & Water Quality (Harvest)', description: 'Transport sanitation and water testing' },
    { code: '4.04', title: 'Organic & Product Integrity', description: 'Organic segregation and worker exclusion' },
    { code: '4.05', title: 'Post-Harvest Procedures', description: 'Waste management and facility reset' },
    { code: '4.06', title: 'Harvest Readiness & Receiving', description: 'Pre-season assessment and receiving control' },
    // Section 5: Facility Operations
    { code: '5.01', title: 'Sanitation Schedules & Verification', description: 'Master sanitation programs and verification' },
    { code: '5.02', title: 'Facility Maintenance', description: 'Building condition and maintenance' },
    { code: '5.03', title: 'Water Systems', description: 'Potable water and ice systems' },
    { code: '5.04', title: 'Cold Chain Management', description: 'Temperature monitoring and cold storage' },
    { code: '5.05', title: 'Waste Management', description: 'Waste streams and disposal' },
    { code: '5.06', title: 'Employee Facilities', description: 'Worker facilities and hygiene' },
    { code: '5.07', title: 'Foreign Material Control', description: 'Glass, metal, and foreign objects control' },
    { code: '5.08', title: 'Visitor & Traffic Control', description: 'Access control and facility flow' },
    { code: '5.09', title: 'Allergen Management', description: 'Allergen segregation and labeling' },
    // Section 6: HACCP
    { code: '6.01', title: 'HACCP Team & Product Description', description: 'HACCP team and product/process documentation' },
    { code: '6.02', title: 'Hazard Analysis & CCPs', description: 'Comprehensive hazard analysis and CCP determination' },
    { code: '6.03', title: 'CCP Monitoring', description: 'CCP monitoring and corrective actions' },
    { code: '6.04', title: 'Verification & Validation', description: 'HACCP plan verification and validation' },
    { code: '6.05', title: 'HACCP Records & Training', description: 'Records management and training' },
    // Section 7: Preventive Controls
    { code: '7.01', title: 'Food Safety Plan & PCQI', description: 'FSMA food safety plan and PCQI designation' },
    { code: '7.02', title: 'Preventive Controls', description: 'Process, allergen, and sanitation controls' },
    { code: '7.03', title: 'Supply Chain Controls', description: 'Supplier programs and incoming material control' },
    { code: '7.04', title: 'Recall & Response', description: 'Recall plans and mock drills' },
    { code: '7.05', title: 'Records & Reanalysis', description: 'Management of PC records and food safety plan updates' },
    // Section 8: Grain Operations
    { code: '8.01', title: 'Grain Receiving & Storage', description: 'Grain inspection and storage monitoring' },
    { code: '8.02', title: 'Grain Safety & Handling', description: 'Fumigation, training, and dust management' },
    { code: '8.03', title: 'Grain Traceability & Organic', description: 'Lot traceability and organic integrity' },
    { code: '8.04', title: 'Grain Equipment & Quality', description: 'Equipment maintenance and quality monitoring' },
    // Section 9: IPM
    { code: '9.01', title: 'IPM Plan & Contractor Management', description: 'Written IPM plan and licensed PCO' },
    { code: '9.02', title: 'Pest Monitoring', description: 'Device placement and monitoring records' },
    { code: '9.03', title: 'Chemical & Bait Station Control', description: 'Pesticide application and bait stations' },
    { code: '9.04', title: 'Building Exclusion', description: 'Physical exclusion measures' },
    { code: '9.05', title: 'Corrective Actions & Training', description: 'Non-conformance response and training' },
  ];

  const nopClausesData = [
    { code: '205.201', title: 'Scope and Applicability (NOP)', description: 'Applicability and general requirements' },
    { code: '205.202', title: 'Water Concerns (NOP)', description: 'Water quality and testing requirements' },
    { code: '205.203', title: 'Soil & Amendment Management (NOP)', description: 'Soil amendments and composting' },
    { code: '205.204', title: 'Crop Rotation (NOP)', description: 'Crop rotation requirements' },
    { code: '205.205', title: 'Crop Output (NOP)', description: 'Crop production and output' },
    { code: '205.206', title: 'Crop Protection (NOP)', description: 'Approved pesticides and inputs' },
    { code: '205.270', title: 'Handling Scope (NOP)', description: 'Handling applicability' },
    { code: '205.271', title: 'Sanitation (NOP)', description: 'Sanitation and hygiene in handling' },
    { code: '205.272', title: 'Records & Segregation (NOP)', description: 'Organic records and segregation' },
    { code: '205.400', title: 'Organic Integrity & Labeling (NOP)', description: 'Traceability, labeling, and fraud prevention' },
  ];

  const clauseIds: Record<string, number> = {};

  // Insert PRIMUS clauses
  const primusStdId = standardIds['PRIMUS-v4'];
  for (const clause of primusClausesData) {
    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO fsms_clauses (standard_id, clause_code, clause_title, description) VALUES (?, ?, ?, ?)`,
        args: [primusStdId, clause.code, clause.title, clause.description],
      });
      if ((result as any).changes > 0) {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_clauses WHERE standard_id = ? AND clause_code = ?", args: [primusStdId, clause.code] });
        if (fetchResult.rows.length > 0) {
          clauseIds[`PRIMUS-${clause.code}`] = (fetchResult.rows[0] as any).id;
        }
      } else {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_clauses WHERE standard_id = ? AND clause_code = ?", args: [primusStdId, clause.code] });
        if (fetchResult.rows.length > 0) {
          clauseIds[`PRIMUS-${clause.code}`] = (fetchResult.rows[0] as any).id;
        }
      }
    } catch (_e) { /* ignore duplicates */ }
  }

  // Insert NOP clauses
  const nopStdId = standardIds['NOP'];
  for (const clause of nopClausesData) {
    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO fsms_clauses (standard_id, clause_code, clause_title, description) VALUES (?, ?, ?, ?)`,
        args: [nopStdId, clause.code, clause.title, clause.description],
      });
      if ((result as any).changes > 0) {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_clauses WHERE standard_id = ? AND clause_code = ?", args: [nopStdId, clause.code] });
        if (fetchResult.rows.length > 0) {
          clauseIds[`NOP-${clause.code}`] = (fetchResult.rows[0] as any).id;
        }
      } else {
        const fetchResult = await db.execute({ sql: "SELECT id FROM fsms_clauses WHERE standard_id = ? AND clause_code = ?", args: [nopStdId, clause.code] });
        if (fetchResult.rows.length > 0) {
          clauseIds[`NOP-${clause.code}`] = (fetchResult.rows[0] as any).id;
        }
      }
    } catch (_e) { /* ignore duplicates */ }
  }

  // ====================================================================
  // 4. SEED FSMS REQUIREMENTS (~200 requirements mapped from clauses)
  // ====================================================================

  const requirementsData: Array<{
    code: string;
    text: string;
    criticality: string;
    moduleCode: string;
    clauseKey: string;
  }> = [
    // M1 FSMS Requirements (map to PRIMUS 1.x clauses)
    { code: 'REQ-M1-001', text: 'Management commitment and food safety policy documented', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.01' },
    { code: 'REQ-M1-002', text: 'Document control procedure in place', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.02' },
    { code: 'REQ-M1-003', text: 'Records retention policy documented (minimum 24 months)', criticality: 'major', moduleCode: 'M1', clauseKey: 'PRIMUS-1.02' },
    { code: 'REQ-M1-004', text: 'SOP creation procedure established', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.03' },
    { code: 'REQ-M1-005', text: 'Corrective action procedure documented', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.03' },
    { code: 'REQ-M1-006', text: 'Internal audit program covering all modules', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.04' },
    { code: 'REQ-M1-007', text: 'Supplier approval program in place', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.06' },
    { code: 'REQ-M1-008', text: 'Traceability system documented', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.07' },
    { code: 'REQ-M1-009', text: 'Recall/withdrawal procedure documented', criticality: 'critical', moduleCode: 'M1', clauseKey: 'PRIMUS-1.07' },

    // M2 Farm Operations Requirements
    { code: 'REQ-M2-001', text: 'Pre-plant soil testing completed and documented', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.01' },
    { code: 'REQ-M2-002', text: 'Water risk assessment and testing schedule established', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.01' },
    { code: 'REQ-M2-003', text: 'Field history assessment documented', criticality: 'major', moduleCode: 'M2', clauseKey: 'PRIMUS-2.01' },
    { code: 'REQ-M2-004', text: 'Worker hygiene training records current', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.02' },
    { code: 'REQ-M2-005', text: 'Portable restroom and handwashing stations maintained', criticality: 'major', moduleCode: 'M2', clauseKey: 'PRIMUS-2.02' },
    { code: 'REQ-M2-006', text: 'Harvest crew health screening conducted', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.03' },
    { code: 'REQ-M2-007', text: 'Harvest containers sanitized and inspected', criticality: 'major', moduleCode: 'M2', clauseKey: 'PRIMUS-2.03' },
    { code: 'REQ-M2-008', text: 'Cold chain initiated at harvest', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.03' },
    { code: 'REQ-M2-009', text: 'Wildlife control measures in place', criticality: 'major', moduleCode: 'M2', clauseKey: 'PRIMUS-2.04' },
    { code: 'REQ-M2-010', text: 'Approved pesticides list documented', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.05' },
    { code: 'REQ-M2-011', text: 'Pre-harvest interval compliance verified', criticality: 'critical', moduleCode: 'M2', clauseKey: 'PRIMUS-2.05' },

    // M3 Indoor Agriculture Requirements
    { code: 'REQ-M3-001', text: 'CEA SOPs documented and current', criticality: 'major', moduleCode: 'M3', clauseKey: 'PRIMUS-3.01' },
    { code: 'REQ-M3-002', text: 'Grow media tested and records maintained', criticality: 'critical', moduleCode: 'M3', clauseKey: 'PRIMUS-3.01' },
    { code: 'REQ-M3-003', text: 'Nutrient solution monitored daily', criticality: 'major', moduleCode: 'M3', clauseKey: 'PRIMUS-3.01' },
    { code: 'REQ-M3-004', text: 'Climate control systems calibrated and maintained', criticality: 'major', moduleCode: 'M3', clauseKey: 'PRIMUS-3.02' },
    { code: 'REQ-M3-005', text: 'Sanitation schedule for grow rooms maintained', criticality: 'critical', moduleCode: 'M3', clauseKey: 'PRIMUS-3.03' },
    { code: 'REQ-M3-006', text: 'Water recycling system tested regularly', criticality: 'critical', moduleCode: 'M3', clauseKey: 'PRIMUS-3.03' },
    { code: 'REQ-M3-007', text: 'IPM program specific to indoor operations', criticality: 'major', moduleCode: 'M3', clauseKey: 'PRIMUS-3.04' },

    // M4 Harvest Operations Requirements
    { code: 'REQ-M4-001', text: 'Daily health screening of harvest crew', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.01' },
    { code: 'REQ-M4-002', text: 'Harvest equipment sanitized per use', criticality: 'major', moduleCode: 'M4', clauseKey: 'PRIMUS-4.01' },
    { code: 'REQ-M4-003', text: 'Lot identification and traceability system in place', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.02' },
    { code: 'REQ-M4-004', text: 'Field-to-cooler time tracked', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.02' },
    { code: 'REQ-M4-005', text: 'Transport containers cleaned and sanitized', criticality: 'major', moduleCode: 'M4', clauseKey: 'PRIMUS-4.03' },
    { code: 'REQ-M4-006', text: 'Ice and water sources verified and tested', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.03' },
    { code: 'REQ-M4-007', text: 'Organic product segregation procedures in place', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.04' },
    { code: 'REQ-M4-008', text: 'Injured/ill worker exclusion protocol established', criticality: 'critical', moduleCode: 'M4', clauseKey: 'PRIMUS-4.04' },

    // M5 Facility Operations Requirements
    { code: 'REQ-M5-001', text: 'Master sanitation schedule implemented', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.01' },
    { code: 'REQ-M5-002', text: 'Pre-op sanitation verification records maintained', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.01' },
    { code: 'REQ-M5-003', text: 'Facility maintenance program in place', criticality: 'major', moduleCode: 'M5', clauseKey: 'PRIMUS-5.02' },
    { code: 'REQ-M5-004', text: 'Potable water system tested annually', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.03' },
    { code: 'REQ-M5-005', text: 'Ice machine cleaning and maintenance logs', criticality: 'major', moduleCode: 'M5', clauseKey: 'PRIMUS-5.03' },
    { code: 'REQ-M5-006', text: 'Temperature monitoring system calibrated', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.04' },
    { code: 'REQ-M5-007', text: 'Cold storage temperature logs maintained daily', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.04' },
    { code: 'REQ-M5-008', text: 'Waste management program documented', criticality: 'major', moduleCode: 'M5', clauseKey: 'PRIMUS-5.05' },
    { code: 'REQ-M5-009', text: 'Employee facilities adequately maintained', criticality: 'major', moduleCode: 'M5', clauseKey: 'PRIMUS-5.06' },
    { code: 'REQ-M5-010', text: 'Foreign material control program established', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.07' },
    { code: 'REQ-M5-011', text: 'Visitor/contractor access control in place', criticality: 'major', moduleCode: 'M5', clauseKey: 'PRIMUS-5.08' },
    { code: 'REQ-M5-012', text: 'Allergen management program established', criticality: 'critical', moduleCode: 'M5', clauseKey: 'PRIMUS-5.09' },

    // M6 HACCP Requirements
    { code: 'REQ-M6-001', text: 'HACCP team composition and qualifications documented', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.01' },
    { code: 'REQ-M6-002', text: 'Product description and intended use documented', criticality: 'major', moduleCode: 'M6', clauseKey: 'PRIMUS-6.01' },
    { code: 'REQ-M6-003', text: 'Process flow diagram verified on-site', criticality: 'major', moduleCode: 'M6', clauseKey: 'PRIMUS-6.01' },
    { code: 'REQ-M6-004', text: 'Hazard analysis completed comprehensively', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.02' },
    { code: 'REQ-M6-005', text: 'CCPs identified and justified', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.02' },
    { code: 'REQ-M6-006', text: 'Critical limits established for all CCPs', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.02' },
    { code: 'REQ-M6-007', text: 'CCP monitoring procedures documented', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.03' },
    { code: 'REQ-M6-008', text: 'CCP monitoring records current and complete', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.03' },
    { code: 'REQ-M6-009', text: 'Corrective action procedures for CCP deviations', criticality: 'critical', moduleCode: 'M6', clauseKey: 'PRIMUS-6.03' },
    { code: 'REQ-M6-010', text: 'HACCP plan verification schedule established', criticality: 'major', moduleCode: 'M6', clauseKey: 'PRIMUS-6.04' },
    { code: 'REQ-M6-011', text: 'HACCP records retention policy established', criticality: 'major', moduleCode: 'M6', clauseKey: 'PRIMUS-6.05' },

    // M7 Preventive Controls Requirements
    { code: 'REQ-M7-001', text: 'Food safety plan meeting FSMA requirements', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.01' },
    { code: 'REQ-M7-002', text: 'PCQI designation and training current', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.01' },
    { code: 'REQ-M7-003', text: 'Process preventive controls documented', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.02' },
    { code: 'REQ-M7-004', text: 'Allergen preventive controls in place', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.02' },
    { code: 'REQ-M7-005', text: 'Supply chain preventive controls established', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.03' },
    { code: 'REQ-M7-006', text: 'Supplier approval program with hazard-based criteria', criticality: 'major', moduleCode: 'M7', clauseKey: 'PRIMUS-7.03' },
    { code: 'REQ-M7-007', text: 'Recall plan with response procedures', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.04' },
    { code: 'REQ-M7-008', text: 'Mock recall exercise completed', criticality: 'major', moduleCode: 'M7', clauseKey: 'PRIMUS-7.04' },
    { code: 'REQ-M7-009', text: 'Preventive control records maintained', criticality: 'critical', moduleCode: 'M7', clauseKey: 'PRIMUS-7.05' },

    // M8 Grain Operations Requirements
    { code: 'REQ-M8-001', text: 'Grain receiving and grading records maintained', criticality: 'major', moduleCode: 'M8', clauseKey: 'PRIMUS-8.01' },
    { code: 'REQ-M8-002', text: 'Grain storage conditions monitored daily', criticality: 'critical', moduleCode: 'M8', clauseKey: 'PRIMUS-8.01' },
    { code: 'REQ-M8-003', text: 'Mycotoxin testing program implemented', criticality: 'critical', moduleCode: 'M8', clauseKey: 'PRIMUS-8.01' },
    { code: 'REQ-M8-004', text: 'Fumigation records with applicator certification', criticality: 'major', moduleCode: 'M8', clauseKey: 'PRIMUS-8.02' },
    { code: 'REQ-M8-005', text: 'Grain handler training program current', criticality: 'major', moduleCode: 'M8', clauseKey: 'PRIMUS-8.02' },
    { code: 'REQ-M8-006', text: 'Grain lot traceability system in place', criticality: 'critical', moduleCode: 'M8', clauseKey: 'PRIMUS-8.03' },
    { code: 'REQ-M8-007', text: 'Organic grain segregation documented', criticality: 'critical', moduleCode: 'M8', clauseKey: 'PRIMUS-8.03' },

    // M9 IPM Requirements
    { code: 'REQ-M9-001', text: 'Written IPM plan covering all areas', criticality: 'critical', moduleCode: 'M9', clauseKey: 'PRIMUS-9.01' },
    { code: 'REQ-M9-002', text: 'Licensed PCO contract and qualifications documented', criticality: 'major', moduleCode: 'M9', clauseKey: 'PRIMUS-9.01' },
    { code: 'REQ-M9-003', text: 'Pest monitoring device placement and inspection schedule', criticality: 'critical', moduleCode: 'M9', clauseKey: 'PRIMUS-9.02' },
    { code: 'REQ-M9-004', text: 'Pest monitoring records and trend analysis', criticality: 'major', moduleCode: 'M9', clauseKey: 'PRIMUS-9.02' },
    { code: 'REQ-M9-005', text: 'Pesticide application records with license verification', criticality: 'critical', moduleCode: 'M9', clauseKey: 'PRIMUS-9.03' },
    { code: 'REQ-M9-006', text: 'Approved pesticide list with SDS documentation', criticality: 'major', moduleCode: 'M9', clauseKey: 'PRIMUS-9.03' },
    { code: 'REQ-M9-007', text: 'Building exclusion measures in place', criticality: 'major', moduleCode: 'M9', clauseKey: 'PRIMUS-9.04' },
    { code: 'REQ-M9-008', text: 'Corrective action records for pest incidents', criticality: 'major', moduleCode: 'M9', clauseKey: 'PRIMUS-9.05' },
  ];

  for (const req of requirementsData) {
    const moduleId = moduleMap[req.moduleCode];
    const clauseId = clauseIds[req.clauseKey];

    if (clauseId && moduleId) {
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO fsms_requirements (clause_id, requirement_code, requirement_text, criticality, module_id) VALUES (?, ?, ?, ?, ?)`,
          args: [clauseId, req.code, req.text, req.criticality, moduleId],
        });
      } catch (_e) { /* ignore duplicates */ }
    }
  }

  // ====================================================================
  // 5. SEED EVIDENCE LINKS (~300 links)
  // ====================================================================

  // Get all audit questions and SOP documents for linking
  const questionsResult = await db.execute("SELECT id, question_code FROM audit_questions_v2 WHERE question_code LIKE '2.%' OR question_code LIKE '3.%' OR question_code LIKE '4.%' OR question_code LIKE '5.%' OR question_code LIKE '6.%' OR question_code LIKE '7.%' OR question_code LIKE '8.%' OR question_code LIKE '9.%'");
  const questionMap: Record<string, number> = {};
  for (const q of questionsResult.rows) {
    questionMap[(q as any).question_code] = (q as any).id;
  }

  const sopResult = await db.execute("SELECT id, code FROM sop_documents");
  const sopMap: Record<string, number> = {};
  for (const s of sopResult.rows) {
    sopMap[(s as any).code] = (s as any).id;
  }

  const requirementResult = await db.execute("SELECT id, requirement_code FROM fsms_requirements WHERE requirement_code LIKE 'REQ-M%'");
  const requirementMap: Record<string, number> = {};
  for (const r of requirementResult.rows) {
    requirementMap[(r as any).requirement_code] = (r as any).id;
  }

  // Create links between requirements and evidence (questions and SOPs)
  const evidenceLinksData: Array<{
    requirementCode: string;
    evidenceType: string;
    evidenceCode: string;
  }> = [
    // M2 Evidence Links
    { requirementCode: 'REQ-M2-001', evidenceType: 'audit_question', evidenceCode: '2.01.01' },
    { requirementCode: 'REQ-M2-001', evidenceType: 'sop', evidenceCode: 'GG-GAP-001' },
    { requirementCode: 'REQ-M2-002', evidenceType: 'audit_question', evidenceCode: '2.01.02' },
    { requirementCode: 'REQ-M2-002', evidenceType: 'sop', evidenceCode: 'GG-GAP-002' },
    { requirementCode: 'REQ-M2-003', evidenceType: 'audit_question', evidenceCode: '2.01.04' },
    { requirementCode: 'REQ-M2-003', evidenceType: 'sop', evidenceCode: 'GG-GAP-003' },
    { requirementCode: 'REQ-M2-004', evidenceType: 'audit_question', evidenceCode: '2.02.01' },
    { requirementCode: 'REQ-M2-004', evidenceType: 'sop', evidenceCode: 'GG-GAP-004' },
    { requirementCode: 'REQ-M2-005', evidenceType: 'audit_question', evidenceCode: '2.02.02' },
    { requirementCode: 'REQ-M2-006', evidenceType: 'audit_question', evidenceCode: '2.03.01' },
    { requirementCode: 'REQ-M2-006', evidenceType: 'sop', evidenceCode: 'GG-GMP-003' },
    { requirementCode: 'REQ-M2-007', evidenceType: 'audit_question', evidenceCode: '2.03.02' },
    { requirementCode: 'REQ-M2-008', evidenceType: 'audit_question', evidenceCode: '2.03.03' },
    { requirementCode: 'REQ-M2-008', evidenceType: 'sop', evidenceCode: 'GG-GMP-006' },
    { requirementCode: 'REQ-M2-009', evidenceType: 'audit_question', evidenceCode: '2.04.01' },
    { requirementCode: 'REQ-M2-010', evidenceType: 'audit_question', evidenceCode: '2.05.01' },
    { requirementCode: 'REQ-M2-010', evidenceType: 'sop', evidenceCode: 'GG-GAP-006' },
    { requirementCode: 'REQ-M2-011', evidenceType: 'audit_question', evidenceCode: '2.05.02' },

    // M3 Evidence Links
    { requirementCode: 'REQ-M3-001', evidenceType: 'audit_question', evidenceCode: '3.01.01' },
    { requirementCode: 'REQ-M3-001', evidenceType: 'sop', evidenceCode: 'GG-GAP-007' },
    { requirementCode: 'REQ-M3-002', evidenceType: 'audit_question', evidenceCode: '3.01.02' },
    { requirementCode: 'REQ-M3-003', evidenceType: 'audit_question', evidenceCode: '3.01.03' },
    { requirementCode: 'REQ-M3-004', evidenceType: 'audit_question', evidenceCode: '3.02.01' },
    { requirementCode: 'REQ-M3-004', evidenceType: 'sop', evidenceCode: 'GG-GAP-008' },
    { requirementCode: 'REQ-M3-005', evidenceType: 'audit_question', evidenceCode: '3.03.01' },
    { requirementCode: 'REQ-M3-005', evidenceType: 'sop', evidenceCode: 'GG-GMP-001' },
    { requirementCode: 'REQ-M3-006', evidenceType: 'audit_question', evidenceCode: '3.03.02' },
    { requirementCode: 'REQ-M3-006', evidenceType: 'sop', evidenceCode: 'GG-GAP-002' },
    { requirementCode: 'REQ-M3-007', evidenceType: 'audit_question', evidenceCode: '3.04.01' },
    { requirementCode: 'REQ-M3-007', evidenceType: 'sop', evidenceCode: 'GG-GMP-009' },

    // M4 Evidence Links
    { requirementCode: 'REQ-M4-001', evidenceType: 'audit_question', evidenceCode: '4.01.01' },
    { requirementCode: 'REQ-M4-001', evidenceType: 'sop', evidenceCode: 'GG-GMP-003' },
    { requirementCode: 'REQ-M4-002', evidenceType: 'audit_question', evidenceCode: '4.01.02' },
    { requirementCode: 'REQ-M4-002', evidenceType: 'sop', evidenceCode: 'GG-GMP-001' },
    { requirementCode: 'REQ-M4-003', evidenceType: 'audit_question', evidenceCode: '4.02.01' },
    { requirementCode: 'REQ-M4-003', evidenceType: 'sop', evidenceCode: 'GG-GMP-007' },
    { requirementCode: 'REQ-M4-004', evidenceType: 'audit_question', evidenceCode: '4.02.02' },
    { requirementCode: 'REQ-M4-004', evidenceType: 'sop', evidenceCode: 'GG-GMP-006' },
    { requirementCode: 'REQ-M4-005', evidenceType: 'audit_question', evidenceCode: '4.03.01' },
    { requirementCode: 'REQ-M4-006', evidenceType: 'audit_question', evidenceCode: '4.03.02' },
    { requirementCode: 'REQ-M4-006', evidenceType: 'sop', evidenceCode: 'GG-GAP-002' },
    { requirementCode: 'REQ-M4-007', evidenceType: 'audit_question', evidenceCode: '4.04.01' },
    { requirementCode: 'REQ-M4-007', evidenceType: 'sop', evidenceCode: 'GG-ORG-002' },
    { requirementCode: 'REQ-M4-008', evidenceType: 'audit_question', evidenceCode: '4.04.03' },

    // M5 Evidence Links
    { requirementCode: 'REQ-M5-001', evidenceType: 'audit_question', evidenceCode: '5.01.01' },
    { requirementCode: 'REQ-M5-001', evidenceType: 'sop', evidenceCode: 'GG-GMP-001' },
    { requirementCode: 'REQ-M5-002', evidenceType: 'audit_question', evidenceCode: '5.01.02' },
    { requirementCode: 'REQ-M5-003', evidenceType: 'audit_question', evidenceCode: '5.02.01' },
    { requirementCode: 'REQ-M5-003', evidenceType: 'sop', evidenceCode: 'GG-GMP-002' },
    { requirementCode: 'REQ-M5-004', evidenceType: 'audit_question', evidenceCode: '5.03.01' },
    { requirementCode: 'REQ-M5-004', evidenceType: 'sop', evidenceCode: 'GG-GAP-002' },
    { requirementCode: 'REQ-M5-005', evidenceType: 'audit_question', evidenceCode: '5.03.02' },
    { requirementCode: 'REQ-M5-006', evidenceType: 'audit_question', evidenceCode: '5.04.01' },
    { requirementCode: 'REQ-M5-006', evidenceType: 'sop', evidenceCode: 'GG-GMP-006' },
    { requirementCode: 'REQ-M5-007', evidenceType: 'audit_question', evidenceCode: '5.04.02' },
    { requirementCode: 'REQ-M5-008', evidenceType: 'audit_question', evidenceCode: '5.05.01' },
    { requirementCode: 'REQ-M5-008', evidenceType: 'sop', evidenceCode: 'GG-GMP-010' },
    { requirementCode: 'REQ-M5-009', evidenceType: 'audit_question', evidenceCode: '5.06.01' },
    { requirementCode: 'REQ-M5-010', evidenceType: 'audit_question', evidenceCode: '5.07.01' },
    { requirementCode: 'REQ-M5-010', evidenceType: 'sop', evidenceCode: 'GG-GMP-004' },
    { requirementCode: 'REQ-M5-011', evidenceType: 'audit_question', evidenceCode: '5.08.01' },
    { requirementCode: 'REQ-M5-012', evidenceType: 'audit_question', evidenceCode: '5.09.01' },

    // M6 Evidence Links
    { requirementCode: 'REQ-M6-001', evidenceType: 'audit_question', evidenceCode: '6.01.01' },
    { requirementCode: 'REQ-M6-001', evidenceType: 'sop', evidenceCode: 'GG-FSMS-008' },
    { requirementCode: 'REQ-M6-002', evidenceType: 'audit_question', evidenceCode: '6.01.02' },
    { requirementCode: 'REQ-M6-003', evidenceType: 'audit_question', evidenceCode: '6.01.03' },
    { requirementCode: 'REQ-M6-004', evidenceType: 'audit_question', evidenceCode: '6.02.01' },
    { requirementCode: 'REQ-M6-005', evidenceType: 'audit_question', evidenceCode: '6.02.02' },
    { requirementCode: 'REQ-M6-006', evidenceType: 'audit_question', evidenceCode: '6.02.03' },
    { requirementCode: 'REQ-M6-007', evidenceType: 'audit_question', evidenceCode: '6.03.01' },
    { requirementCode: 'REQ-M6-007', evidenceType: 'sop', evidenceCode: 'GG-FSMS-009' },
    { requirementCode: 'REQ-M6-008', evidenceType: 'audit_question', evidenceCode: '6.03.02' },
    { requirementCode: 'REQ-M6-009', evidenceType: 'audit_question', evidenceCode: '6.03.03' },
    { requirementCode: 'REQ-M6-009', evidenceType: 'sop', evidenceCode: 'GG-FSMS-014' },
    { requirementCode: 'REQ-M6-010', evidenceType: 'audit_question', evidenceCode: '6.04.01' },
    { requirementCode: 'REQ-M6-011', evidenceType: 'audit_question', evidenceCode: '6.05.01' },

    // M7 Evidence Links
    { requirementCode: 'REQ-M7-001', evidenceType: 'audit_question', evidenceCode: '7.01.01' },
    { requirementCode: 'REQ-M7-001', evidenceType: 'sop', evidenceCode: 'GG-FSMS-010' },
    { requirementCode: 'REQ-M7-002', evidenceType: 'audit_question', evidenceCode: '7.01.02' },
    { requirementCode: 'REQ-M7-003', evidenceType: 'audit_question', evidenceCode: '7.02.01' },
    { requirementCode: 'REQ-M7-004', evidenceType: 'audit_question', evidenceCode: '7.02.02' },
    { requirementCode: 'REQ-M7-004', evidenceType: 'sop', evidenceCode: 'GG-GMP-004' },
    { requirementCode: 'REQ-M7-005', evidenceType: 'audit_question', evidenceCode: '7.03.01' },
    { requirementCode: 'REQ-M7-005', evidenceType: 'sop', evidenceCode: 'GG-FSMS-011' },
    { requirementCode: 'REQ-M7-006', evidenceType: 'audit_question', evidenceCode: '7.03.02' },
    { requirementCode: 'REQ-M7-007', evidenceType: 'audit_question', evidenceCode: '7.04.01' },
    { requirementCode: 'REQ-M7-007', evidenceType: 'sop', evidenceCode: 'GG-GMP-008' },
    { requirementCode: 'REQ-M7-008', evidenceType: 'audit_question', evidenceCode: '7.04.02' },
    { requirementCode: 'REQ-M7-009', evidenceType: 'audit_question', evidenceCode: '7.05.01' },

    // M8 Evidence Links
    { requirementCode: 'REQ-M8-001', evidenceType: 'audit_question', evidenceCode: '8.01.01' },
    { requirementCode: 'REQ-M8-001', evidenceType: 'sop', evidenceCode: 'GG-GMP-005' },
    { requirementCode: 'REQ-M8-002', evidenceType: 'audit_question', evidenceCode: '8.01.02' },
    { requirementCode: 'REQ-M8-003', evidenceType: 'audit_question', evidenceCode: '8.01.03' },
    { requirementCode: 'REQ-M8-004', evidenceType: 'audit_question', evidenceCode: '8.02.01' },
    { requirementCode: 'REQ-M8-004', evidenceType: 'sop', evidenceCode: 'GG-GMP-009' },
    { requirementCode: 'REQ-M8-005', evidenceType: 'audit_question', evidenceCode: '8.02.02' },
    { requirementCode: 'REQ-M8-005', evidenceType: 'sop', evidenceCode: 'GG-FSMS-005' },
    { requirementCode: 'REQ-M8-006', evidenceType: 'audit_question', evidenceCode: '8.03.01' },
    { requirementCode: 'REQ-M8-006', evidenceType: 'sop', evidenceCode: 'GG-GMP-007' },
    { requirementCode: 'REQ-M8-007', evidenceType: 'audit_question', evidenceCode: '8.03.02' },
    { requirementCode: 'REQ-M8-007', evidenceType: 'sop', evidenceCode: 'GG-ORG-002' },

    // M9 Evidence Links
    { requirementCode: 'REQ-M9-001', evidenceType: 'audit_question', evidenceCode: '9.01.01' },
    { requirementCode: 'REQ-M9-001', evidenceType: 'sop', evidenceCode: 'GG-GMP-009' },
    { requirementCode: 'REQ-M9-002', evidenceType: 'audit_question', evidenceCode: '9.01.02' },
    { requirementCode: 'REQ-M9-003', evidenceType: 'audit_question', evidenceCode: '9.02.01' },
    { requirementCode: 'REQ-M9-004', evidenceType: 'audit_question', evidenceCode: '9.02.02' },
    { requirementCode: 'REQ-M9-005', evidenceType: 'audit_question', evidenceCode: '9.03.01' },
    { requirementCode: 'REQ-M9-006', evidenceType: 'audit_question', evidenceCode: '9.03.02' },
    { requirementCode: 'REQ-M9-007', evidenceType: 'audit_question', evidenceCode: '9.04.01' },
    { requirementCode: 'REQ-M9-007', evidenceType: 'sop', evidenceCode: 'GG-GMP-002' },
    { requirementCode: 'REQ-M9-008', evidenceType: 'audit_question', evidenceCode: '9.05.01' },
    { requirementCode: 'REQ-M9-008', evidenceType: 'sop', evidenceCode: 'GG-FSMS-014' },
  ];

  for (const link of evidenceLinksData) {
    const requirementId = requirementMap[link.requirementCode];
    if (!requirementId) continue;

    let evidenceId: number | undefined;

    if (link.evidenceType === 'audit_question') {
      evidenceId = questionMap[link.evidenceCode];
    } else if (link.evidenceType === 'sop') {
      evidenceId = sopMap[link.evidenceCode];
    }

    if (evidenceId) {
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO requirement_evidence_links (requirement_id, evidence_type, evidence_id, evidence_code) VALUES (?, ?, ?, ?)`,
          args: [requirementId, link.evidenceType, evidenceId, link.evidenceCode],
        });
      } catch (_e) { /* ignore duplicates */ }
    }
  }
}

async function seedPhase4(db: ReturnType<typeof createClient>) {
  // ====================================================================
  // PHASE 4: Seed default compliance rules
  // ====================================================================

  // Check if rules already exist
  const existingRulesCheck = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM compliance_rules',
    args: [],
  });
  if ((existingRulesCheck.rows[0] as any).cnt > 0) {
    return; // Already seeded
  }

  const defaultRules = [
    // Evidence check rules
    { code: 'RULE-SOP-001', name: 'SOP Currency Check', desc: 'All SOPs must be in current status', type: 'evidence_check', entity: 'sop', condition: '{"field":"status","operator":"equals","value":"current"}', severity: 'major', module: null },
    { code: 'RULE-SOP-002', name: 'SOP Review Overdue', desc: 'SOPs not reviewed in 365 days', type: 'expiration', entity: 'sop', condition: '{"field":"last_reviewed","operator":"older_than_days","value":365}', severity: 'critical', module: null },
    { code: 'RULE-CHK-001', name: 'Checklist Completion Frequency', desc: 'Checklists must be completed within required frequency', type: 'frequency', entity: 'checklist', condition: '{"field":"submission_date","operator":"within_days","value":90}', severity: 'major', module: null },
    { code: 'RULE-AUD-001', name: 'Audit Score Threshold', desc: 'Module audit scores must be >= 70%', type: 'threshold', entity: 'audit_response', condition: '{"field":"score_pct","operator":"gte","value":70}', severity: 'critical', module: null },
    { code: 'RULE-AUD-002', name: 'Auto-Fail Question Check', desc: 'No auto-fail questions should score 0', type: 'evidence_check', entity: 'audit_response', condition: '{"field":"is_auto_fail","operator":"equals","value":1,"score_must_be":"gt_zero"}', severity: 'critical', module: null },
    { code: 'RULE-CAPA-001', name: 'CAPA Timeliness', desc: 'Open CAPAs must not be overdue', type: 'expiration', entity: 'capa', condition: '{"field":"target_completion_date","operator":"not_past_due"}', severity: 'major', module: null },
    { code: 'RULE-CAPA-002', name: 'Critical CAPA Resolution', desc: 'Critical CAPAs resolved within 7 days', type: 'expiration', entity: 'capa', condition: '{"field":"target_completion_date","operator":"within_days","value":7,"filter":"severity=critical"}', severity: 'critical', module: null },
    { code: 'RULE-CERT-001', name: 'Supplier Certification Validity', desc: 'Supplier certifications must be current', type: 'expiration', entity: 'certification', condition: '{"field":"expiry_date","operator":"not_expired"}', severity: 'major', module: null },
    { code: 'RULE-M1-001', name: 'M1 Food Safety Plan', desc: 'Food Safety Plan SOP must exist and be current', type: 'evidence_check', entity: 'sop', condition: '{"field":"status","operator":"equals","value":"current","sop_code":"SOP-FSP"}', severity: 'critical', module: 'M1' },
    { code: 'RULE-M5-001', name: 'M5 Sanitation Checklist', desc: 'Sanitation checklists must be submitted weekly', type: 'frequency', entity: 'checklist', condition: '{"field":"submission_date","operator":"within_days","value":7,"template_category":"sanitation"}', severity: 'major', module: 'M5' },
    { code: 'RULE-M6-001', name: 'M6 HACCP Monitoring', desc: 'HACCP monitoring records must be current', type: 'frequency', entity: 'checklist', condition: '{"field":"submission_date","operator":"within_days","value":1,"template_category":"haccp"}', severity: 'critical', module: 'M6' },
    { code: 'RULE-WATER-001', name: 'Water Testing Frequency', desc: 'Water testing records must be within 30 days', type: 'frequency', entity: 'checklist', condition: '{"field":"submission_date","operator":"within_days","value":30,"template_category":"water_testing"}', severity: 'major', module: 'M2' },
  ];

  for (const rule of defaultRules) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO compliance_rules (rule_code, rule_name, description, rule_type, entity_type, condition_json, severity, module_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [rule.code, rule.name, rule.desc, rule.type, rule.entity, rule.condition, rule.severity, rule.module],
    });
  }
}

async function seedPhase5(db: ReturnType<typeof createClient>) {
  // ====================================================================
  // PHASE 5: Seed training requirements
  // ====================================================================

  // Check if training requirements already exist
  const existingReqsCheck = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM training_requirements',
    args: [],
  });
  if ((existingReqsCheck.rows[0] as any).cnt > 0) {
    return; // Already seeded
  }

  const trainingReqs = [
    { title: 'Food Safety Fundamentals', desc: 'Basic food safety principles and practices', type: 'food_safety', freq: 365, required: 1, module: 'M1', role: null },
    { title: 'HACCP Plan Training', desc: 'Understanding and implementing HACCP plans', type: 'haccp', freq: 365, required: 1, module: 'M6', role: null },
    { title: 'Sanitation & Hygiene', desc: 'Proper cleaning and sanitization procedures', type: 'sanitation', freq: 180, required: 1, module: 'M5', role: null },
    { title: 'Chemical Handling Safety', desc: 'Safe handling, storage, and application of chemicals', type: 'chemical_safety', freq: 365, required: 1, module: 'M2', role: null },
    { title: 'Allergen Control', desc: 'Allergen identification and cross-contact prevention', type: 'allergen', freq: 365, required: 1, module: 'M7', role: null },
    { title: 'Pest Control Awareness', desc: 'IPM principles and pest identification', type: 'pest_control', freq: 365, required: 1, module: 'M9', role: null },
    { title: 'GMP Training', desc: 'Good Manufacturing Practices for food facilities', type: 'gmp', freq: 365, required: 1, module: 'M5', role: null },
    { title: 'Emergency Procedures', desc: 'Emergency response and evacuation protocols', type: 'emergency', freq: 365, required: 1, module: null, role: null },
    { title: 'Harvest Hygiene', desc: 'Pre-harvest and harvest sanitation practices', type: 'harvest', freq: 180, required: 1, module: 'M4', role: null },
    { title: 'Supervisor Food Safety', desc: 'Advanced food safety for supervisory staff', type: 'supervisor_fs', freq: 365, required: 1, module: null, role: 'supervisor' },
    { title: 'FSQA Manager Certification', desc: 'PCQI or equivalent food safety certification', type: 'fsqa_cert', freq: 730, required: 1, module: null, role: 'fsqa' },
    { title: 'Internal Auditor Training', desc: 'Internal audit methodology and practice', type: 'auditor', freq: 365, required: 0, module: null, role: 'fsqa' },
  ];

  for (const req of trainingReqs) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO training_requirements (title, description, training_type, frequency_days, is_required, module_code, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [req.title, req.desc, req.type, req.freq, req.required, req.module, req.role],
    });
  }
}

async function seedPhase6(db: ReturnType<typeof createClient>) {
  // ====================================================================
  // PHASE 6: Seed app module configuration
  // ====================================================================

  // Check if modules already exist
  const existingModulesCheck = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM app_module_config',
    args: [],
  });
  if ((existingModulesCheck.rows[0] as any).cnt > 0) {
    return; // Already seeded
  }

  const modules = [
    { key: 'pre_harvest', name: 'Pre-Harvest Logs', group: 'operations', desc: 'Water tests, soil amendments, field hygiene' },
    { key: 'chemicals', name: 'Chemical Tracking', group: 'operations', desc: 'Applications, storage, MRL compliance' },
    { key: 'checklists', name: 'Digital Checklists', group: 'operations', desc: 'Daily inspections & sign-offs' },
    { key: 'supply_master', name: 'Supply Master', group: 'operations', desc: 'Procurement and supply chain tracking' },
    { key: 'audit_checklist', name: 'Audit Checklist', group: 'compliance', desc: 'PrimusGFS audit preparation checklists' },
    { key: 'sops', name: 'SOP Hub', group: 'compliance', desc: 'Standard operating procedures with versioning' },
    { key: 'gap_analysis', name: 'Gap Analysis', group: 'compliance', desc: 'Per-facility readiness tracker' },
    { key: 'audit_simulator', name: 'Audit Simulator', group: 'compliance', desc: 'PrimusGFS v4.0 self-scoring' },
    { key: 'compliance_dashboard', name: 'Compliance Dashboard', group: 'compliance', desc: 'FSMS compliance scoring engine' },
    { key: 'compliance_reporting', name: 'Compliance Reporting', group: 'compliance', desc: 'Rules engine, risk scoring, trends' },
    { key: 'corrective_actions', name: 'Corrective Actions', group: 'management', desc: 'CAPAs & nonconformance tracking' },
    { key: 'suppliers', name: 'Suppliers', group: 'management', desc: 'Vendor management & certifications' },
    { key: 'facilities', name: 'Facilities', group: 'management', desc: 'Multi-site facility management' },
    { key: 'reports', name: 'Reports & Export', group: 'management', desc: 'Download CSV data exports' },
    { key: 'training', name: 'Training', group: 'management', desc: 'Worker training records & certifications' },
  ];

  for (const m of modules) {
    try {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO app_module_config (module_key, module_name, module_group, is_enabled, description) VALUES (?, ?, ?, 1, ?)',
        args: [m.key, m.name, m.group, m.desc],
      });
    } catch (_e) { /* ignore */ }
  }
}
