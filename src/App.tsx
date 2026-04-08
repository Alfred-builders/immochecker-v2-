import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/use-auth';
import { AuthLayout } from '@/layouts/auth-layout';
import { MainLayout } from '@/layouts/main-layout';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { InviteAcceptPage } from '@/features/auth/invite-accept-page';
import { PatrimoinePage } from '@/features/patrimoine/patrimoine-page';
import { BatimentDetailPage } from '@/features/patrimoine/batiment-detail-page';
import { LotDetailPage } from '@/features/patrimoine/lot-detail-page';
import { SettingsPage } from '@/features/admin/settings-page';
import { TiersPage } from '@/features/tiers/tiers-page';
import { TiersDetailPage } from '@/features/tiers/tiers-detail-page';
import { MissionsPage } from '@/features/missions/missions-page';
import { MissionDetailPage } from '@/features/missions/mission-detail-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { TemplatesPage } from '@/features/templates/templates-page';

// ---------------------------------------------------------------------------
// Protected route wrapper
// ---------------------------------------------------------------------------

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ---------------------------------------------------------------------------
// App router
// ---------------------------------------------------------------------------

export function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/patrimoine" element={<PatrimoinePage />} />
          <Route
            path="/app/patrimoine/batiments/:id"
            element={<BatimentDetailPage />}
          />
          <Route path="/app/patrimoine/lots/:id" element={<LotDetailPage />} />
          <Route path="/app/tiers" element={<TiersPage />} />
          <Route path="/app/tiers/:id" element={<TiersDetailPage />} />
          <Route path="/app/missions" element={<MissionsPage />} />
          <Route path="/app/missions/:id" element={<MissionDetailPage />} />
          <Route path="/app/templates" element={<TemplatesPage />} />
          <Route path="/app/parametres" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
