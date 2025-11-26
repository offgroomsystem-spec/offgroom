import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard = ({ permission, children, fallback }: PermissionGuardProps) => {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Acesso Não Permitido</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Entre em contato com o administrador do sistema para solicitar acesso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
