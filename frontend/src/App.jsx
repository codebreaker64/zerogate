import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import ComplianceDashboard from './pages/ComplianceDashboard';
import WalletLogin from './pages/WalletLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing Page - Institutional Login */}
        <Route path="/" element={<WalletLogin />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<WalletLogin />} />
        <Route path="/onboarding" element={<BusinessOnboarding />} />

        {/* Business/Client Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />
        {/* Redirect old /marketplace to /dashboard or keep parallel if needed. User asked to redirect to dashboard. */}
        <Route path="/marketplace" element={<Navigate to="/dashboard" replace />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ComplianceDashboard />} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;