import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se é um dos primeiros 2 logins e não está na página /empresa, redirecionar
  if (profile && profile.login_count <= 2 && location.pathname !== '/empresa') {
    return <Navigate to="/empresa" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
