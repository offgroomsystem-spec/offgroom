import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AcessoNegado } from '@/components/AcessoNegado';
import { hasRouteAccess } from '@/types/permissions';
import { useEffect, useState } from 'react';

const ProtectedRoute = () => {
  const { user, loading, tipoLogin, checkSubscription, subscriptionStatus } = useAuth();
  const location = useLocation();
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (user && !loading) {
      checkSubscription().finally(() => setCheckingSubscription(false));
    } else if (!loading) {
      setCheckingSubscription(false);
    }
  }, [user, loading]);

  if (loading || checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar acesso baseado em assinatura (exceto para /pagamento)
  if (location.pathname !== '/pagamento' && subscriptionStatus && !subscriptionStatus.hasAccess) {
    return <Navigate to="/pagamento" replace />;
  }

  // Verificar se o usuário tem permissão para acessar esta rota
  if (tipoLogin && !hasRouteAccess(tipoLogin, location.pathname)) {
    return <AcessoNegado />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
