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
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  );
}
