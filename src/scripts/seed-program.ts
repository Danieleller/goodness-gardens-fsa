/**
 * Seed script for FSQA Portal — Food Safety Primus Program
 *
 * Populates:
 *  a) 7 Facilities
 *  b) 52 SOPs
 *  c) Facility Applicability (SOP × Facility)
 *  d) 68 KISS Forms (checklist templates)
 *  e) Compliance Crosswalk (standards, clauses, requirements, evidence links)
 *  f) Audit Modules
 *  g) ~65 Program Tasks
 *
 * Usage: npx tsx src/scripts/seed-program.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set");
  process.exit(1);
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

// ═══════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// a) 7 Facilities
const FACILITIES = [
  { code: "PS-TX", name: "Pearsall TX", facilityType: "Farm+Greenhouse", location: "Pearsall, TX" },
  { code: "SA-TX", name: "San Antonio TX", facilityType: "Pack", location: "San Antonio, TX" },
  { code: "DO-FL", name: "Doral FL", facilityType: "Pack", location: "Doral, FL" },
  { code: "MD-FL", name: "Mt Dora FL", facilityType: "Greenhouse", location: "Mt Dora, FL" },
  { code: "NH-NY", name: "New Hampton NY", facilityType: "Full (Grow+Pack)", location: "New Hampton, NY" },
  { code: "AL-PA", name: "Allentown PA", facilityType: "Full (Grow+Pack)", location: "Allentown, PA" },
  { code: "FR-IN", name: "Francesville IN", facilityType: "Grow+Pack", location: "Francesville, IN" },
];

// b) 52 SOPs — Master SOP Library Index
const SOPS: {
  code: string; title: string; category: string; phase: string;
  sopType: string; priority: string; primusRef: string; nopRef: string;
  reviewOwner: string; facilityTypes: string;
}[] = [
  // Phase 1 — Management SOPs (1-10)
  { code: "SOP-001", title: "Food Safety Policy & Management Commitment", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.1", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-002", title: "FSMS Manual & Document Control", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.2", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-003", title: "Organizational Chart & Responsibilities", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.3", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-004", title: "Internal Audit Program", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.4", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-005", title: "Management Review & Continuous Improvement", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.5", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-006", title: "Corrective & Preventive Action (CAPA)", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.6", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-007", title: "Regulatory Compliance & Legal Requirements", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.7", nopRef: "§205.201", reviewOwner: "Dael", facilityTypes: "All" },
  { code: "SOP-008", title: "Customer Complaint Handling", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.8", nopRef: "", reviewOwner: "Rachel", facilityTypes: "All" },
  { code: "SOP-009", title: "Supplier & Vendor Approval Program", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.9", nopRef: "§205.201", reviewOwner: "Dael", facilityTypes: "All" },
  { code: "SOP-010", title: "Traceability & Recall Program", category: "Management", phase: "Phase 1", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.10", nopRef: "§205.201", reviewOwner: "Danielle", facilityTypes: "All" },

  // Phase 1 — Growing Operations SOPs (11-20)
  { code: "SOP-011", title: "Site Assessment & Land Use History", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M3-3.1", nopRef: "§205.202", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-012", title: "Water Management — Agricultural & Irrigation", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M3-3.2", nopRef: "§205.202", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-013", title: "Soil Amendments & Biological Inputs", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M3-3.3", nopRef: "§205.203", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-014", title: "Integrated Pest Management (IPM) — Growing", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M3-3.4", nopRef: "§205.206", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-015", title: "Worker Hygiene & Health — Field Operations", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M3-3.5", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-016", title: "Greenhouse/CEA Environmental Controls", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M3-3.6", nopRef: "", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-017", title: "Harvest & Field Packing Operations", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M3-3.7", nopRef: "", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-018", title: "Growing Equipment Sanitation", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M3-3.8", nopRef: "", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-019", title: "Animal & Intrusion Prevention — Growing Areas", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M3-3.9", nopRef: "", reviewOwner: "Connor", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-020", title: "Organic Integrity — Growing Operations", category: "Growing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "", nopRef: "§205.200-206", reviewOwner: "Dael", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },

  // Phase 1 — Packing Operations SOPs (21-30)
  { code: "SOP-021", title: "Receiving & Raw Material Inspection", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.1", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-022", title: "Cold Chain Management & Temperature Control", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.2", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-023", title: "Sanitation & Cleaning Program — Facility", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.3", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-024", title: "Worker Hygiene & Health — Packing Facility", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.4", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-025", title: "Allergen & Cross-Contamination Control", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.5", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-026", title: "Foreign Material Prevention (Glass & Brittle)", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.6", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-027", title: "Chemical Control — Packing Facility", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.7", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-028", title: "Labeling & Packaging Integrity", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.8", nopRef: "§205.300-311", reviewOwner: "Rachel", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-029", title: "Water Management — Facility Operations", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.9", nopRef: "", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-030", title: "Pest Control Program — Facility", category: "Packing Ops", phase: "Phase 1", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.10", nopRef: "§205.206", reviewOwner: "Danielle", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },

  // Phase 2 — Maintenance & Shipping (31-37)
  { code: "SOP-031", title: "Preventive Maintenance Program", category: "Maintenance", phase: "Phase 2", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.11", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-032", title: "Calibration & Monitoring Equipment", category: "Maintenance", phase: "Phase 2", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.12", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-033", title: "Waste Management & Environmental Controls", category: "Maintenance", phase: "Phase 2", sopType: "Operational", priority: "MEDIUM", primusRef: "M5-5.13", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-034", title: "Facility Design, Construction & Maintenance", category: "Maintenance", phase: "Phase 2", sopType: "Standalone", priority: "MEDIUM", primusRef: "M5-5.14", nopRef: "", reviewOwner: "Daniel", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-035", title: "Loading, Shipping & Transportation", category: "Shipping", phase: "Phase 2", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.15", nopRef: "", reviewOwner: "Rachel", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-036", title: "Vehicle & Equipment Hygiene", category: "Shipping", phase: "Phase 2", sopType: "Operational", priority: "MEDIUM", primusRef: "M5-5.16", nopRef: "", reviewOwner: "Rachel", facilityTypes: "All" },
  { code: "SOP-037", title: "Cold Chain Verification — Transport", category: "Shipping", phase: "Phase 2", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.17", nopRef: "", reviewOwner: "Rachel", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },

  // Phase 2 — Support & Quality (38-44)
  { code: "SOP-038", title: "Training & Competency Program", category: "Support", phase: "Phase 2", sopType: "Standalone", priority: "CRITICAL", primusRef: "M1-1.11", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-039", title: "Emergency Preparedness & Response", category: "Support", phase: "Phase 2", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.12", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-040", title: "Food Defense & Intentional Adulteration", category: "Support", phase: "Phase 2", sopType: "Standalone", priority: "HIGH", primusRef: "M1-1.13", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-041", title: "Food Fraud & Economically Motivated Adulteration", category: "Support", phase: "Phase 2", sopType: "Standalone", priority: "MEDIUM", primusRef: "M1-1.14", nopRef: "", reviewOwner: "Dael", facilityTypes: "All" },
  { code: "SOP-042", title: "Sampling & Laboratory Testing", category: "Quality", phase: "Phase 2", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.18", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },
  { code: "SOP-043", title: "Product Specifications & Quality Standards", category: "Quality", phase: "Phase 2", sopType: "Standalone", priority: "HIGH", primusRef: "M5-5.19", nopRef: "", reviewOwner: "Rachel", facilityTypes: "All" },
  { code: "SOP-044", title: "Microbiological Testing Program", category: "Quality", phase: "Phase 2", sopType: "Operational", priority: "CRITICAL", primusRef: "M5-5.20", nopRef: "", reviewOwner: "Danielle", facilityTypes: "All" },

  // Phase 3 — HR/Admin, Inventory, Logistics, Planning, Finance, Sales/CS (45-52)
  { code: "SOP-045", title: "Personnel Records & Onboarding", category: "HR/Admin", phase: "Phase 3", sopType: "Standalone", priority: "MEDIUM", primusRef: "", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-046", title: "Visitor & Contractor Policy", category: "HR/Admin", phase: "Phase 3", sopType: "Standalone", priority: "MEDIUM", primusRef: "M1-1.15", nopRef: "", reviewOwner: "Daniel", facilityTypes: "All" },
  { code: "SOP-047", title: "Inventory Management & Stock Rotation", category: "Inventory", phase: "Phase 3", sopType: "Operational", priority: "HIGH", primusRef: "M5-5.21", nopRef: "", reviewOwner: "Rachel", facilityTypes: "Pack,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-048", title: "Seed & Input Material Sourcing", category: "Inventory", phase: "Phase 3", sopType: "Operational", priority: "MEDIUM", primusRef: "", nopRef: "§205.204", reviewOwner: "Dael", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-049", title: "Logistics Coordination & Scheduling", category: "Logistics", phase: "Phase 3", sopType: "Standalone", priority: "MEDIUM", primusRef: "", nopRef: "", reviewOwner: "Rachel", facilityTypes: "All" },
  { code: "SOP-050", title: "Production Planning & Yield Tracking", category: "Planning", phase: "Phase 3", sopType: "Standalone", priority: "MEDIUM", primusRef: "", nopRef: "", reviewOwner: "Daniel", facilityTypes: "Farm+Greenhouse,Greenhouse,Full (Grow+Pack),Grow+Pack" },
  { code: "SOP-051", title: "Financial Controls & Purchasing Authority", category: "Finance", phase: "Phase 3", sopType: "Standalone", priority: "LOW", primusRef: "", nopRef: "", reviewOwner: "Dael", facilityTypes: "All" },
  { code: "SOP-052", title: "Customer Communication & Sales Orders", category: "Sales/CS", phase: "Phase 3", sopType: "Standalone", priority: "MEDIUM", primusRef: "", nopRef: "", reviewOwner: "Rachel", facilityTypes: "All" },
];

// Facility applicability matrix: which SOPs apply to which facility types
function sopAppliesToFacility(sopFacilityTypes: string, facilityType: string): boolean {
  if (sopFacilityTypes === "All") return true;
  const types = sopFacilityTypes.split(",").map(t => t.trim());
  return types.includes(facilityType);
}

// d) 68 KISS Forms
const KISS_FORMS: {
  code: string; title: string; linkedSop: string; category: string;
  frequency: string; phase: string;
}[] = [
  // Management KISS forms
  { code: "KISS-001", title: "Food Safety Policy Acknowledgment", linkedSop: "SOP-001", category: "Management", frequency: "Annual", phase: "Phase 1" },
  { code: "KISS-002", title: "Document Change Request", linkedSop: "SOP-002", category: "Management", frequency: "As Needed", phase: "Phase 1" },
  { code: "KISS-003", title: "Document Distribution Log", linkedSop: "SOP-002", category: "Management", frequency: "As Needed", phase: "Phase 1" },
  { code: "KISS-004", title: "Internal Audit Schedule", linkedSop: "SOP-004", category: "Management", frequency: "Annual", phase: "Phase 1" },
  { code: "KISS-005", title: "Internal Audit Report", linkedSop: "SOP-004", category: "Management", frequency: "Per Audit", phase: "Phase 1" },
  { code: "KISS-006", title: "Management Review Minutes", linkedSop: "SOP-005", category: "Management", frequency: "Quarterly", phase: "Phase 1" },
  { code: "KISS-007", title: "CAPA Log", linkedSop: "SOP-006", category: "Management", frequency: "Ongoing", phase: "Phase 1" },
  { code: "KISS-008", title: "CAPA Investigation Worksheet", linkedSop: "SOP-006", category: "Management", frequency: "Per Event", phase: "Phase 1" },
  { code: "KISS-009", title: "Regulatory Requirements Register", linkedSop: "SOP-007", category: "Management", frequency: "Annual", phase: "Phase 1" },
  { code: "KISS-010", title: "Customer Complaint Log", linkedSop: "SOP-008", category: "Management", frequency: "Ongoing", phase: "Phase 1" },
  { code: "KISS-011", title: "Approved Supplier List", linkedSop: "SOP-009", category: "Management", frequency: "Annual", phase: "Phase 1" },
  { code: "KISS-012", title: "Supplier Audit Checklist", linkedSop: "SOP-009", category: "Management", frequency: "Per Supplier", phase: "Phase 1" },
  { code: "KISS-013", title: "Mock Recall Exercise Report", linkedSop: "SOP-010", category: "Management", frequency: "Semi-Annual", phase: "Phase 1" },
  { code: "KISS-014", title: "Traceability Test Record", linkedSop: "SOP-010", category: "Management", frequency: "Semi-Annual", phase: "Phase 1" },

  // Growing Ops KISS forms
  { code: "KISS-015", title: "Site Assessment Form", linkedSop: "SOP-011", category: "Growing Ops", frequency: "Annual", phase: "Phase 1" },
  { code: "KISS-016", title: "Water Testing Log — Agricultural", linkedSop: "SOP-012", category: "Growing Ops", frequency: "Per Test", phase: "Phase 1" },
  { code: "KISS-017", title: "Irrigation System Inspection", linkedSop: "SOP-012", category: "Growing Ops", frequency: "Weekly", phase: "Phase 1" },
  { code: "KISS-018", title: "Soil Amendment Application Log", linkedSop: "SOP-013", category: "Growing Ops", frequency: "Per Application", phase: "Phase 1" },
  { code: "KISS-019", title: "Compost Temperature Monitoring", linkedSop: "SOP-013", category: "Growing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-020", title: "IPM Scouting Log — Growing", linkedSop: "SOP-014", category: "Growing Ops", frequency: "Weekly", phase: "Phase 1" },
  { code: "KISS-021", title: "Pesticide Application Record", linkedSop: "SOP-014", category: "Growing Ops", frequency: "Per Application", phase: "Phase 1" },
  { code: "KISS-022", title: "Worker Health Screening — Field", linkedSop: "SOP-015", category: "Growing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-023", title: "Restroom & Handwash Station Log", linkedSop: "SOP-015", category: "Growing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-024", title: "Greenhouse Environmental Log", linkedSop: "SOP-016", category: "Growing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-025", title: "Harvest Crew Daily Checklist", linkedSop: "SOP-017", category: "Growing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-026", title: "Equipment Cleaning Verification — Growing", linkedSop: "SOP-018", category: "Growing Ops", frequency: "Per Shift", phase: "Phase 1" },
  { code: "KISS-027", title: "Animal Intrusion Incident Report", linkedSop: "SOP-019", category: "Growing Ops", frequency: "Per Event", phase: "Phase 1" },
  { code: "KISS-028", title: "Organic Integrity Checklist", linkedSop: "SOP-020", category: "Growing Ops", frequency: "Monthly", phase: "Phase 1" },

  // Packing Ops KISS forms
  { code: "KISS-029", title: "Receiving Inspection Log", linkedSop: "SOP-021", category: "Packing Ops", frequency: "Per Receipt", phase: "Phase 1" },
  { code: "KISS-030", title: "Incoming Product Temperature Log", linkedSop: "SOP-021", category: "Packing Ops", frequency: "Per Receipt", phase: "Phase 1" },
  { code: "KISS-031", title: "Cooler Temperature Monitoring Log", linkedSop: "SOP-022", category: "Packing Ops", frequency: "Twice Daily", phase: "Phase 1" },
  { code: "KISS-032", title: "Cold Chain Deviation Report", linkedSop: "SOP-022", category: "Packing Ops", frequency: "Per Event", phase: "Phase 1" },
  { code: "KISS-033", title: "Pre-Op Sanitation Checklist", linkedSop: "SOP-023", category: "Packing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-034", title: "Post-Op Sanitation Checklist", linkedSop: "SOP-023", category: "Packing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-035", title: "Sanitation Chemical Verification", linkedSop: "SOP-023", category: "Packing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-036", title: "Worker Health Screening — Packing", linkedSop: "SOP-024", category: "Packing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-037", title: "GMP Compliance Checklist", linkedSop: "SOP-024", category: "Packing Ops", frequency: "Daily", phase: "Phase 1" },
  { code: "KISS-038", title: "Allergen Control Checklist", linkedSop: "SOP-025", category: "Packing Ops", frequency: "Per Changeover", phase: "Phase 1" },
  { code: "KISS-039", title: "Glass & Brittle Inventory", linkedSop: "SOP-026", category: "Packing Ops", frequency: "Monthly", phase: "Phase 1" },
  { code: "KISS-040", title: "Foreign Material Incident Report", linkedSop: "SOP-026", category: "Packing Ops", frequency: "Per Event", phase: "Phase 1" },
  { code: "KISS-041", title: "Chemical Storage Inspection", linkedSop: "SOP-027", category: "Packing Ops", frequency: "Weekly", phase: "Phase 1" },
  { code: "KISS-042", title: "Label Verification Checklist", linkedSop: "SOP-028", category: "Packing Ops", frequency: "Per Run", phase: "Phase 1" },
  { code: "KISS-043", title: "Water Testing Log — Facility", linkedSop: "SOP-029", category: "Packing Ops", frequency: "Per Test", phase: "Phase 1" },
  { code: "KISS-044", title: "Pest Control Service Report", linkedSop: "SOP-030", category: "Packing Ops", frequency: "Per Visit", phase: "Phase 1" },
  { code: "KISS-045", title: "Pest Sighting Log", linkedSop: "SOP-030", category: "Packing Ops", frequency: "Ongoing", phase: "Phase 1" },

  // Maintenance & Shipping KISS forms
  { code: "KISS-046", title: "Preventive Maintenance Schedule", linkedSop: "SOP-031", category: "Maintenance", frequency: "Annual", phase: "Phase 2" },
  { code: "KISS-047", title: "Maintenance Work Order", linkedSop: "SOP-031", category: "Maintenance", frequency: "Per Request", phase: "Phase 2" },
  { code: "KISS-048", title: "Calibration Log", linkedSop: "SOP-032", category: "Maintenance", frequency: "Per Event", phase: "Phase 2" },
  { code: "KISS-049", title: "Waste Disposal Log", linkedSop: "SOP-033", category: "Maintenance", frequency: "Weekly", phase: "Phase 2" },
  { code: "KISS-050", title: "Shipping Temperature Log", linkedSop: "SOP-035", category: "Shipping", frequency: "Per Shipment", phase: "Phase 2" },
  { code: "KISS-051", title: "Trailer Inspection Checklist", linkedSop: "SOP-035", category: "Shipping", frequency: "Per Shipment", phase: "Phase 2" },
  { code: "KISS-052", title: "Vehicle Sanitation Log", linkedSop: "SOP-036", category: "Shipping", frequency: "Per Use", phase: "Phase 2" },
  { code: "KISS-053", title: "Transport Temperature Verification", linkedSop: "SOP-037", category: "Shipping", frequency: "Per Shipment", phase: "Phase 2" },

  // Support & Quality KISS forms
  { code: "KISS-054", title: "Training Attendance Record", linkedSop: "SOP-038", category: "Support", frequency: "Per Session", phase: "Phase 2" },
  { code: "KISS-055", title: "Training Competency Assessment", linkedSop: "SOP-038", category: "Support", frequency: "Per Session", phase: "Phase 2" },
  { code: "KISS-056", title: "Emergency Drill Record", linkedSop: "SOP-039", category: "Support", frequency: "Semi-Annual", phase: "Phase 2" },
  { code: "KISS-057", title: "Food Defense Vulnerability Assessment", linkedSop: "SOP-040", category: "Support", frequency: "Annual", phase: "Phase 2" },
  { code: "KISS-058", title: "Food Fraud Risk Assessment", linkedSop: "SOP-041", category: "Support", frequency: "Annual", phase: "Phase 2" },
  { code: "KISS-059", title: "Sampling Plan & Schedule", linkedSop: "SOP-042", category: "Quality", frequency: "Annual", phase: "Phase 2" },
  { code: "KISS-060", title: "Lab Test Results Log", linkedSop: "SOP-042", category: "Quality", frequency: "Per Test", phase: "Phase 2" },
  { code: "KISS-061", title: "Product Specification Sheet", linkedSop: "SOP-043", category: "Quality", frequency: "Per Product", phase: "Phase 2" },
  { code: "KISS-062", title: "Micro Testing Schedule & Results", linkedSop: "SOP-044", category: "Quality", frequency: "Per Test", phase: "Phase 2" },

  // Phase 3 KISS forms
  { code: "KISS-063", title: "New Hire Onboarding Checklist", linkedSop: "SOP-045", category: "HR/Admin", frequency: "Per Hire", phase: "Phase 3" },
  { code: "KISS-064", title: "Visitor Sign-In Log", linkedSop: "SOP-046", category: "HR/Admin", frequency: "Daily", phase: "Phase 3" },
  { code: "KISS-065", title: "Inventory Count Sheet", linkedSop: "SOP-047", category: "Inventory", frequency: "Weekly", phase: "Phase 3" },
  { code: "KISS-066", title: "Seed & Input Receiving Log", linkedSop: "SOP-048", category: "Inventory", frequency: "Per Receipt", phase: "Phase 3" },
  { code: "KISS-067", title: "Delivery Schedule & Manifest", linkedSop: "SOP-049", category: "Logistics", frequency: "Daily", phase: "Phase 3" },
  { code: "KISS-068", title: "Production Planning Worksheet", linkedSop: "SOP-050", category: "Planning", frequency: "Weekly", phase: "Phase 3" },
];

// e) Compliance Crosswalk — PrimusGFS v4.0 Clauses
// M1 FSMS (33 clauses), M3 Greenhouse/CEA (10 clauses), M5 GMP/Facility (12 clauses)
const CLAUSES: {
  module: string; code: string; title: string;
  requirementText: string; criticality: string; isAutoFail: boolean;
  sopCodes: string[];
}[] = [
  // M1 FSMS — 33 clauses
  { module: "M1", code: "M1-1.01", title: "Food Safety Policy", requirementText: "Documented food safety policy signed by senior management, communicated to all staff", criticality: "major", isAutoFail: false, sopCodes: ["SOP-001"] },
  { module: "M1", code: "M1-1.02", title: "FSMS Scope & Manual", requirementText: "FSMS manual defining scope, processes, and procedures", criticality: "major", isAutoFail: false, sopCodes: ["SOP-002"] },
  { module: "M1", code: "M1-1.03", title: "Document Control", requirementText: "Controlled document system with version control and distribution", criticality: "major", isAutoFail: false, sopCodes: ["SOP-002"] },
  { module: "M1", code: "M1-1.04", title: "Organizational Structure", requirementText: "Organizational chart with defined roles and responsibilities for food safety", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-003"] },
  { module: "M1", code: "M1-1.05", title: "Management Responsibility", requirementText: "Senior management demonstrates commitment with resources and authority", criticality: "major", isAutoFail: false, sopCodes: ["SOP-001", "SOP-003"] },
  { module: "M1", code: "M1-1.06", title: "Internal Audit Program", requirementText: "Annual internal audit program covering all FSMS elements", criticality: "major", isAutoFail: false, sopCodes: ["SOP-004"] },
  { module: "M1", code: "M1-1.07", title: "Internal Audit Competency", requirementText: "Internal auditors trained and competent, independent of audited area", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-004", "SOP-038"] },
  { module: "M1", code: "M1-1.08", title: "Management Review", requirementText: "Scheduled management review of FSMS performance with documented minutes", criticality: "major", isAutoFail: false, sopCodes: ["SOP-005"] },
  { module: "M1", code: "M1-1.09", title: "Continuous Improvement", requirementText: "Process for identifying and implementing improvements to the FSMS", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-005", "SOP-006"] },
  { module: "M1", code: "M1-1.10", title: "Corrective Action Process", requirementText: "Documented CAPA process with root cause analysis and verification", criticality: "major", isAutoFail: false, sopCodes: ["SOP-006"] },
  { module: "M1", code: "M1-1.11", title: "Preventive Action", requirementText: "System for identifying potential non-conformances and implementing preventive measures", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-006"] },
  { module: "M1", code: "M1-1.12", title: "Regulatory Compliance", requirementText: "Register of applicable food safety regulations with compliance monitoring", criticality: "major", isAutoFail: false, sopCodes: ["SOP-007"] },
  { module: "M1", code: "M1-1.13", title: "Legal Updates", requirementText: "Process for monitoring and implementing regulatory changes", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-007"] },
  { module: "M1", code: "M1-1.14", title: "Customer Complaints", requirementText: "Documented complaint handling process with investigation and response", criticality: "major", isAutoFail: false, sopCodes: ["SOP-008"] },
  { module: "M1", code: "M1-1.15", title: "Supplier Approval", requirementText: "Supplier approval program with risk assessment and monitoring", criticality: "major", isAutoFail: false, sopCodes: ["SOP-009"] },
  { module: "M1", code: "M1-1.16", title: "Supplier Monitoring", requirementText: "Ongoing supplier performance monitoring and re-evaluation", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-009"] },
  { module: "M1", code: "M1-1.17", title: "Incoming Material Specs", requirementText: "Specifications for all incoming materials with acceptance criteria", criticality: "major", isAutoFail: false, sopCodes: ["SOP-009", "SOP-021"] },
  { module: "M1", code: "M1-1.18", title: "Traceability System", requirementText: "One-up/one-back traceability for all products within 4 hours", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-010"] },
  { module: "M1", code: "M1-1.19", title: "Recall Program", requirementText: "Documented recall/withdrawal procedure with contact list and mock recall exercises", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-010"] },
  { module: "M1", code: "M1-1.20", title: "Mock Recall", requirementText: "Annual mock recall exercise with documented results and improvements", criticality: "major", isAutoFail: false, sopCodes: ["SOP-010"] },
  { module: "M1", code: "M1-1.21", title: "Training Program", requirementText: "Documented training program covering food safety, hygiene, and job-specific skills", criticality: "major", isAutoFail: false, sopCodes: ["SOP-038"] },
  { module: "M1", code: "M1-1.22", title: "Training Records", requirementText: "Maintained training records with competency assessments", criticality: "major", isAutoFail: false, sopCodes: ["SOP-038"] },
  { module: "M1", code: "M1-1.23", title: "Training Effectiveness", requirementText: "Assessment of training effectiveness with retraining as needed", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-038"] },
  { module: "M1", code: "M1-1.24", title: "Emergency Preparedness", requirementText: "Emergency response plan with contact information and drill schedule", criticality: "major", isAutoFail: false, sopCodes: ["SOP-039"] },
  { module: "M1", code: "M1-1.25", title: "Emergency Drills", requirementText: "Regular emergency drills with documented results", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-039"] },
  { module: "M1", code: "M1-1.26", title: "Food Defense Plan", requirementText: "Food defense vulnerability assessment and mitigation strategies", criticality: "major", isAutoFail: false, sopCodes: ["SOP-040"] },
  { module: "M1", code: "M1-1.27", title: "Food Defense Monitoring", requirementText: "Monitoring and verification of food defense controls", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-040"] },
  { module: "M1", code: "M1-1.28", title: "Food Fraud Vulnerability", requirementText: "Food fraud vulnerability assessment and mitigation plan", criticality: "major", isAutoFail: false, sopCodes: ["SOP-041"] },
  { module: "M1", code: "M1-1.29", title: "Visitor & Contractor Policy", requirementText: "Policy for visitor and contractor access with hygiene requirements", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-046"] },
  { module: "M1", code: "M1-1.30", title: "Record Keeping", requirementText: "Record retention policy meeting regulatory requirements (minimum 2 years)", criticality: "major", isAutoFail: false, sopCodes: ["SOP-002"] },
  { module: "M1", code: "M1-1.31", title: "Product Specifications", requirementText: "Documented product specifications for all finished products", criticality: "major", isAutoFail: false, sopCodes: ["SOP-043"] },
  { module: "M1", code: "M1-1.32", title: "Product Release", requirementText: "Positive release procedures ensuring only conforming product is shipped", criticality: "major", isAutoFail: false, sopCodes: ["SOP-043", "SOP-021"] },
  { module: "M1", code: "M1-1.33", title: "Communication", requirementText: "Internal and external communication procedures for food safety matters", criticality: "minor", isAutoFail: false, sopCodes: ["SOP-001", "SOP-008"] },

  // M3 Greenhouse/CEA — 10 clauses
  { module: "M3", code: "M3-3.01", title: "Site History & Assessment", requirementText: "Documented site assessment including previous land use and risk evaluation", criticality: "major", isAutoFail: false, sopCodes: ["SOP-011"] },
  { module: "M3", code: "M3-3.02", title: "Water Quality — Agricultural", requirementText: "Water testing program for agricultural water meeting microbial standards", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-012"] },
  { module: "M3", code: "M3-3.03", title: "Irrigation Management", requirementText: "Irrigation system maintenance and water source protection", criticality: "major", isAutoFail: false, sopCodes: ["SOP-012"] },
  { module: "M3", code: "M3-3.04", title: "Soil Amendments", requirementText: "Biological soil amendment controls with proper treatment and application intervals", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-013"] },
  { module: "M3", code: "M3-3.05", title: "Crop Protection Materials", requirementText: "Approved crop protection materials with proper application and PHI compliance", criticality: "major", isAutoFail: false, sopCodes: ["SOP-014"] },
  { module: "M3", code: "M3-3.06", title: "Worker Hygiene — Growing", requirementText: "Worker hygiene program with sanitary facilities in growing areas", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-015"] },
  { module: "M3", code: "M3-3.07", title: "CEA Environmental Controls", requirementText: "Monitoring and control of greenhouse environmental parameters", criticality: "major", isAutoFail: false, sopCodes: ["SOP-016"] },
  { module: "M3", code: "M3-3.08", title: "Harvest Practices", requirementText: "Hygienic harvest practices preventing contamination of product", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-017"] },
  { module: "M3", code: "M3-3.09", title: "Equipment Sanitation — Growing", requirementText: "Cleaning and sanitation of growing and harvest equipment", criticality: "major", isAutoFail: false, sopCodes: ["SOP-018"] },
  { module: "M3", code: "M3-3.10", title: "Animal Control — Growing", requirementText: "Measures to prevent animal intrusion and contamination in growing areas", criticality: "major", isAutoFail: false, sopCodes: ["SOP-019"] },

  // M5 GMP/Facility — 12 clauses
  { module: "M5", code: "M5-5.01", title: "Receiving Controls", requirementText: "Incoming product inspection, temperature checks, and rejection criteria", criticality: "major", isAutoFail: false, sopCodes: ["SOP-021"] },
  { module: "M5", code: "M5-5.02", title: "Cold Storage Management", requirementText: "Temperature monitoring and control in all cold storage areas", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-022"] },
  { module: "M5", code: "M5-5.03", title: "Sanitation Program", requirementText: "Master sanitation schedule with pre-op and post-op procedures", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-023"] },
  { module: "M5", code: "M5-5.04", title: "Personnel Hygiene — Facility", requirementText: "Worker hygiene practices, handwashing, and GMP compliance in facility", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-024"] },
  { module: "M5", code: "M5-5.05", title: "Cross-Contamination Prevention", requirementText: "Controls to prevent cross-contamination including allergen management", criticality: "major", isAutoFail: false, sopCodes: ["SOP-025"] },
  { module: "M5", code: "M5-5.06", title: "Foreign Material Controls", requirementText: "Glass and brittle plastics policy with breakage procedures", criticality: "major", isAutoFail: false, sopCodes: ["SOP-026"] },
  { module: "M5", code: "M5-5.07", title: "Chemical Management — Facility", requirementText: "Chemical storage, handling, and inventory control in facility", criticality: "major", isAutoFail: false, sopCodes: ["SOP-027"] },
  { module: "M5", code: "M5-5.08", title: "Packaging & Labeling", requirementText: "Product labeling accuracy and packaging material controls", criticality: "major", isAutoFail: false, sopCodes: ["SOP-028"] },
  { module: "M5", code: "M5-5.09", title: "Water Quality — Facility", requirementText: "Facility water testing and potability verification", criticality: "critical", isAutoFail: true, sopCodes: ["SOP-029"] },
  { module: "M5", code: "M5-5.10", title: "Pest Management — Facility", requirementText: "Integrated pest management program with licensed operator", criticality: "major", isAutoFail: false, sopCodes: ["SOP-030"] },
  { module: "M5", code: "M5-5.11", title: "Preventive Maintenance", requirementText: "Scheduled preventive maintenance for all food contact equipment", criticality: "major", isAutoFail: false, sopCodes: ["SOP-031"] },
  { module: "M5", code: "M5-5.12", title: "Shipping & Transport", requirementText: "Transport vehicle inspection and temperature-controlled shipping", criticality: "major", isAutoFail: false, sopCodes: ["SOP-035", "SOP-037"] },
];

// f) Audit Modules
const AUDIT_MODULES = [
  { code: "M1", name: "FSMS — Food Safety Management System", description: "PrimusGFS v4.0 Module 1: Management system requirements including policy, documentation, audits, CAPA, training", totalPoints: 330 },
  { code: "M3", name: "Greenhouse/CEA Operations", description: "PrimusGFS v4.0 Module 3: Controlled environment agriculture, growing operations, water, soil amendments, harvest", totalPoints: 200 },
  { code: "M5", name: "GMP & Facility Operations", description: "PrimusGFS v4.0 Module 5: Good manufacturing practices, sanitation, cold chain, pest control, shipping", totalPoints: 240 },
];

// g) ~65 Program Tasks
const PROGRAM_TASKS: {
  code: string; title: string; description: string; taskType: string;
  priority: string; phase: string; owner: string; effortEstimate: string;
  targetDate: string; linkedSopCode: string; notes: string;
}[] = [
  // 18 Gap Analysis items (gap)
  { code: "GAP-001", title: "Complete M1 FSMS gap assessment", description: "Assess current state against all 33 M1 FSMS requirements", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-03-15", linkedSopCode: "", notes: "Foundational assessment" },
  { code: "GAP-002", title: "Complete M3 Growing Ops gap assessment", description: "Assess growing operations against M3 requirements across all grow facilities", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-03-15", linkedSopCode: "", notes: "" },
  { code: "GAP-003", title: "Complete M5 GMP/Facility gap assessment", description: "Assess packing facility operations against M5 GMP requirements", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-03-15", linkedSopCode: "", notes: "" },
  { code: "GAP-004", title: "Water testing program gap — all facilities", description: "Identify gaps in agricultural and facility water testing schedules and records", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Connor", effortEstimate: "1 day", targetDate: "2026-03-20", linkedSopCode: "SOP-012", notes: "Auto-fail question" },
  { code: "GAP-005", title: "Traceability system gap analysis", description: "Test one-up/one-back traceability across all facilities, identify gaps", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-03-20", linkedSopCode: "SOP-010", notes: "Auto-fail question" },
  { code: "GAP-006", title: "Sanitation program gap — packing facilities", description: "Review pre-op/post-op sanitation procedures at SA-TX, DO-FL", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-22", linkedSopCode: "SOP-023", notes: "Auto-fail question" },
  { code: "GAP-007", title: "Cold chain management gap assessment", description: "Review temperature monitoring, cooler logs, and deviation procedures", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-22", linkedSopCode: "SOP-022", notes: "Auto-fail question" },
  { code: "GAP-008", title: "Worker hygiene program gap — all sites", description: "Assess hygiene training, health screening, and facility provisions", taskType: "gap", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-25", linkedSopCode: "SOP-015", notes: "" },
  { code: "GAP-009", title: "Supplier approval program gap", description: "Review current supplier list, certifications, and approval criteria", taskType: "gap", priority: "HIGH", phase: "Phase 1", owner: "Dael", effortEstimate: "1 day", targetDate: "2026-03-25", linkedSopCode: "SOP-009", notes: "" },
  { code: "GAP-010", title: "Training records gap analysis", description: "Inventory existing training records, identify gaps by role", taskType: "gap", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-28", linkedSopCode: "SOP-038", notes: "" },
  { code: "GAP-011", title: "Internal audit program gap", description: "Assess current internal audit practices and schedule", taskType: "gap", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-28", linkedSopCode: "SOP-004", notes: "" },
  { code: "GAP-012", title: "Pest management gap — all facilities", description: "Review pest control contracts, sighting logs, and bait station maps", taskType: "gap", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "1 day", targetDate: "2026-03-30", linkedSopCode: "SOP-030", notes: "" },
  { code: "GAP-013", title: "Organic integrity gap assessment", description: "Review organic handling procedures, buffer zones, parallel production controls", taskType: "gap", priority: "HIGH", phase: "Phase 1", owner: "Dael", effortEstimate: "2 days", targetDate: "2026-03-30", linkedSopCode: "SOP-020", notes: "" },
  { code: "GAP-014", title: "Emergency preparedness gap", description: "Review emergency plans, contact lists, drill records across facilities", taskType: "gap", priority: "MEDIUM", phase: "Phase 2", owner: "Daniel", effortEstimate: "1 day", targetDate: "2026-04-15", linkedSopCode: "SOP-039", notes: "" },
  { code: "GAP-015", title: "Preventive maintenance gap", description: "Audit PM schedules, equipment lists, and work order systems", taskType: "gap", priority: "MEDIUM", phase: "Phase 2", owner: "Daniel", effortEstimate: "1 day", targetDate: "2026-04-15", linkedSopCode: "SOP-031", notes: "" },
  { code: "GAP-016", title: "Labeling & packaging gap", description: "Review label approval process, verification records", taskType: "gap", priority: "MEDIUM", phase: "Phase 2", owner: "Rachel", effortEstimate: "1 day", targetDate: "2026-04-20", linkedSopCode: "SOP-028", notes: "" },
  { code: "GAP-017", title: "Food defense vulnerability assessment", description: "Conduct initial CARVER+Shock or equivalent assessment", taskType: "gap", priority: "MEDIUM", phase: "Phase 2", owner: "Daniel", effortEstimate: "2 days", targetDate: "2026-04-25", linkedSopCode: "SOP-040", notes: "" },
  { code: "GAP-018", title: "Shipping & transportation gap", description: "Review vehicle inspection records, temperature logs, carrier qualifications", taskType: "gap", priority: "MEDIUM", phase: "Phase 2", owner: "Rachel", effortEstimate: "1 day", targetDate: "2026-04-25", linkedSopCode: "SOP-035", notes: "" },

  // 12 Critical Open Items (open_item)
  { code: "OI-001", title: "Establish water testing schedule — all grow sites", description: "Set up quarterly/annual water testing with accredited lab for all agricultural water sources", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Connor", effortEstimate: "3 days", targetDate: "2026-03-31", linkedSopCode: "SOP-012", notes: "Auto-fail requirement" },
  { code: "OI-002", title: "Implement one-up/one-back traceability", description: "Configure portal traceability module, test trace-back within 4 hours", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "5 days", targetDate: "2026-04-15", linkedSopCode: "SOP-010", notes: "Auto-fail requirement" },
  { code: "OI-003", title: "Create master sanitation schedule — packing", description: "Develop pre-op/post-op sanitation schedules for SA-TX, DO-FL packing facilities", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-04-10", linkedSopCode: "SOP-023", notes: "Auto-fail requirement" },
  { code: "OI-004", title: "Deploy cooler temperature monitoring system", description: "Install/configure continuous temp monitoring with alarm thresholds in all coolers", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Daniel", effortEstimate: "5 days", targetDate: "2026-04-10", linkedSopCode: "SOP-022", notes: "Capital purchase may be needed" },
  { code: "OI-005", title: "Establish mock recall program", description: "Conduct first mock recall exercise, document results, create annual schedule", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-04-30", linkedSopCode: "SOP-010", notes: "" },
  { code: "OI-006", title: "Build approved supplier list with certs", description: "Compile full supplier list with current certifications, approval status", taskType: "open_item", priority: "HIGH", phase: "Phase 1", owner: "Dael", effortEstimate: "5 days", targetDate: "2026-04-15", linkedSopCode: "SOP-009", notes: "" },
  { code: "OI-007", title: "Create CAPA system in portal", description: "Configure CAPA workflow with root cause templates and verification steps", taskType: "open_item", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-04-15", linkedSopCode: "SOP-006", notes: "" },
  { code: "OI-008", title: "Worker health screening forms — bilingual", description: "Create EN/ES health screening forms, train supervisors on daily use", taskType: "open_item", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-03-31", linkedSopCode: "SOP-015", notes: "" },
  { code: "OI-009", title: "Establish calibration program", description: "Inventory all monitoring equipment, create calibration schedule with records", taskType: "open_item", priority: "HIGH", phase: "Phase 2", owner: "Daniel", effortEstimate: "3 days", targetDate: "2026-05-15", linkedSopCode: "SOP-032", notes: "" },
  { code: "OI-010", title: "Pest control contracts — all facilities", description: "Ensure licensed pest control at all facilities with current contracts and bait maps", taskType: "open_item", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-04-10", linkedSopCode: "SOP-030", notes: "" },
  { code: "OI-011", title: "Chemical storage compliance — all sites", description: "Audit chemical storage areas, ensure SDS availability, proper segregation", taskType: "open_item", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-04-15", linkedSopCode: "SOP-027", notes: "" },
  { code: "OI-012", title: "Microbiological testing program", description: "Establish environmental and product micro testing with accredited lab", taskType: "open_item", priority: "CRITICAL", phase: "Phase 2", owner: "Danielle", effortEstimate: "5 days", targetDate: "2026-05-30", linkedSopCode: "SOP-044", notes: "" },

  // 21 Implementation Roadmap milestones (milestone)
  { code: "MS-001", title: "Phase 1 SOPs drafted (SOP-001 to SOP-030)", description: "Complete first drafts of all 30 Phase 1 SOPs", taskType: "milestone", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-04-15", linkedSopCode: "", notes: "" },
  { code: "MS-002", title: "Phase 1 KISS forms created", description: "Create all KISS forms linked to Phase 1 SOPs", taskType: "milestone", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-04-30", linkedSopCode: "", notes: "" },
  { code: "MS-003", title: "Facility applicability matrix complete", description: "All 52 SOPs mapped to 7 facilities with confirmed applicability", taskType: "milestone", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-03-31", linkedSopCode: "", notes: "Completed in seed data" },
  { code: "MS-004", title: "Gap analysis — all facilities complete", description: "All 18 gap analysis tasks completed with findings documented", taskType: "milestone", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-04-30", linkedSopCode: "", notes: "" },
  { code: "MS-005", title: "Critical open items resolved", description: "All CRITICAL priority open items completed and verified", taskType: "milestone", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-05-15", linkedSopCode: "", notes: "" },
  { code: "MS-006", title: "Phase 1 SOPs reviewed & approved", description: "All Phase 1 SOPs through review and approved", taskType: "milestone", priority: "CRITICAL", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-05-31", linkedSopCode: "", notes: "" },
  { code: "MS-007", title: "Phase 1 training delivered", description: "Training completed on all Phase 1 SOPs for relevant personnel", taskType: "milestone", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "", targetDate: "2026-06-15", linkedSopCode: "SOP-038", notes: "" },
  { code: "MS-008", title: "Phase 2 SOPs drafted (SOP-031 to SOP-044)", description: "Complete first drafts of all 14 Phase 2 SOPs", taskType: "milestone", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "", targetDate: "2026-06-30", linkedSopCode: "", notes: "" },
  { code: "MS-009", title: "Phase 2 KISS forms created", description: "Create all KISS forms linked to Phase 2 SOPs", taskType: "milestone", priority: "MEDIUM", phase: "Phase 2", owner: "Danielle", effortEstimate: "", targetDate: "2026-07-15", linkedSopCode: "", notes: "" },
  { code: "MS-010", title: "Phase 2 SOPs reviewed & approved", description: "All Phase 2 SOPs through review and approved", taskType: "milestone", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "", targetDate: "2026-07-31", linkedSopCode: "", notes: "" },
  { code: "MS-011", title: "Internal audit — first cycle complete", description: "Complete first internal audit covering all M1/M3/M5 elements", taskType: "milestone", priority: "CRITICAL", phase: "Phase 2", owner: "Danielle", effortEstimate: "", targetDate: "2026-08-15", linkedSopCode: "SOP-004", notes: "" },
  { code: "MS-012", title: "Management review — first formal meeting", description: "First formal management review of FSMS performance", taskType: "milestone", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "", targetDate: "2026-08-31", linkedSopCode: "SOP-005", notes: "" },
  { code: "MS-013", title: "Phase 3 SOPs drafted (SOP-045 to SOP-052)", description: "Complete first drafts of all 8 Phase 3 SOPs", taskType: "milestone", priority: "MEDIUM", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-09-15", linkedSopCode: "", notes: "" },
  { code: "MS-014", title: "Phase 3 SOPs reviewed & approved", description: "All Phase 3 SOPs through review and approved", taskType: "milestone", priority: "MEDIUM", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-10-15", linkedSopCode: "", notes: "" },
  { code: "MS-015", title: "All 52 SOPs approved", description: "Full SOP library approved and distributed", taskType: "milestone", priority: "CRITICAL", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-10-31", linkedSopCode: "", notes: "" },
  { code: "MS-016", title: "Pre-audit readiness assessment", description: "Complete internal readiness assessment before PrimusGFS audit", taskType: "milestone", priority: "CRITICAL", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-11-15", linkedSopCode: "", notes: "" },
  { code: "MS-017", title: "Mock PrimusGFS audit", description: "Conduct full mock audit simulation covering M1, M3, M5", taskType: "milestone", priority: "CRITICAL", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-11-30", linkedSopCode: "", notes: "" },
  { code: "MS-018", title: "CAPA closure from mock audit", description: "Close all findings from mock audit before certification audit", taskType: "milestone", priority: "CRITICAL", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2026-12-15", linkedSopCode: "SOP-006", notes: "" },
  { code: "MS-019", title: "PrimusGFS certification audit — scheduled", description: "Certification body audit scheduled", taskType: "milestone", priority: "CRITICAL", phase: "Phase 3", owner: "Danielle", effortEstimate: "", targetDate: "2027-01-15", linkedSopCode: "", notes: "" },
  { code: "MS-020", title: "Portal fully operational — all modules", description: "FSQA Portal with all data, forms, and dashboards live", taskType: "milestone", priority: "HIGH", phase: "Phase 3", owner: "Daniel", effortEstimate: "", targetDate: "2026-10-31", linkedSopCode: "", notes: "" },
  { code: "MS-021", title: "NOP organic compliance verified", description: "All organic-related SOPs and records verified against NOP requirements", taskType: "milestone", priority: "HIGH", phase: "Phase 3", owner: "Dael", effortEstimate: "", targetDate: "2026-11-30", linkedSopCode: "SOP-020", notes: "" },

  // 12 Department Review assignments (review)
  { code: "REV-001", title: "Danielle — Management SOPs review", description: "Review SOP-001 through SOP-010 for accuracy and completeness", taskType: "review", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-05-15", linkedSopCode: "", notes: "Covers: SOP-001 to SOP-010" },
  { code: "REV-002", title: "Connor — Growing Ops SOPs review", description: "Review SOP-011 through SOP-020 for field accuracy", taskType: "review", priority: "HIGH", phase: "Phase 1", owner: "Connor", effortEstimate: "3 days", targetDate: "2026-05-15", linkedSopCode: "", notes: "Covers: SOP-011 to SOP-020" },
  { code: "REV-003", title: "Danielle — Packing Ops SOPs review", description: "Review SOP-021 through SOP-030 for facility accuracy", taskType: "review", priority: "HIGH", phase: "Phase 1", owner: "Danielle", effortEstimate: "3 days", targetDate: "2026-05-15", linkedSopCode: "", notes: "Covers: SOP-021 to SOP-030" },
  { code: "REV-004", title: "Daniel — Maintenance SOPs review", description: "Review SOP-031 through SOP-034 for maintenance accuracy", taskType: "review", priority: "MEDIUM", phase: "Phase 2", owner: "Daniel", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "Covers: SOP-031 to SOP-034" },
  { code: "REV-005", title: "Rachel — Shipping SOPs review", description: "Review SOP-035 through SOP-037 for logistics accuracy", taskType: "review", priority: "MEDIUM", phase: "Phase 2", owner: "Rachel", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "Covers: SOP-035 to SOP-037" },
  { code: "REV-006", title: "Danielle — Support SOPs review", description: "Review SOP-038 through SOP-041 for training/security accuracy", taskType: "review", priority: "MEDIUM", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "Covers: SOP-038 to SOP-041" },
  { code: "REV-007", title: "Danielle — Quality SOPs review", description: "Review SOP-042 through SOP-044 for testing accuracy", taskType: "review", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "Covers: SOP-042 to SOP-044" },
  { code: "REV-008", title: "Daniel — HR/Admin SOPs review", description: "Review SOP-045 and SOP-046", taskType: "review", priority: "LOW", phase: "Phase 3", owner: "Daniel", effortEstimate: "1 day", targetDate: "2026-09-30", linkedSopCode: "", notes: "Covers: SOP-045, SOP-046" },
  { code: "REV-009", title: "Rachel — Inventory SOPs review", description: "Review SOP-047 and SOP-048", taskType: "review", priority: "MEDIUM", phase: "Phase 3", owner: "Rachel", effortEstimate: "1 day", targetDate: "2026-09-30", linkedSopCode: "", notes: "Covers: SOP-047, SOP-048" },
  { code: "REV-010", title: "Rachel — Logistics & Planning SOPs review", description: "Review SOP-049 and SOP-050", taskType: "review", priority: "LOW", phase: "Phase 3", owner: "Rachel", effortEstimate: "1 day", targetDate: "2026-09-30", linkedSopCode: "", notes: "Covers: SOP-049, SOP-050" },
  { code: "REV-011", title: "Dael — Finance SOP review", description: "Review SOP-051", taskType: "review", priority: "LOW", phase: "Phase 3", owner: "Dael", effortEstimate: "0.5 days", targetDate: "2026-09-30", linkedSopCode: "SOP-051", notes: "" },
  { code: "REV-012", title: "Rachel — Sales/CS SOP review", description: "Review SOP-052", taskType: "review", priority: "LOW", phase: "Phase 3", owner: "Rachel", effortEstimate: "0.5 days", targetDate: "2026-09-30", linkedSopCode: "SOP-052", notes: "" },

  // ~11 Facility Addenda items (addenda)
  { code: "ADD-001", title: "PS-TX — Facility addendum (Farm+Greenhouse)", description: "Create Pearsall TX facility-specific addendum covering field maps, water sources, greenhouse specs", taskType: "addenda", priority: "HIGH", phase: "Phase 2", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-06-30", linkedSopCode: "", notes: "" },
  { code: "ADD-002", title: "SA-TX — Facility addendum (Pack)", description: "Create San Antonio TX packing facility addendum with floor plan, equipment list, cold storage specs", taskType: "addenda", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-06-30", linkedSopCode: "", notes: "" },
  { code: "ADD-003", title: "DO-FL — Facility addendum (Pack)", description: "Create Doral FL packing facility addendum", taskType: "addenda", priority: "HIGH", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-06-30", linkedSopCode: "", notes: "" },
  { code: "ADD-004", title: "MD-FL — Facility addendum (Greenhouse)", description: "Create Mt Dora FL greenhouse facility addendum", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "" },
  { code: "ADD-005", title: "NH-NY — Facility addendum (Full)", description: "Create New Hampton NY full operation addendum", taskType: "addenda", priority: "HIGH", phase: "Phase 2", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-07-15", linkedSopCode: "", notes: "" },
  { code: "ADD-006", title: "AL-PA — Facility addendum (Full)", description: "Create Allentown PA full operation addendum", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-07-30", linkedSopCode: "", notes: "" },
  { code: "ADD-007", title: "FR-IN — Facility addendum (Grow+Pack)", description: "Create Francesville IN grow+pack facility addendum", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Connor", effortEstimate: "2 days", targetDate: "2026-07-30", linkedSopCode: "", notes: "" },
  { code: "ADD-008", title: "Water source documentation — all sites", description: "Document all water sources per facility with GPS coordinates and testing points", taskType: "addenda", priority: "HIGH", phase: "Phase 1", owner: "Connor", effortEstimate: "3 days", targetDate: "2026-04-30", linkedSopCode: "SOP-012", notes: "" },
  { code: "ADD-009", title: "Chemical inventory by facility", description: "Create facility-specific chemical inventories with SDS binders", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-06-15", linkedSopCode: "SOP-027", notes: "" },
  { code: "ADD-010", title: "Pest control bait station maps — all sites", description: "Create or verify bait station maps for each facility", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Danielle", effortEstimate: "2 days", targetDate: "2026-06-30", linkedSopCode: "SOP-030", notes: "" },
  { code: "ADD-011", title: "Emergency contact lists — facility-specific", description: "Create emergency contact lists customized per facility location", taskType: "addenda", priority: "MEDIUM", phase: "Phase 2", owner: "Daniel", effortEstimate: "1 day", targetDate: "2026-06-15", linkedSopCode: "SOP-039", notes: "" },
];

// ═══════════════════════════════════════════════════════════════
// SEED EXECUTION
// ═══════════════════════════════════════════════════════════════

async function seed() {
  console.log("Starting FSQA Program seed...\n");

  // ── a) Facilities ──────────────────────────────────────────────
  console.log("Seeding 7 facilities...");
  const facilityMap = new Map<string, number>();
  for (const fac of FACILITIES) {
    const existing = await db.select({ id: schema.facilities.id })
      .from(schema.facilities)
      .where(eq(schema.facilities.code, fac.code))
      .limit(1);

    if (existing.length > 0) {
      facilityMap.set(fac.code, existing[0].id);
      console.log(`  [skip] ${fac.code} already exists`);
    } else {
      const [inserted] = await db.insert(schema.facilities).values({
        code: fac.code,
        name: fac.name,
        facilityType: fac.facilityType,
        location: fac.location,
        m1Fsms: 1,
        m3IndoorAg: fac.facilityType.includes("Greenhouse") || fac.facilityType.includes("Farm") || fac.facilityType.includes("Grow") || fac.facilityType.includes("Full") ? 1 : 0,
        m5Facility: fac.facilityType.includes("Pack") || fac.facilityType.includes("Full") || fac.facilityType.includes("Grow+Pack") ? 1 : 0,
        isActive: 1,
      }).returning();
      facilityMap.set(fac.code, inserted.id);
      console.log(`  [+] ${fac.code} — ${fac.name}`);
    }
  }

  // ── b) 52 SOPs ──────────────────────────────────────────────────
  console.log("\nSeeding 52 SOPs...");
  const sopMap = new Map<string, number>();
  for (const sop of SOPS) {
    const existing = await db.select({ id: schema.sopDocuments.id })
      .from(schema.sopDocuments)
      .where(eq(schema.sopDocuments.code, sop.code))
      .limit(1);

    if (existing.length > 0) {
      sopMap.set(sop.code, existing[0].id);
      console.log(`  [skip] ${sop.code} already exists`);
    } else {
      const [inserted] = await db.insert(schema.sopDocuments).values({
        code: sop.code,
        title: sop.title,
        category: sop.category,
        phase: sop.phase,
        sopType: sop.sopType,
        reviewOwner: sop.reviewOwner,
        priority: sop.priority,
        primusRef: sop.primusRef || null,
        nopRef: sop.nopRef || null,
        facilityTypes: sop.facilityTypes,
        language: "EN/ES",
        status: "Draft",
        description: `${sop.title} — Standard Operating Procedure for the Food Safety Primus Program.`,
      }).returning();
      sopMap.set(sop.code, inserted.id);
      console.log(`  [+] ${sop.code} — ${sop.title}`);
    }
  }

  // ── c) Facility Applicability ────────────────────────────────────
  console.log("\nSeeding SOP facility applicability...");
  let applicabilityCount = 0;
  for (const sop of SOPS) {
    const sopId = sopMap.get(sop.code);
    if (!sopId) continue;

    for (const fac of FACILITIES) {
      const facId = facilityMap.get(fac.code);
      if (!facId) continue;

      if (!sopAppliesToFacility(sop.facilityTypes, fac.facilityType)) continue;

      const existing = await db.select({ id: schema.sopFacilityStatus.id })
        .from(schema.sopFacilityStatus)
        .where(eq(schema.sopFacilityStatus.sopId, sopId))
        .limit(1);

      // Check for this specific combo
      try {
        await db.insert(schema.sopFacilityStatus).values({
          sopId,
          facilityId: facId,
          status: "exists",
        });
        applicabilityCount++;
      } catch {
        // unique constraint — already exists
      }
    }
  }
  console.log(`  [+] ${applicabilityCount} SOP-facility mappings created`);

  // ── d) 68 KISS Forms ──────────────────────────────────────────────
  console.log("\nSeeding 68 KISS forms...");
  for (const form of KISS_FORMS) {
    const existing = await db.select({ id: schema.checklistTemplates.id })
      .from(schema.checklistTemplates)
      .where(eq(schema.checklistTemplates.code, form.code))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [skip] ${form.code} already exists`);
    } else {
      await db.insert(schema.checklistTemplates).values({
        code: form.code,
        name: form.title,
        linkedSop: form.linkedSop,
        frequency: form.frequency,
        phase: form.phase,
        isActive: 1,
      });
      console.log(`  [+] ${form.code} — ${form.title}`);
    }
  }

  // ── e) Compliance Crosswalk ─────────────────────────────────────
  console.log("\nSeeding compliance crosswalk...");

  // Standards
  const standardMap = new Map<string, number>();
  for (const std of [
    { code: "PRIMUS-V4", name: "PrimusGFS v4.0", version: "4.0" },
    { code: "NOP-205", name: "USDA NOP §205", version: "2024" },
  ]) {
    const existing = await db.select({ id: schema.fsmsStandards.id })
      .from(schema.fsmsStandards)
      .where(eq(schema.fsmsStandards.code, std.code))
      .limit(1);

    if (existing.length > 0) {
      standardMap.set(std.code, existing[0].id);
    } else {
      const [inserted] = await db.insert(schema.fsmsStandards).values({
        code: std.code,
        name: std.name,
        version: std.version,
        isActive: 1,
      }).returning();
      standardMap.set(std.code, inserted.id);
      console.log(`  [+] Standard: ${std.code}`);
    }
  }

  // Get/create audit modules for linking
  const auditModuleMap = new Map<string, number>();
  for (const mod of AUDIT_MODULES) {
    const existing = await db.select({ id: schema.auditModules.id })
      .from(schema.auditModules)
      .where(eq(schema.auditModules.code, mod.code))
      .limit(1);

    if (existing.length > 0) {
      auditModuleMap.set(mod.code, existing[0].id);
      console.log(`  [skip] Module ${mod.code} already exists`);
    } else {
      const [inserted] = await db.insert(schema.auditModules).values({
        code: mod.code,
        name: mod.name,
        description: mod.description,
        totalPoints: mod.totalPoints,
      }).returning();
      auditModuleMap.set(mod.code, inserted.id);
      console.log(`  [+] Module: ${mod.code} — ${mod.name}`);
    }
  }

  // Clauses & Requirements
  const primusStdId = standardMap.get("PRIMUS-V4")!;
  let clauseCount = 0;
  let reqCount = 0;
  let linkCount = 0;

  for (const clause of CLAUSES) {
    const moduleId = auditModuleMap.get(clause.module);

    // Insert clause
    const existingClause = await db.select({ id: schema.fsmsClauses.id })
      .from(schema.fsmsClauses)
      .where(eq(schema.fsmsClauses.clauseCode, clause.code))
      .limit(1);

    let clauseId: number;
    if (existingClause.length > 0) {
      clauseId = existingClause[0].id;
    } else {
      const [insertedClause] = await db.insert(schema.fsmsClauses).values({
        standardId: primusStdId,
        clauseCode: clause.code,
        clauseTitle: clause.title,
        description: clause.requirementText,
        sortOrder: clauseCount,
      }).returning();
      clauseId = insertedClause.id;
      clauseCount++;
    }

    // Insert requirement
    const reqCode = `REQ-${clause.code}`;
    const existingReq = await db.select({ id: schema.fsmsRequirements.id })
      .from(schema.fsmsRequirements)
      .where(eq(schema.fsmsRequirements.requirementCode, reqCode))
      .limit(1);

    let reqId: number;
    if (existingReq.length > 0) {
      reqId = existingReq[0].id;
    } else {
      const [insertedReq] = await db.insert(schema.fsmsRequirements).values({
        clauseId,
        requirementCode: reqCode,
        requirementText: clause.requirementText,
        criticality: clause.criticality,
        moduleId: moduleId || null,
        isRequired: 1,
      }).returning();
      reqId = insertedReq.id;
      reqCount++;
    }

    // Evidence links (SOP → requirement)
    for (const sopCode of clause.sopCodes) {
      const sopId = sopMap.get(sopCode);
      try {
        await db.insert(schema.requirementEvidenceLinks).values({
          requirementId: reqId,
          evidenceType: "sop",
          evidenceId: sopId || null,
          evidenceCode: sopCode,
          evidenceTitle: SOPS.find(s => s.code === sopCode)?.title || sopCode,
          isPrimary: clause.sopCodes[0] === sopCode ? 1 : 0,
        });
        linkCount++;
      } catch {
        // unique constraint
      }
    }
  }
  console.log(`  [+] ${clauseCount} clauses, ${reqCount} requirements, ${linkCount} evidence links`);

  // ── g) Program Tasks ──────────────────────────────────────────────
  console.log("\nSeeding program tasks...");
  let taskCount = 0;
  for (const task of PROGRAM_TASKS) {
    const existing = await db.select({ id: schema.programTasks.id })
      .from(schema.programTasks)
      .where(eq(schema.programTasks.code, task.code))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [skip] ${task.code} already exists`);
    } else {
      await db.insert(schema.programTasks).values({
        code: task.code,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        priority: task.priority,
        status: "pending",
        phase: task.phase,
        owner: task.owner,
        effortEstimate: task.effortEstimate || null,
        targetDate: task.targetDate,
        linkedSopCode: task.linkedSopCode || null,
        notes: task.notes || null,
      });
      taskCount++;
      console.log(`  [+] ${task.code} — ${task.title}`);
    }
  }
  console.log(`  [+] ${taskCount} program tasks created`);

  // ── Summary ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("Seed complete!");
  console.log(`  Facilities: ${FACILITIES.length}`);
  console.log(`  SOPs: ${SOPS.length}`);
  console.log(`  KISS Forms: ${KISS_FORMS.length}`);
  console.log(`  Clauses: ${CLAUSES.length}`);
  console.log(`  Program Tasks: ${PROGRAM_TASKS.length}`);
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
