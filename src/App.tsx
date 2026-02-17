import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authAPI } from '@/api';
import { useAuthStore } from '@/store';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PreHarvestPage } from '@/pages/PreHarvestPage';
import { ChemicalsPage } from '@/pages/ChemicalsPage';
import { CorrectiveActionsPage } from '@/pages/CorrectiveActionsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AdminPage } from '@/pages/AdminPage';
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute';
import { FacilitiesPage } from '@/pages/FacilitiesPage';
import { ChecklistsPage } from '@/pages/ChecklistsPage';
import { SOPHubPage } from '@/pages/SOPHubPage';
import { GapAnalysisPage } from '@/pages/GapAnalysisPage';
import { AuditSimulatorPage } from '@/pages/AuditSimulatorPage';
import { SupplierPage } from '@/pages/SupplierPage';
import { SupplyMasterPage } from '@/pages/SupplyMasterPage';

export default function App() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);

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

  return (
    <div className="min-h-screen bg-green-50">
      {user && <Header />}
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
            <ProtectedRoute>
              <CorrectiveActionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <SOPHubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gap-analysis"
          element={
            <ProtectedRoute>
              <GapAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-simulator"
          element={
            <ProtectedRoute>
              <AuditSimulatorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <SupplierPage />
            </ProtectedRoute>
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
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}
