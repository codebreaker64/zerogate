import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessOnboarding from './pages/BusinessOnboarding';
import ComplianceDashboard from './pages/ComplianceDashboard';
import UserDashboard from './pages/UserDashboard';
import UserKYC from './pages/UserKYC';
import UserLogin from './pages/UserLogin';
import UserRegistration from './pages/UserRegistration';
import WalletLogin from './pages/WalletLogin';

import LandingPage from './pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<WalletLogin />} />
        <Route path="/onboarding" element={<BusinessOnboarding />} />

        {/* User / Retail Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/kyc" element={<UserKYC />} />
        <Route path="/user/register" element={<UserRegistration />} />
        <Route
          path="/user/dashboard"
          element={
            <UserProtectedRoute>
              <UserDashboard />
            </UserProtectedRoute>
          }
        />
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