import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import AppPromoBanner from '@/components/AppPromoBanner';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import SettingsPage from '@/pages/SettingsPage';
import SavedPlacesPage from '@/pages/SavedPlacesPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsPage from '@/pages/TermsPage';
import { Loader2 } from 'lucide-react';

/** If the URL has a password-recovery hash but we're not on /reset-password, redirect there so the user can set a new password instead of landing logged in. */
function RecoveryRedirect({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    const pathname = window.location.pathname;
    if (hash && hash.includes('type=recovery') && pathname !== '/reset-password') {
      window.location.replace('/reset-password' + hash);
      return null;
    }
  }
  return <>{children}</>;
}

/** Protects app routes: redirects to /login if not signed in. Public: /login, /privacy, /terms. */
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public: login, reset password, and legal pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Protected: require signed-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/saved" element={<SavedPlacesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RecoveryRedirect>
          <AppRoutes />
          {/* Only "open in app" prompt on the site — shows on web only, not in native iOS/Android app */}
          <AppPromoBanner />
        </RecoveryRedirect>
      </AuthProvider>
    </BrowserRouter>
  );
}
