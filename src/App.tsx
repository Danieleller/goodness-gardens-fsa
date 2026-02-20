import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authAPI, modulesAPI } from '@/api';
import { useAuthStore, useModuleStore } from '@/store';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { RoleProtectedRoute } from '@/components/RoleProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PreHarvestPage } from '@/pages/PreHarvestPage';
import { ChemicalsPage } from '@/pages/ChemicalsPage';
import { CorrectiveActionsPage } from '@/pages/CorrectiveActionsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AdminPage } from '@/pages/AdminPage';
import { FacilitiesPage } from '@/pages/FacilitiesPage';
import { ChecklistsPage } from '@/pages/ChecklistsPage';
import { SOPHubPage } from '@/pages/SOPHubPage';
import { GapAnalysisPage } from '@/pages/GapAnalysisPage';
import { AuditSimulatorPage } from '@/pages/AuditSimulatorPage';
import { SupplierPage } from '@/pages/SupplierPage';
import { AuditChecklistPage } from '@/pages/AuditChecklistPage';
import { ComplianceDashboardPage } from '@/pages/ComplianceDashboardPage';
import { ComplianceReportingPage } from '@/pages/ComplianceReportingPage';
import { TrainingPage } from '@/pages/TrainingPage';
import { RolesPage } from '@/pages/RolesPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { ModuleConfigPage } from '@/pages/ModuleConfigPage';
import { OpsMyTasksPage } from '@/pages/OpsMyTasksPage';
import { OpsTaskFormPage } from '@/pages/OpsTaskFormPage';
import { OpsStatusBoardPage } from '@/pages/OpsStatusBoardPage';
import { OpsTransactionsPage } from '@/pages/OpsTransactionsPage';
import { OpsCalendarPage } from '@/pages/OpsCalendarPage';
import { OpsTemplatesPage } from '@/pages/OpsTemplatesPage';

export default function App() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { loaded: modulesLoaded, loading: modulesLoading } = useModuleStore();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await authAPI.me();
        const token = useAuthStore.getState().token;
        if (token) {
          setAuth(response.data.user, token);
        }
      } catch (error) {
        useAuthStore.getState().logout();
      }
    };

    if (useAuthStore.getState().token && !user) {
      restoreSession();
    }
  }, []);

  // Fetch enabled modules ONCE at app boot (shared by Header + Dashboard + all pages)
  useEffect(() => {
    if (!user || modulesLoaded || modulesLoading) return;
    useModuleStore.getState().setLoading(true);
    modulesAPI.getEnabled()
      .then((res) => {
        useModuleStore.getState().setModules(res.data?.modules || []);
      })
      .catch(() => {
        useModuleStore.getState().setModules([]);
      });
  }, [user, modulesLoaded, modulesLoading]);

  return (
    <div className="min-h-screen bg-green-50">
      {user && <Header />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/pre-harvest" element={<ProtectedRoute><PreHarvestPage /></ProtectedRoute>} />
        <Route path="/chemicals" element={<ProtectedRoute><ChemicalsPage /></ProtectedRoute>} />
        <Route path="/corrective-actions" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><CorrectiveActionsPage /></RoleProtectedRoute>} />
        <Route path="/reports" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><ReportsPage /></RoleProtectedRoute>} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
        <Route path="/facilities" element={<ProtectedRoute><FacilitiesPage /></ProtectedRoute>} />
        <Route path="/checklists" element={<ProtectedRoute><ChecklistsPage /></ProtectedRoute>} />
        <Route path="/sops" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><SOPHubPage /></RoleProtectedRoute>} />
        <Route path="/gap-analysis" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><GapAnalysisPage /></RoleProtectedRoute>} />
        <Route path="/audit-simulator" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><AuditSimulatorPage /></RoleProtectedRoute>} />
        <Route path="/suppliers" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><SupplierPage /></RoleProtectedRoute>} />
        <Route path="/supply-master" element={<Navigate to="/suppliers" replace />} />
        <Route path="/compliance" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><ComplianceDashboardPage /></RoleProtectedRoute>} />
        <Route path="/compliance-reporting" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><ComplianceReportingPage /></RoleProtectedRoute>} />
        <Route path="/training" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><TrainingPage /></RoleProtectedRoute>} />
        <Route path="/admin/roles" element={<AdminProtectedRoute><RolesPage /></AdminProtectedRoute>} />
        <Route path="/admin/transactions" element={<AdminProtectedRoute><TransactionsPage /></AdminProtectedRoute>} />
        <Route path="/admin/modules" element={<AdminProtectedRoute><ModuleConfigPage /></AdminProtectedRoute>} />
        <Route path="/admin/audit" element={<AdminProtectedRoute><AuditLogPage /></AdminProtectedRoute>} />
        <Route path="/audit-checklist" element={<RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}><AuditChecklistPage /></RoleProtectedRoute>} />
        <Route path="/ops/my-tasks" element={<ProtectedRoute><OpsMyTasksPage /></ProtectedRoute>} />
        <Route path="/ops/tasks/:id" element={<ProtectedRoute><OpsTaskFormPage /></ProtectedRoute>} />
        <Route path="/ops/status" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><OpsStatusBoardPage /></RoleProtectedRoute>} />
        <Route path="/ops/transactions" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><OpsTransactionsPage /></RoleProtectedRoute>} />
        <Route path="/ops/calendar" element={<RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}><OpsCalendarPage /></RoleProtectedRoute>} />
        <Route path="/ops/templates" element={<AdminProtectedRoute><OpsTemplatesPage /></AdminProtectedRoute>} />
        {/* Redirects for renamed routes */}
        <Route path="/locations" element={<Navigate to="/facilities" replace />} />
        <Route path="/location-setup" element={<Navigate to="/facilities" replace />} />
        <Route path="/users" element={<Navigate to="/admin" replace />} />
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}
