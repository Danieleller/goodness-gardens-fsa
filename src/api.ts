import axios from 'axios';
import { useAuthStore } from './store';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 from our own auth endpoints, not from proxied APIs like NetSuite
    const url = error.config?.url || '';
    const isProxiedApi = url.includes('/netsuite/');
    if (error.response?.status === 401 && !isProxiedApi) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; password: string; first_name: string; last_name: string; organization_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const preHarvestAPI = {
  getAll: (logType?: string) =>
    api.get('/pre-harvest', { params: { ...(logType && { log_type: logType }) } }),
  getById: (id: number) => api.get(`/pre-harvest/${id}`),
  create: (data: any) => api.post('/pre-harvest', data),
  update: (id: number, data: any) => api.put(`/pre-harvest/${id}`, data),
  delete: (id: number) => api.delete(`/pre-harvest/${id}`),
};

export const chemicalAPI = {
  applications: {
    getAll: () => api.get('/chemicals/applications'),
    getById: (id: number) => api.get(`/chemicals/applications/${id}`),
    create: (data: any) => api.post('/chemicals/applications', data),
    update: (id: number, data: any) => api.put(`/chemicals/applications/${id}`, data),
    delete: (id: number) => api.delete(`/chemicals/applications/${id}`),
  },
  storage: {
    getAll: () => api.get('/chemicals/storage'),
    getById: (id: number) => api.get(`/chemicals/storage/${id}`),
    create: (data: any) => api.post('/chemicals/storage', data),
    update: (id: number, data: any) => api.put(`/chemicals/storage/${id}`, data),
    delete: (id: number) => api.delete(`/chemicals/storage/${id}`),
  },
};

export const correctiveActionAPI = {
  nonconformances: {
    getAll: () => api.get('/corrective-actions/nonconformances'),
    getById: (id: number) => api.get(`/corrective-actions/nonconformances/${id}`),
    create: (data: any) => api.post('/corrective-actions/nonconformances', data),
    update: (id: number, data: any) => api.put(`/corrective-actions/nonconformances/${id}`, data),
    delete: (id: number) => api.delete(`/corrective-actions/nonconformances/${id}`),
  },
  capas: {
    getAll: () => api.get('/corrective-actions/capa'),
    getById: (id: number) => api.get(`/corrective-actions/capa/${id}`),
    create: (data: any) => api.post('/corrective-actions/capa', data),
    update: (id: number, data: any) => api.put(`/corrective-actions/capa/${id}`, data),
    delete: (id: number) => api.delete(`/corrective-actions/capa/${id}`),
  },
  checklists: {
    getAll: () => api.get('/corrective-actions/checklists'),
    getById: (id: number) => api.get(`/corrective-actions/checklists/${id}`),
    create: (data: any) => api.post('/corrective-actions/checklists', data),
    update: (id: number, data: any) => api.put(`/corrective-actions/checklists/${id}`, data),
    delete: (id: number) => api.delete(`/corrective-actions/checklists/${id}`),
  },
};

export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  export: (type: string) => api.get('/reports/export', { params: { type } }),
};

export const adminAPI = {
  users: {
    getAll: () => api.get('/admin/list'),
    create: (data: { email: string; first_name: string; last_name: string; organization_name: string; temp_password: string }) =>
      api.post('/admin/list', data),
    update: (id: number, data: { role?: string; is_active?: number }) =>
      api.put(`/admin/${id}`, data),
    resetPassword: (id: number, data: { temp_password: string }) =>
      api.post(`/admin/${id}/reset-password`, data),
    delete: (id: number) => api.delete(`/admin/${id}`),
  },
};

// ---- NEW APIs ----

export const facilitiesAPI = {
  getAll: () => api.get('/facilities'),
  getById: (id: number) => api.get(`/facilities/${id}`),
  update: (id: number, data: any) => api.put(`/facilities/${id}`, data),
};

export const checklistsAPI = {
  templates: {
    getAll: (facilityType?: string) => api.get('/checklists/templates', { params: facilityType ? { facility_type: facilityType } : {} }),
    getById: (id: number) => api.get(`/checklists/templates/${id}`),
  },
  submissions: {
    getAll: (params?: { facility_id?: number; template_id?: number }) => api.get('/checklists/submissions', { params }),
    getById: (id: number) => api.get(`/checklists/submissions/${id}`),
    create: (data: any) => api.post('/checklists/submissions', data),
    signoff: (id: number, data: any) => api.put(`/checklists/submissions/${id}/signoff`, data),
  },
};

export const sopsAPI = {
  getAll: (params?: { category?: string; status?: string; priority?: string }) => api.get('/sops', { params }),
  getById: (id: number) => api.get(`/sops/${id}`),
  create: (data: any) => api.post('/sops', data),
  update: (id: number, data: any) => api.put(`/sops/${id}`, data),
  updateStatus: (id: number, status: string) => api.put(`/sops/${id}/status`, { status }),
  getByFacility: (facilityId: number) => api.get(`/sops/facility/${facilityId}`),
};

export const gapsAPI = {
  summary: () => api.get('/gaps/summary'),
  getByFacility: (facilityId: number) => api.get(`/gaps/${facilityId}`),
  snapshot: (facilityId: number) => api.post(`/gaps/${facilityId}/snapshot`),
};

export const auditAPI = {
  modules: (facilityId: number) => api.get(`/audit/modules/${facilityId}`),
  simulations: {
    getAll: (facilityId?: number) => api.get('/audit/simulations', { params: facilityId ? { facility_id: facilityId } : {} }),
    getById: (id: number) => api.get(`/audit/simulations/${id}`),
    create: (facilityId: number) => api.post('/audit/simulations', { facility_id: facilityId }),
    saveResponses: (id: number, responses: any[]) => api.post(`/audit/simulations/${id}/responses`, { responses }),
    getScore: (id: number) => api.get(`/audit/simulations/${id}/score`),
  },
};

export const suppliersAPI = {
  getAll: (params?: { type?: string; status?: string }) => api.get('/suppliers', { params }),
  getById: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: number, data: any) => api.put(`/suppliers/${id}`, data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
  certifications: {
    getAll: (supplierId: number) => api.get(`/suppliers/${supplierId}/certifications`),
    create: (supplierId: number, data: any) => api.post(`/suppliers/${supplierId}/certifications`, data),
  },
  expiring: (days?: number) => api.get('/suppliers/expiring', { params: { days: days || 30 } }),
};

export const calendarAPI = {
  getEvents: (days?: number) => api.get('/calendar', { params: { days: days || 90 } }),
};

export const netsuiteAPI = {
  supplyMaster: (params?: { limit?: number; offset?: number }) =>
    api.get('/netsuite/supply-master', { params }),
};
