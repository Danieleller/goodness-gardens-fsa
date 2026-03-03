"use client";

/**
 * Compatibility shim: re-exports everything from the new fetch-based API client.
 * Existing page components import from '@/api' — this file ensures they keep working.
 */
export {
  authAPI,
  preHarvestAPI,
  chemicalAPI,
  correctiveActionAPI,
  reportsAPI,
  adminAPI,
  facilitiesAPI,
  checklistsAPI,
  sopsAPI,
  gapsAPI,
  auditAPI,
  auditFindingsAPI,
  suppliersAPI,
  calendarAPI,
  complianceAPI,
  reportingAPI,
  trainingAPI,
  notificationsAPI,
  opsAPI,
  primusChecklistAPI,
  searchAPI,
  setupAPI,
  modulesAPI,
  netsuiteAPI,
  certAPI,
} from "@/lib/api-client";
