import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { permissions, isOwner, hasPermission } = useAuth();

  return {
    permissions,
    isOwner,
    hasPermission,
    // Helper functions for common checks
    canAccessPage: (codigo: string) => hasPermission(codigo),
    canCreate: (codigo: string) => hasPermission(codigo),
    canEdit: (codigo: string) => hasPermission(codigo),
    canDelete: (codigo: string) => hasPermission(codigo),
  };
};
