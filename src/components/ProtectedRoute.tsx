import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'candidate' | 'interviewer'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950 text-brand-500">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save original location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, send back to role appropriate dashboard
    return <Navigate to={user.role === 'candidate' ? '/candidate-dashboard' : '/interviewer-dashboard'} replace />;
  }

  return <>{children}</>;
};
