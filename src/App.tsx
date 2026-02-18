import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authAPI, modulesAPI } from '@/api';
import { useAuthStore, useModuleStore } from '@/store';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { RoleProtectedRoute } from '@/components/RoleProtectedRoute';

// ── Eagerly loaded (always needed) ────────────────────────────────
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';

// ── Lazy loaded (only when navigated to) ──────────────────────────
const PreHarvestPage = lazy(() => import('@/pages/PreHarvestPage').then(m => ({ default: m.PreHarvestPage })));
const ChemicalsPage = lazy(() => import('@/pages/ChemicalsPage').then(m => ({ default: m.ChemicalsPage })));
const CorrectiveActionsPage = lazy(() => import('@/pages/CorrectiveActionsPage').then(m => ({ default: m.CorrectiveActionsPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const FacilitiesPage = lazy(() => import('@/pages/FacilitiesPage').then(m => ({ default: m.FacilitiesPage })));
const ChecklistsPage = lazy(() => import('@/pages/ChecklistsPage').then(m => ({ default: m.ChecklistsPage })));
const SOPHubPage = lazy(() => import('@/pages/SOPHubPage').then(m => ({ default: m.SOPHubPage })));
const GapAnalysisPage = lazy(() => import('@/pages/GapAnalysisPage').then(m => ({ default: m.GapAnalysisPage })));
const AuditSimulatorPage = lazy(() => import('@/pages/AuditSimulatorPage').then(m => ({ default: m.AuditSimulatorPage })));
const SupplierPage = lazy(() => import('@/pages/SupplierPage').then(m => ({ default: m.SupplierPage })));
const SupplyMasterPage = lazy(() => import('@/pages/SupplyMasterPage').then(m => ({ default: m.SupplyMasterPage })));
const AuditChecklistPage = lazy(() => import('@/pages/AuditChecklistPage').then(m => ({ default: m.AuditChecklistPage })));
const ComplianceDashboardPage = lazy(() => import('@/pages/ComplianceDashboardPage').then(m => ({ default: m.ComplianceDashboardPage })));
const ComplianceReportingPage = lazy(() => import('@/pages/ComplianceReportingPage').then(m => ({ default: m.ComplianceReportingPage })));
const TrainingPage = lazy(() => import('@/pages/TrainingPage').then(m => ({ default: m.TrainingPage })));
const RolesPage = lazy(() => import('@/pages/RolesPage').then(m => ({ default: m.RolesPage })));
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const ModuleConfigPage = lazy(() => import('@/pages/ModuleConfigPage').then(m => ({ default: m.ModuleConfigPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700" />
    </div>
  );
}

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
        // On error, enable all modules as fallback
        useModuleStore.getState().setModules([]);
      });
  }, [user, modulesLoaded, modulesLoading]);

  return (
    <div className="min-h-screen bg-green-50">
      {user && <Header />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pre-harvest"
            element={
              <ProtectedRoute>
                <PreHarvestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chemicals"
            element={
              <ProtectedRoute>
                <ChemicalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/corrective-actions"
            element={
              <RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}>
                <CorrectiveActionsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}>
                <ReportsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/facilities"
            element={
              <ProtectedRoute>
                <FacilitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checklists"
            element={
              <ProtectedRoute>
                <ChecklistsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sops"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <SOPHubPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/gap-analysis"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <GapAnalysisPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/audit-simulator"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <AuditSimulatorPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <SupplierPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/supply-master"
            element={
              <ProtectedRoute>
                <SupplyMasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <ComplianceDashboardPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/compliance-reporting"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <ComplianceReportingPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/training"
            element={
              <RoleProtectedRoute allowedRoles={['supervisor', 'fsqa', 'management', 'admin']}>
                <TrainingPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <AdminProtectedRoute>
                <RolesPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <AdminProtectedRoute>
                <TransactionsPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/modules"
            element={
              <AdminProtectedRoute>
                <ModuleConfigPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminProtectedRoute>
                <AuditLogPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/audit-checklist"
            element={
              <RoleProtectedRoute allowedRoles={['fsqa', 'management', 'admin']}>
                <AuditChecklistPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </div>
  );
}
