import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import AppPromoBanner from '@/components/AppPromoBanner';
import HomePage from '@/pages/HomePage';
import SettingsPage from '@/pages/SettingsPage';
import SavedPlacesPage from '@/pages/SavedPlacesPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import TermsPage from '@/pages/TermsPage';

// Login removed for now — add back later when needed

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/saved" element={<SavedPlacesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        {/* Only "open in app" prompt on the site — shows on web only, not in native iOS/Android app */}
        <AppPromoBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
