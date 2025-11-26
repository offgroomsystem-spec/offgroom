import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AcessoNegado } from '@/components/AcessoNegado';
import { hasRouteAccess } from '@/types/permissions';

const ProtectedRoute = () => {
  const { user, loading, tipoLogin } = useAuth();
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

  // Verificar se o usuário tem permissão para acessar esta rota
  if (tipoLogin && !hasRouteAccess(tipoLogin, location.pathname)) {
    return <AcessoNegado />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
