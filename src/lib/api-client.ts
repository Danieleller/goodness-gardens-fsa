"use client";

/**
 * Client-side API helper for fetching data from Next.js API routes.
 * Replaces the old Axios-based api.ts.
 * Since auth is now handled via cookies (Supabase SSR), no need for manual token injection.
 */

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || "Request failed");
    err.response = { data, status: res.status };
    throw err;
  }
  // Return { data } to match Axios response shape for compatibility with existing page components
  return { data };
}

export { apiFetch };

export const authAPI = {
  me: () => apiFetch("/auth/me"),
};

export const preHarvestAPI = {
  getAll: (logType?: string) => apiFetch(`/pre-harvest${logType ? `?log_type=${logType}` : ""}`),
  getById: (id: number) => apiFetch(`/pre-harvest/${id}`),
  create: (data: any) => apiFetch("/pre-harvest", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/pre-harvest/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/pre-harvest/${id}`, { method: "DELETE" }),
};

export const chemicalAPI = {
  applications: {
    getAll: () => apiFetch("/chemicals/applications"),
    getById: (id: number) => apiFetch(`/chemicals/applications/${id}`),
    create: (data: any) => apiFetch("/chemicals/applications", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/chemicals/applications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/chemicals/applications/${id}`, { method: "DELETE" }),
  },
  storage: {
    getAll: () => apiFetch("/chemicals/storage"),
    getById: (id: number) => apiFetch(`/chemicals/storage/${id}`),
    create: (data: any) => apiFetch("/chemicals/storage", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/chemicals/storage/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/chemicals/storage/${id}`, { method: "DELETE" }),
  },
};

export const correctiveActionAPI = {
  summary: () => apiFetch("/corrective-actions/summary"),
  nonconformances: {
    getAll: () => apiFetch("/corrective-actions/nonconformances"),
    getById: (id: number) => apiFetch(`/corrective-actions/nonconformances/${id}`),
    create: (data: any) => apiFetch("/corrective-actions/nonconformances", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/corrective-actions/nonconformances/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/corrective-actions/nonconformances/${id}`, { method: "DELETE" }),
  },
  capas: {
    getAll: () => apiFetch("/corrective-actions/capa"),
    getById: (id: number) => apiFetch(`/corrective-actions/capa/${id}`),
    create: (data: any) => apiFetch("/corrective-actions/capa", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/corrective-actions/capa/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/corrective-actions/capa/${id}`, { method: "DELETE" }),
  },
};

export const reportsAPI = {
  dashboard: () => apiFetch("/reports/dashboard"),
  export: (type: string) => apiFetch(`/reports/export?type=${type}`),
};

export const adminAPI = {
  users: {
    getAll: () => apiFetch("/admin/list"),
    create: (data: any) => apiFetch("/admin/list", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/admin/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    resetPassword: (id: number, data: any) => apiFetch(`/admin/${id}/reset-password`, { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/admin/${id}`, { method: "DELETE" }),
  },
};

export const facilitiesAPI = {
  getAll: () => apiFetch("/facilities"),
  getById: (id: number) => apiFetch(`/facilities/${id}`),
  update: (id: number, data: any) => apiFetch(`/facilities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

export const checklistsAPI = {
  templates: {
    getAll: (facilityType?: string) => apiFetch(`/checklists/templates${facilityType ? `?facility_type=${facilityType}` : ""}`),
    getById: (id: number) => apiFetch(`/checklists/templates/${id}`),
  },
  submissions: {
    getAll: (params?: { facility_id?: number; template_id?: number }) => {
      const sp = new URLSearchParams();
      if (params?.facility_id) sp.set("facility_id", String(params.facility_id));
      if (params?.template_id) sp.set("template_id", String(params.template_id));
      return apiFetch(`/checklists/submissions${sp.toString() ? `?${sp}` : ""}`);
    },
    getById: (id: number) => apiFetch(`/checklists/submissions/${id}`),
    create: (data: any) => apiFetch("/checklists/submissions", { method: "POST", body: JSON.stringify(data) }),
    signoff: (id: number, data: any) => apiFetch(`/checklists/submissions/${id}/signoff`, { method: "PUT", body: JSON.stringify(data) }),
  },
};

export const sopsAPI = {
  getAll: (params?: { category?: string; status?: string; priority?: string; tag?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.status) sp.set("status", params.status);
    if (params?.priority) sp.set("priority", params.priority);
    if (params?.tag) sp.set("tag", params.tag);
    return apiFetch(`/sops${sp.toString() ? `?${sp}` : ""}`);
  },
  getById: (id: number) => apiFetch(`/sops/${id}`),
  create: (data: any) => apiFetch("/sops", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/sops/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) => apiFetch(`/sops/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  getByFacility: (facilityId: number) => apiFetch(`/sops/facility/${facilityId}`),
  getVersions: (sopId: number) => apiFetch(`/sops/${sopId}/versions`),
  createVersion: (sopId: number, data: any) => apiFetch(`/sops/${sopId}/versions`, { method: "POST", body: JSON.stringify(data) }),
  downloadFile: (fileId: number) => apiFetch(`/sops/files/${fileId}`),
  deleteFile: (fileId: number) => apiFetch(`/sops/files/${fileId}`, { method: "DELETE" }),
  addTags: (sopId: number, tags: string[]) => apiFetch(`/sops/${sopId}/tags`, { method: "POST", body: JSON.stringify({ tags }) }),
  removeTag: (sopId: number, tag: string) => apiFetch(`/sops/${sopId}/tags?tag=${tag}`, { method: "DELETE" }),
  getAllTags: () => apiFetch("/sops/tags"),
  getAuditCoverage: (sopId: number) => apiFetch(`/sops/${sopId}/audit-coverage`),
};

export const gapsAPI = {
  summary: () => apiFetch("/gaps/summary"),
  getByFacility: (facilityId: number) => apiFetch(`/gaps/${facilityId}`),
  snapshot: (facilityId: number) => apiFetch(`/gaps/${facilityId}/snapshot`, { method: "POST" }),
};

export const auditAPI = {
  modules: (facilityId: number) => apiFetch(`/audit/modules/${facilityId}`),
  simulations: {
    getAll: (facilityId?: number) => apiFetch(`/audit/simulations${facilityId ? `?facility_id=${facilityId}` : ""}`),
    getById: (id: number) => apiFetch(`/audit/simulations/${id}`),
    create: (facilityId: number) => apiFetch("/audit/simulations", { method: "POST", body: JSON.stringify({ facility_id: facilityId }) }),
    saveResponses: (id: number, responses: any[]) => apiFetch(`/audit/simulations/${id}/responses`, { method: "POST", body: JSON.stringify({ responses }) }),
    getScore: (id: number) => apiFetch(`/audit/simulations/${id}/score`),
  },
};

export const auditFindingsAPI = {
  getAll: (params?: { simulation_id?: number; facility_id?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.simulation_id) sp.set("simulation_id", String(params.simulation_id));
    if (params?.facility_id) sp.set("facility_id", String(params.facility_id));
    if (params?.status) sp.set("status", params.status);
    return apiFetch(`/audit/findings${sp.toString() ? `?${sp}` : ""}`);
  },
  getById: (id: number) => apiFetch(`/audit/findings/${id}`),
  update: (id: number, data: any) => apiFetch(`/audit/findings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createCapa: (id: number) => apiFetch(`/audit/findings/${id}/create-capa`, { method: "POST" }),
  summary: (facilityId?: number) => apiFetch(`/audit/findings/summary${facilityId ? `?facility_id=${facilityId}` : ""}`),
};

export const suppliersAPI = {
  getAll: (params?: { type?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set("type", params.type);
    if (params?.status) sp.set("status", params.status);
    return apiFetch(`/suppliers${sp.toString() ? `?${sp}` : ""}`);
  },
  getById: (id: number) => apiFetch(`/suppliers/${id}`),
  create: (data: any) => apiFetch("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/suppliers/${id}`, { method: "DELETE" }),
  certifications: {
    getAll: (supplierId: number) => apiFetch(`/suppliers/${supplierId}/certifications`),
    create: (supplierId: number, data: any) => apiFetch(`/suppliers/${supplierId}/certifications`, { method: "POST", body: JSON.stringify(data) }),
  },
  expiring: (days?: number) => apiFetch(`/suppliers/expiring?days=${days || 30}`),
};

export const calendarAPI = {
  getEvents: (days?: number) => apiFetch(`/calendar?days=${days || 90}`),
};

export const complianceAPI = {
  getScore: (facilityId: number, params?: { simulation_id?: number; save_assessment?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.simulation_id) sp.set("simulation_id", String(params.simulation_id));
    if (params?.save_assessment) sp.set("save_assessment", "true");
    return apiFetch(`/compliance/facilities/${facilityId}/score${sp.toString() ? `?${sp}` : ""}`);
  },
  getMatrix: (facilityId: number) => apiFetch(`/compliance/facilities/${facilityId}/matrix`),
  getRequirements: (moduleCode: string, facilityId: number) => apiFetch(`/compliance/modules/${moduleCode}/requirements?facility_id=${facilityId}`),
  getHistory: (facilityId: number) => apiFetch(`/compliance/assessments/history?facility_id=${facilityId}`),
};

export const reportingAPI = {
  evaluateRules: (facilityId: number, save?: boolean) => apiFetch(`/reporting/facilities/${facilityId}/rules${save ? "?save=true" : ""}`),
  getRisk: (facilityId: number) => apiFetch(`/reporting/facilities/${facilityId}/risk`),
  getTrends: (facilityId: number, period?: string) => apiFetch(`/reporting/facilities/${facilityId}/trends${period ? `?period=${period}` : ""}`),
  saveSnapshot: (facilityId: number) => apiFetch(`/reporting/facilities/${facilityId}/snapshot`, { method: "POST" }),
  exportReport: (facilityId: number) => apiFetch(`/reporting/facilities/${facilityId}/export`),
  getPdfData: (facilityId: number) => apiFetch(`/reporting/facilities/${facilityId}/pdf-data`),
  comparison: (facilityIds: number[]) => apiFetch(`/reporting/comparison?facility_ids=${facilityIds.join(",")}`),
  getRules: () => apiFetch("/reporting/rules"),
  toggleRule: (ruleId: number, isActive: boolean) => apiFetch(`/reporting/rules/${ruleId}`, { method: "PUT", body: JSON.stringify({ is_active: isActive }) }),
};

export const trainingAPI = {
  getRecords: (params?: { facility_id?: number; user_id?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.facility_id) sp.set("facility_id", String(params.facility_id));
    if (params?.user_id) sp.set("user_id", String(params.user_id));
    if (params?.status) sp.set("status", params.status);
    return apiFetch(`/training/records${sp.toString() ? `?${sp}` : ""}`);
  },
  createRecord: (data: any) => apiFetch("/training/records", { method: "POST", body: JSON.stringify(data) }),
  updateRecord: (id: number, data: any) => apiFetch(`/training/records/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRecord: (id: number) => apiFetch(`/training/records/${id}`, { method: "DELETE" }),
  getRequirements: () => apiFetch("/training/requirements"),
  getCertifications: (userId?: number) => apiFetch(`/training/certifications${userId ? `?user_id=${userId}` : ""}`),
  createCertification: (data: any) => apiFetch("/training/certifications", { method: "POST", body: JSON.stringify(data) }),
  updateCertification: (id: number, data: any) => apiFetch(`/training/certifications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getDashboard: (facilityId?: number) => apiFetch(`/training/dashboard${facilityId ? `?facility_id=${facilityId}` : ""}`),
};

export const notificationsAPI = {
  getAll: (unread?: boolean) => apiFetch(`/notifications${unread ? "?unread=true" : ""}`),
  markRead: (id: number) => apiFetch(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => apiFetch("/notifications/read-all", { method: "PUT" }),
  dismiss: (id: number) => apiFetch(`/notifications/${id}/dismiss`, { method: "PUT" }),
};

export const opsAPI = {
  templates: {
    getAll: () => apiFetch("/ops/templates"),
    getById: (id: number) => apiFetch(`/ops/templates/${id}`),
  },
  schedules: {
    getAll: (facilityId?: number) => apiFetch(`/ops/schedules${facilityId ? `?facility_id=${facilityId}` : ""}`),
    create: (data: any) => apiFetch("/ops/schedules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => apiFetch(`/ops/schedules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  generate: () => apiFetch("/ops/generate", { method: "POST" }),
  myTasks: (date?: string, facilityId?: number) => {
    const sp = new URLSearchParams();
    if (date) sp.set("date", date);
    if (facilityId) sp.set("facility_id", String(facilityId));
    return apiFetch(`/ops/my-tasks${sp.toString() ? `?${sp}` : ""}`);
  },
  tasks: {
    getAll: (params?: { date?: string; facility_id?: number; template_id?: number; status?: string; limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.date) sp.set("date", params.date);
      if (params?.facility_id) sp.set("facility_id", String(params.facility_id));
      if (params?.template_id) sp.set("template_id", String(params.template_id));
      if (params?.status) sp.set("status", params.status);
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      return apiFetch(`/ops/tasks${sp.toString() ? `?${sp}` : ""}`);
    },
    getById: (id: number) => apiFetch(`/ops/tasks/${id}`),
    submit: (id: number, data: any) => apiFetch(`/ops/tasks/${id}/submit`, { method: "PUT", body: JSON.stringify(data) }),
    approve: (id: number) => apiFetch(`/ops/tasks/${id}/approve`, { method: "PUT" }),
  },
  status: (date?: string) => apiFetch(`/ops/status${date ? `?date=${date}` : ""}`),
  complianceCheck: () => apiFetch("/ops/compliance-check", { method: "POST" }),
};

export const primusChecklistAPI = {
  getAll: () => apiFetch("/primus-checklist"),
  upload: (data: any) => apiFetch("/primus-checklist/upload", { method: "POST", body: JSON.stringify(data) }),
  download: (docId: number) => apiFetch(`/primus-checklist/download/${docId}`),
  deleteDoc: (docId: number) => apiFetch(`/primus-checklist/doc/${docId}`, { method: "DELETE" }),
  toggle: (itemId: number) => apiFetch(`/primus-checklist/toggle/${itemId}`, { method: "PUT" }),
};

export const searchAPI = {
  search: (q: string, type?: string) => apiFetch(`/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`),
};

export const setupAPI = {
  transactionConfig: {
    getAll: () => apiFetch("/setup/transaction-config"),
    update: (id: number, data: any) => apiFetch(`/setup/transaction-config/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  auditLog: {
    getAll: (params?: { limit?: number; offset?: number }) => {
      const sp = new URLSearchParams();
      if (params?.limit) sp.set("limit", String(params.limit));
      if (params?.offset) sp.set("offset", String(params.offset));
      return apiFetch(`/setup/audit-log${sp.toString() ? `?${sp}` : ""}`);
    },
  },
  permissions: { getAll: () => apiFetch("/setup/permissions") },
  roles: { getAll: () => apiFetch("/setup/roles") },
  moduleConfig: {
    getAll: () => apiFetch("/setup/module-config"),
    toggle: (moduleKey: string, isEnabled: boolean) => apiFetch(`/setup/module-config/${moduleKey}`, { method: "PUT", body: JSON.stringify({ is_enabled: isEnabled }) }),
  },
};

export const modulesAPI = {
  getEnabled: () => apiFetch("/modules/enabled"),
};

export const netsuiteAPI = {
  supplyMaster: (params?: { limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    return apiFetch(`/netsuite/supply-master${sp.toString() ? `?${sp}` : ""}`);
  },
};

export const certAPI = {
  list: () => apiFetch("/netsuite/certifications"),
  upload: (data: any) => apiFetch("/netsuite/certifications", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/netsuite/certifications/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/netsuite/certifications/${id}`, { method: "DELETE" }),
  download: (id: number) => apiFetch(`/netsuite/certifications/${id}/download`),
};
