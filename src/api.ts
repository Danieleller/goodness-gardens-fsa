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
    if (error.response?.status === 401) {
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
