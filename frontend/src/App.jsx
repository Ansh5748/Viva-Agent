import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CollegeSignupPage from './pages/CollegeSignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Authenticated Pages
import CollegeDashboard from './pages/CollegeDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateExamPage from './pages/CreateExamPage';
import VivaExamPage from './pages/VivaExamPage';
import SubscriptionPage from './pages/SubscriptionPage';

// Layouts/Protected Routes (You might want to implement these more robustly)
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            richColors 
            toastOptions={{
              style: { height: 'auto', minHeight: '60px', padding: '16px' }
            }}
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/college-signup" element={<CollegeSignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route path="/college/dashboard" element={<ProtectedRoute allowedRoles={['college_admin', 'teacher']}><CollegeDashboard /></ProtectedRoute>} />
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['global_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/create-exam" element={<ProtectedRoute allowedRoles={['college_admin', 'teacher']}><CreateExamPage /></ProtectedRoute>} />
            <Route path="/viva/:examId" element={<ProtectedRoute allowedRoles={['student']}><VivaExamPage /></ProtectedRoute>} />
            <Route path="/subscribe" element={<ProtectedRoute allowedRoles={['college_admin']}><SubscriptionPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
