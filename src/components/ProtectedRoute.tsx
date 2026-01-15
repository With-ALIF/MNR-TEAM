import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'instructor';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to appropriate login page
        if (requiredRole === 'admin') {
          navigate('/admin/login', { replace: true });
        } else if (requiredRole === 'instructor') {
          navigate('/instructor/login', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
        return;
      }

      // Check role access
      if (requiredRole && role !== requiredRole) {
        // Redirect to their correct dashboard
        if (role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (role === 'instructor') {
          navigate('/instructor', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, role, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
