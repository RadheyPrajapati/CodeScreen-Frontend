import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { InterviewerDashboard } from './pages/InterviewerDashboard';
import { QuestionManagement } from './pages/QuestionManagement';
import { InterviewScheduling } from './pages/InterviewScheduling';
import { LiveRoom } from './pages/LiveRoom';
import { Feedback } from './pages/Feedback';
import { Profile } from './pages/Profile';

// App Entry Router
const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Auth Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      {/* Protected Main routes */}
      <Route
        path="/candidate-dashboard"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <DashboardLayout>
              <CandidateDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/interviewer-dashboard"
        element={
          <ProtectedRoute allowedRoles={['interviewer']}>
            <DashboardLayout>
              <InterviewerDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/questions"
        element={
          <ProtectedRoute allowedRoles={['interviewer']}>
            <DashboardLayout>
              <QuestionManagement />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/scheduling"
        element={
          <ProtectedRoute allowedRoles={['interviewer']}>
            <DashboardLayout>
              <InterviewScheduling />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/feedback/:interviewId"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Feedback />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Live Room: Standard full layout without dashboard sidebar */}
      <Route
        path="/live/:roomId"
        element={
          <ProtectedRoute>
            <LiveRoom />
          </ProtectedRoute>
        }
      />

      {/* Index Redirects based on user session role */}
      <Route
        path="/"
        element={
          user ? (
            user.role === 'candidate' ? (
              <Navigate to="/candidate-dashboard" replace />
            ) : (
              <Navigate to="/interviewer-dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
