import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// ══════════════════════════════════════════════════════════════════
// CORE TABLES
// ══════════════════════════════════════════════════════════════════

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  organizationName: text("organization_name").default(""),
  title: text("title").default(""),
  role: text("role").default("farmer"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  isActive: integer("is_active").default(1),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_is_active").on(table.isActive),
  index("idx_users_role").on(table.role),
]);

export const preHarvestLogs = sqliteTable("pre_harvest_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  logType: text("log_type").notNull(),
  waterSource: text("water_source"),
  testDate: text("test_date"),
  phLevel: real("ph_level"),
  eColiResult: text("e_coli_result"),
  totalColiformResult: text("total_coliform_result"),
  testLocation: text("test_location"),
  labName: text("lab_name"),
  amendmentType: text("amendment_type"),
  amendmentDate: text("amendment_date"),
  source: text("source"),
  quantityApplied: real("quantity_applied"),
  quantityUnit: text("quantity_unit"),
  fieldLocation: text("field_location"),
  trainingDate: text("training_date"),
  trainingTopic: text("training_topic"),
  traineeName: text("trainee_name"),
  handwashingStationAvailable: integer("handwashing_station_available"),
  sanitationChecklistPass: integer("sanitation_checklist_pass"),
  intrusionDate: text("intrusion_date"),
  intrusionType: text("intrusion_type"),
  intrusionLocation: text("intrusion_location"),
  remedialAction: text("remedial_action"),
  correctedDate: text("corrected_date"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_phl_user").on(table.userId),
  index("idx_phl_type").on(table.logType),
  index("idx_phl_created").on(table.createdAt),
]);

export const chemicalApplications = sqliteTable("chemical_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  productName: text("product_name").notNull(),
  activeIngredient: text("active_ingredient").notNull(),
  epaRegistrationNumber: text("epa_registration_number"),
  applicationDate: text("application_date").notNull(),
  applicationLocation: text("application_location"),
  quantityApplied: real("quantity_applied"),
  quantityUnit: text("quantity_unit"),
  applicatorName: text("applicator_name"),
  applicatorLicense: text("applicator_license"),
  weatherConditions: text("weather_conditions"),
  preHarvestIntervalDays: integer("pre_harvest_interval_days"),
  preHarvestIntervalEndDate: text("pre_harvest_interval_end_date"),
  mrlPpm: real("mrl_ppm"),
  expectedResidueLevelPpm: real("expected_residue_level_ppm"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_chem_app_user").on(table.userId),
  index("idx_chem_app_date").on(table.applicationDate),
]);

export const chemicalStorage = sqliteTable("chemical_storage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  productName: text("product_name").notNull(),
  storageLocation: text("storage_location"),
  quantityStored: real("quantity_stored"),
  quantityUnit: text("quantity_unit"),
  receivedDate: text("received_date"),
  expirationDate: text("expiration_date"),
  storageConditions: text("storage_conditions"),
  safetyEquipmentAvailable: integer("safety_equipment_available"),
  lastInventoryDate: text("last_inventory_date"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_chem_stor_user").on(table.userId),
]);

export const nonconformances = sqliteTable("nonconformances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  findingDate: text("finding_date").notNull(),
  findingCategory: text("finding_category").notNull(),
  findingDescription: text("finding_description").notNull(),
  severity: text("severity").notNull().default("minor"),
  affectedArea: text("affected_area"),
  rootCause: text("root_cause"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_nc_user").on(table.userId),
  index("idx_nc_severity").on(table.severity),
]);

export const correctiveActions = sqliteTable("corrective_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  nonconformanceId: integer("nonconformance_id").notNull().references(() => nonconformances.id),
  actionDescription: text("action_description").notNull(),
  responsibleParty: text("responsible_party"),
  targetCompletionDate: text("target_completion_date"),
  actualCompletionDate: text("actual_completion_date"),
  status: text("status").default("open"),
  verificationMethod: text("verification_method"),
  verificationDate: text("verification_date"),
  verifiedBy: text("verified_by"),
  verificationNotes: text("verification_notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_ca_user").on(table.userId),
  index("idx_ca_nc").on(table.nonconformanceId),
  index("idx_ca_status").on(table.status),
]);

export const auditChecklists = sqliteTable("audit_checklists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  auditDate: text("audit_date").notNull(),
  auditName: text("audit_name").notNull(),
  waterSafetyChecked: integer("water_safety_checked").default(0),
  soilAmendmentChecked: integer("soil_amendment_checked").default(0),
  workerHygieneChecked: integer("worker_hygiene_checked").default(0),
  animalIntrusionChecked: integer("animal_intrusion_checked").default(0),
  chemicalApplicationsChecked: integer("chemical_applications_checked").default(0),
  mrlComplianceChecked: integer("mrl_compliance_checked").default(0),
  storageConditionsChecked: integer("storage_conditions_checked").default(0),
  nonconformancesTracked: integer("nonconformances_tracked").default(0),
  capasDocumented: integer("capas_documented").default(0),
  capasVerified: integer("capas_verified").default(0),
  overallStatus: text("overall_status").default("in_progress"),
  auditorName: text("auditor_name"),
  auditNotes: text("audit_notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_ac_user").on(table.userId),
  index("idx_ac_date").on(table.auditDate),
]);

// ══════════════════════════════════════════════════════════════════
// FACILITIES & USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════

export const facilities = sqliteTable("facilities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  internalId: integer("internal_id").unique(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  location: text("location"),
  facilityType: text("facility_type"),
  m1Fsms: integer("m1_fsms").default(0),
  m2Farm: integer("m2_farm").default(0),
  m3IndoorAg: integer("m3_indoor_ag").default(0),
  m4Harvest: integer("m4_harvest").default(0),
  m5Facility: integer("m5_facility").default(0),
  m6Haccp: integer("m6_haccp").default(0),
  m7PrevControls: integer("m7_prev_controls").default(0),
  m8Grains: integer("m8_grains").default(0),
  m9Ipm: integer("m9_ipm").default(0),
  organicScope: text("organic_scope"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_fac_active").on(table.isActive),
]);

export const userFacilities = sqliteTable("user_facilities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  role: text("role").default("worker"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("uq_user_facility").on(table.userId, table.facilityId),
  index("idx_uf_user").on(table.userId),
  index("idx_uf_fac").on(table.facilityId),
]);

// ══════════════════════════════════════════════════════════════════
// CHECKLISTS & SOPs
// ══════════════════════════════════════════════════════════════════

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  linkedSop: text("linked_sop"),
  primusRef: text("primus_ref"),
  facilityType: text("facility_type"),
  frequency: text("frequency"),
  itemCount: integer("item_count").default(0),
  requiresPhotos: integer("requires_photos").default(0),
  requiresSignoff: integer("requires_signoff").default(0),
  phase: text("phase").default("Phase 1"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const checklistItems = sqliteTable("checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => checklistTemplates.id),
  itemNumber: integer("item_number"),
  itemText: text("item_text").notNull(),
  itemType: text("item_type").default("pass_fail"),
  isCritical: integer("is_critical").default(0),
  sortOrder: integer("sort_order"),
});

export const checklistSubmissions = sqliteTable("checklist_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  templateId: integer("template_id").notNull().references(() => checklistTemplates.id),
  submittedBy: integer("submitted_by").notNull().references(() => users.id),
  submissionDate: text("submission_date").notNull(),
  overallPass: integer("overall_pass").default(1),
  criticalFails: integer("critical_fails").default(0),
  totalItems: integer("total_items").default(0),
  passedItems: integer("passed_items").default(0),
  notes: text("notes"),
  supervisorId: integer("supervisor_id"),
  signoffDate: text("signoff_date"),
  supervisorNotes: text("supervisor_notes"),
  status: text("status").default("submitted"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_cs_fac").on(table.facilityId),
  index("idx_cs_template").on(table.templateId),
  index("idx_cs_submitted").on(table.submittedBy),
]);

export const checklistAnswers = sqliteTable("checklist_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => checklistSubmissions.id),
  itemId: integer("item_id").notNull().references(() => checklistItems.id),
  answerValue: text("answer_value"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  isFail: integer("is_fail").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const sopDocuments = sqliteTable("sop_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  appliesTo: text("applies_to"),
  primusRef: text("primus_ref"),
  nopRef: text("nop_ref"),
  sedexRef: text("sedex_ref"),
  facilityTypes: text("facility_types"),
  language: text("language").default("EN/ES"),
  owner: text("owner"),
  phase: text("phase"),
  sopType: text("sop_type"),
  reviewOwner: text("review_owner"),
  status: text("status").default("Draft"),
  priority: text("priority").default("MEDIUM"),
  currentVersion: integer("current_version").default(1),
  lastReviewed: text("last_reviewed"),
  nextReviewDate: text("next_review_date"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_sop_status").on(table.status),
  index("idx_sop_category").on(table.category),
  index("idx_sop_created").on(table.createdAt),
  index("idx_sop_phase").on(table.phase),
]);

export const sopVersions = sqliteTable("sop_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sopId: integer("sop_id").notNull().references(() => sopDocuments.id),
  versionNumber: integer("version_number").notNull(),
  changeNotes: text("change_notes"),
  uploadedBy: integer("uploaded_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const sopFacilityStatus = sqliteTable("sop_facility_status", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sopId: integer("sop_id").notNull().references(() => sopDocuments.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  status: text("status").default("missing"),
  lastReviewDate: text("last_review_date"),
  reviewerId: integer("reviewer_id"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("uq_sop_facility").on(table.sopId, table.facilityId),
]);

export const sopFiles = sqliteTable("sop_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sopId: integer("sop_id").notNull().references(() => sopDocuments.id),
  versionId: integer("version_id").references(() => sopVersions.id),
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").default(0),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const sopTags = sqliteTable("sop_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sopId: integer("sop_id").notNull().references(() => sopDocuments.id),
  tag: text("tag").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("uq_sop_tag").on(table.sopId, table.tag),
]);

export const gapSnapshots = sqliteTable("gap_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  snapshotDate: text("snapshot_date").notNull(),
  totalRequired: integer("total_required").default(0),
  existsCurrent: integer("exists_current").default(0),
  needsUpdate: integer("needs_update").default(0),
  missing: integer("missing").default(0),
  notApplicable: integer("not_applicable").default(0),
  readinessPct: real("readiness_pct").default(0),
  assessedBy: integer("assessed_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ══════════════════════════════════════════════════════════════════
// AUDIT & COMPLIANCE
// ══════════════════════════════════════════════════════════════════

export const auditModules = sqliteTable("audit_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  totalPoints: integer("total_points").default(0),
});

export const auditQuestionsV2 = sqliteTable("audit_questions_v2", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moduleId: integer("module_id").notNull().references(() => auditModules.id),
  questionCode: text("question_code").notNull(),
  questionText: text("question_text").notNull(),
  points: integer("points").default(0),
  isAutoFail: integer("is_auto_fail").default(0),
  isNewV4: integer("is_new_v4").default(0),
  category: text("category"),
  nopRef: text("nop_ref"),
  requiredSop: text("required_sop"),
  requiredChecklist: text("required_checklist"),
  frequency: text("frequency"),
  responsibleRole: text("responsible_role"),
  sortOrder: integer("sort_order"),
});

export const facilityModules = sqliteTable("facility_modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  moduleId: integer("module_id").notNull().references(() => auditModules.id),
  isApplicable: integer("is_applicable").default(1),
}, (table) => [
  uniqueIndex("uq_facility_module").on(table.facilityId, table.moduleId),
]);

export const auditSimulations = sqliteTable("audit_simulations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  userId: integer("user_id").notNull().references(() => users.id),
  simulationDate: text("simulation_date").notNull(),
  status: text("status").default("in_progress"),
  totalPoints: integer("total_points").default(0),
  earnedPoints: integer("earned_points").default(0),
  scorePct: real("score_pct").default(0),
  hasAutoFail: integer("has_auto_fail").default(0),
  grade: text("grade"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_asim_fac").on(table.facilityId),
  index("idx_asim_user").on(table.userId),
]);

export const auditResponses = sqliteTable("audit_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  simulationId: integer("simulation_id").notNull().references(() => auditSimulations.id),
  questionId: integer("question_id").notNull().references(() => auditQuestionsV2.id),
  score: integer("score").default(0),
  notes: text("notes"),
  evidenceUrl: text("evidence_url"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const auditFindings = sqliteTable("audit_findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  simulationId: integer("simulation_id").notNull().references(() => auditSimulations.id),
  questionId: integer("question_id").notNull().references(() => auditQuestionsV2.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  evidenceNotes: text("evidence_notes"),
  requiredSopCode: text("required_sop_code"),
  isAutoFail: integer("is_auto_fail").default(0),
  status: text("status").default("open"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: text("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_af_sim").on(table.simulationId),
  index("idx_af_severity").on(table.severity),
  index("idx_af_status").on(table.status),
]);

// ══════════════════════════════════════════════════════════════════
// SUPPLIERS & CERTIFICATIONS
// ══════════════════════════════════════════════════════════════════

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  supplierType: text("supplier_type"),
  approvalStatus: text("approval_status").default("pending"),
  approvedBy: integer("approved_by"),
  approvalDate: text("approval_date"),
  notes: text("notes"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_sup_status").on(table.approvalStatus),
  index("idx_sup_active").on(table.isActive),
]);

export const supplierCertifications = sqliteTable("supplier_certifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  certType: text("cert_type").notNull(),
  certName: text("cert_name"),
  issuingBody: text("issuing_body"),
  certNumber: text("cert_number"),
  issueDate: text("issue_date"),
  expiryDate: text("expiry_date").notNull(),
  status: text("status").default("valid"),
  alertDaysBefore: integer("alert_days_before").default(30),
  lastAlertSent: text("last_alert_sent"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const supplierFacilities = sqliteTable("supplier_facilities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  approved: integer("approved").default(0),
  approvedBy: integer("approved_by"),
  approvalDate: text("approval_date"),
}, (table) => [
  uniqueIndex("uq_supplier_facility").on(table.supplierId, table.facilityId),
]);

export const vendorCertifications = sqliteTable("vendor_certifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorId: text("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull(),
  itemType: text("item_type").default(""),
  certFileName: text("cert_file_name"),
  certFileData: text("cert_file_data"),
  certContentType: text("cert_content_type"),
  expirationDate: text("expiration_date"),
  notificationEmail: text("notification_email"),
  notificationSent: integer("notification_sent").default(0),
  uploadedBy: text("uploaded_by"),
  uploadedAt: text("uploaded_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ══════════════════════════════════════════════════════════════════
// PRIMUS CHECKLIST
// ══════════════════════════════════════════════════════════════════

export const primusChecklistItems = sqliteTable("primus_checklist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moduleNumber: integer("module_number").notNull(),
  moduleName: text("module_name").notNull(),
  moduleColor: text("module_color").default(""),
  sectionNumber: text("section_number").notNull(),
  sectionName: text("section_name").notNull(),
  itemCode: text("item_code").unique().notNull(),
  itemName: text("item_name").notNull(),
  hasDocument: integer("has_document").default(0),
  sortOrder: integer("sort_order").default(0),
});

export const primusDocuments = sqliteTable("primus_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => primusChecklistItems.id),
  fileName: text("file_name").notNull(),
  fileData: text("file_data").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").default(0),
  uploadedBy: text("uploaded_by"),
  uploadedAt: text("uploaded_at").default(sql`(datetime('now'))`),
  notes: text("notes").default(""),
});

// ══════════════════════════════════════════════════════════════════
// RBAC, SEARCH, TRANSACTIONS, AUDIT LOG
// ══════════════════════════════════════════════════════════════════

export const permissions = sqliteTable("permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  description: text("description"),
  category: text("category"),
});

export const rolePermissions = sqliteTable("role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role").notNull(),
  permissionCode: text("permission_code").notNull(),
}, (table) => [
  uniqueIndex("uq_role_permission").on(table.role, table.permissionCode),
]);

export const searchIndex = sqliteTable("search_index", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  tokens: text("tokens"),
  tags: text("tags"),
  facilityId: integer("facility_id"),
  url: text("url"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("uq_search_entity").on(table.entityType, table.entityId),
  index("idx_search_type").on(table.entityType),
  index("idx_search_tokens").on(table.tokens),
]);

export const transactionPrefixConfig = sqliteTable("transaction_prefix_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programType: text("program_type").unique().notNull(),
  prefix: text("prefix").notNull(),
  nextNumber: integer("next_number").default(100001),
  isActive: integer("is_active").default(1),
}, (table) => [
  index("idx_tpc_type").on(table.programType),
]);

export const transactionLog = sqliteTable("transaction_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: text("transaction_id").unique().notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  facilityId: integer("facility_id"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  status: text("status").default("submitted"),
  approvedBy: integer("approved_by"),
  approvedAt: text("approved_at"),
  voidedBy: integer("voided_by"),
  voidedAt: text("voided_at"),
  voidReason: text("void_reason"),
});

export const transactionPrintLog = sqliteTable("transaction_print_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: text("transaction_id").notNull(),
  printedBy: integer("printed_by").notNull().references(() => users.id),
  printedAt: text("printed_at").default(sql`(datetime('now'))`),
});

export const systemAuditLog = sqliteTable("system_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_sal_user").on(table.userId),
  index("idx_sal_created").on(table.createdAt),
  index("idx_sal_entity").on(table.entityType, table.entityId),
]);

// ══════════════════════════════════════════════════════════════════
// FSMS MATRIX INTEGRATION
// ══════════════════════════════════════════════════════════════════

export const fsmsStandards = sqliteTable("fsms_standards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  version: text("version").default("1.0"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const fsmsClauses = sqliteTable("fsms_clauses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  standardId: integer("standard_id").notNull().references(() => fsmsStandards.id),
  clauseCode: text("clause_code").notNull(),
  clauseTitle: text("clause_title").notNull(),
  description: text("description"),
  parentClauseId: integer("parent_clause_id"),
  sortOrder: integer("sort_order").default(0),
}, (table) => [
  uniqueIndex("uq_standard_clause").on(table.standardId, table.clauseCode),
]);

export const fsmsRequirements = sqliteTable("fsms_requirements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clauseId: integer("clause_id").notNull().references(() => fsmsClauses.id),
  requirementCode: text("requirement_code").unique().notNull(),
  requirementText: text("requirement_text").notNull(),
  criticality: text("criticality").default("major"),
  moduleId: integer("module_id").references(() => auditModules.id),
  isRequired: integer("is_required").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const requirementEvidenceLinks = sqliteTable("requirement_evidence_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requirementId: integer("requirement_id").notNull().references(() => fsmsRequirements.id),
  evidenceType: text("evidence_type").notNull(),
  evidenceId: integer("evidence_id"),
  evidenceCode: text("evidence_code"),
  evidenceTitle: text("evidence_title"),
  isPrimary: integer("is_primary").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("uq_requirement_evidence").on(table.requirementId, table.evidenceType, table.evidenceId),
]);

export const complianceAssessments = sqliteTable("compliance_assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  assessmentDate: text("assessment_date").notNull(),
  assessmentType: text("assessment_type").default("audit"),
  scope: text("scope").default("all_modules"),
  overallScore: real("overall_score"),
  overallGrade: text("overall_grade"),
  moduleScores: text("module_scores"),
  moduleStatuses: text("module_statuses"),
  sopReadinessPct: real("sop_readiness_pct"),
  checklistSubmissionsPct: real("checklist_submissions_pct"),
  auditCoveragePct: real("audit_coverage_pct"),
  criticalFindingsCount: integer("critical_findings_count").default(0),
  majorFindingsCount: integer("major_findings_count").default(0),
  minorFindingsCount: integer("minor_findings_count").default(0),
  assessedBy: integer("assessed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_comply_fac").on(table.facilityId),
]);

export const complianceRules = sqliteTable("compliance_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleCode: text("rule_code").unique().notNull(),
  ruleName: text("rule_name").notNull(),
  description: text("description"),
  ruleType: text("rule_type").notNull(),
  entityType: text("entity_type").notNull(),
  conditionJson: text("condition_json").notNull(),
  severity: text("severity").default("major"),
  moduleCode: text("module_code"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const complianceRuleResults = sqliteTable("compliance_rule_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleId: integer("rule_id").notNull().references(() => complianceRules.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  assessmentId: integer("assessment_id").references(() => complianceAssessments.id),
  status: text("status").notNull(),
  details: text("details"),
  evaluatedAt: text("evaluated_at").default(sql`(datetime('now'))`),
});

export const complianceMonitoringConfig = sqliteTable("compliance_monitoring_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  frequency: text("frequency").default("weekly"),
  lastRun: text("last_run"),
  nextRun: text("next_run"),
  isActive: integer("is_active").default(1),
  notifyOnFail: integer("notify_on_fail").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const complianceTrends = sqliteTable("compliance_trends", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  periodType: text("period_type").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  overallScore: real("overall_score"),
  overallGrade: text("overall_grade"),
  moduleScores: text("module_scores"),
  sopReadinessPct: real("sop_readiness_pct"),
  checklistPct: real("checklist_pct"),
  auditPct: real("audit_pct"),
  criticalCount: integer("critical_count").default(0),
  majorCount: integer("major_count").default(0),
  minorCount: integer("minor_count").default(0),
  rulesPassed: integer("rules_passed").default(0),
  rulesFailed: integer("rules_failed").default(0),
  rulesTotal: integer("rules_total").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const riskScores = sqliteTable("risk_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  moduleCode: text("module_code"),
  riskLevel: text("risk_level").notNull(),
  riskScore: real("risk_score").notNull(),
  contributingFactors: text("contributing_factors"),
  recommendations: text("recommendations"),
  calculatedAt: text("calculated_at").default(sql`(datetime('now'))`),
});

// ══════════════════════════════════════════════════════════════════
// TRAINING & CERTIFICATION + NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════

export const trainingRecords = sqliteTable("training_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  facilityId: integer("facility_id").references(() => facilities.id),
  trainingType: text("training_type").notNull(),
  trainingTitle: text("training_title").notNull(),
  description: text("description"),
  trainerName: text("trainer_name"),
  trainingDate: text("training_date").notNull(),
  expiryDate: text("expiry_date"),
  hours: real("hours").default(0),
  score: real("score"),
  status: text("status").default("completed"),
  certificateFile: text("certificate_file"),
  moduleCode: text("module_code"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_train_user").on(table.userId),
  index("idx_train_status").on(table.status),
]);

export const trainingRequirements = sqliteTable("training_requirements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  trainingType: text("training_type").notNull(),
  frequencyDays: integer("frequency_days"),
  isRequired: integer("is_required").default(1),
  moduleCode: text("module_code"),
  role: text("role"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const workerCertifications = sqliteTable("worker_certifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  certType: text("cert_type").notNull(),
  certName: text("cert_name").notNull(),
  issuingBody: text("issuing_body"),
  certNumber: text("cert_number"),
  issueDate: text("issue_date").notNull(),
  expiryDate: text("expiry_date"),
  status: text("status").default("active"),
  certFile: text("cert_file"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  facilityId: integer("facility_id").references(() => facilities.id),
  notificationType: text("notification_type").notNull(),
  severity: text("severity").default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  isRead: integer("is_read").default(0),
  isDismissed: integer("is_dismissed").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_notif_user").on(table.userId),
  index("idx_notif_read").on(table.isRead),
  index("idx_notif_created").on(table.createdAt),
]);

export const appModuleConfig = sqliteTable("app_module_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moduleKey: text("module_key").unique().notNull(),
  moduleName: text("module_name").notNull(),
  moduleGroup: text("module_group").notNull(),
  isEnabled: integer("is_enabled").default(1),
  description: text("description"),
}, (table) => [
  index("idx_amc_enabled").on(table.isEnabled),
]);

// ══════════════════════════════════════════════════════════════════
// OPERATIONS TASK ENGINE
// ══════════════════════════════════════════════════════════════════

export const opsTaskTemplates = sqliteTable("ops_task_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  defaultFacilityTypes: text("default_facility_types").default("all"),
  requiresApproval: integer("requires_approval").default(0),
  isCoreDaily: integer("is_core_daily").default(1),
  isActive: integer("is_active").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_ott_code").on(table.code),
  index("idx_ott_active").on(table.isActive),
]);

export const opsTaskFields = sqliteTable("ops_task_fields", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => opsTaskTemplates.id),
  fieldKey: text("field_key").notNull(),
  fieldLabel: text("field_label").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  optionsJson: text("options_json"),
  placeholder: text("placeholder"),
  defaultValue: text("default_value"),
  isRequired: integer("is_required").default(0),
  autoCalcRule: text("auto_calc_rule"),
  sortOrder: integer("sort_order").default(0),
}, (table) => [
  uniqueIndex("uq_template_field").on(table.templateId, table.fieldKey),
  index("idx_otf_template").on(table.templateId),
]);

export const opsTaskSchedules = sqliteTable("ops_task_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => opsTaskTemplates.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  recurrence: text("recurrence").notNull().default("daily"),
  daysOfWeek: text("days_of_week"),
  assignedRole: text("assigned_role").default("worker"),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  timeDue: text("time_due").default("17:00"),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_ots_template").on(table.templateId),
  index("idx_ots_facility").on(table.facilityId),
  index("idx_ots_active").on(table.isActive),
]);

export const opsTaskInstances = sqliteTable("ops_task_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scheduleId: integer("schedule_id").references(() => opsTaskSchedules.id),
  templateId: integer("template_id").notNull().references(() => opsTaskTemplates.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  dueDate: text("due_date").notNull(),
  transactionId: text("transaction_id").unique(),
  status: text("status").notNull().default("pending"),
  submittedBy: integer("submitted_by").references(() => users.id),
  submittedAt: text("submitted_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oti_facility").on(table.facilityId),
  index("idx_oti_due").on(table.dueDate),
  index("idx_oti_status").on(table.status),
  index("idx_oti_assigned").on(table.assignedUserId),
  index("idx_oti_txn").on(table.transactionId),
  index("idx_oti_template").on(table.templateId),
]);

export const opsTaskResponses = sqliteTable("ops_task_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instanceId: integer("instance_id").notNull().references(() => opsTaskInstances.id),
  fieldId: integer("field_id").notNull().references(() => opsTaskFields.id),
  fieldKey: text("field_key").notNull(),
  valueText: text("value_text"),
  valueNumber: real("value_number"),
  valueBoolean: integer("value_boolean"),
  valueJson: text("value_json"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_otr_instance").on(table.instanceId),
]);

// ══════════════════════════════════════════════════════════════════
// PROGRAM TASKS
// ══════════════════════════════════════════════════════════════════

export const programTasks = sqliteTable("program_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(),
  priority: text("priority").default("MEDIUM"),
  status: text("status").default("pending"),
  phase: text("phase"),
  owner: text("owner"),
  effortEstimate: text("effort_estimate"),
  targetDate: text("target_date"),
  completionDate: text("completion_date"),
  linkedSopCode: text("linked_sop_code"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_pt_type").on(table.taskType),
  index("idx_pt_status").on(table.status),
  index("idx_pt_priority").on(table.priority),
  index("idx_pt_phase").on(table.phase),
  index("idx_pt_owner").on(table.owner),
]);

// ══════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ══════════════════════════════════════════════════════════════════

export type User = typeof users.$inferSelect;
export type PreHarvestLog = typeof preHarvestLogs.$inferSelect;
export type ChemicalApplication = typeof chemicalApplications.$inferSelect;
export type ChemicalStorageItem = typeof chemicalStorage.$inferSelect;
export type Nonconformance = typeof nonconformances.$inferSelect;
export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type AuditChecklist = typeof auditChecklists.$inferSelect;
export type Facility = typeof facilities.$inferSelect;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type ChecklistSubmission = typeof checklistSubmissions.$inferSelect;
export type SopDocument = typeof sopDocuments.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type AuditSimulation = typeof auditSimulations.$inferSelect;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type OpsTaskTemplate = typeof opsTaskTemplates.$inferSelect;
export type OpsTaskInstance = typeof opsTaskInstances.$inferSelect;
export type ProgramTask = typeof programTasks.$inferSelect;
