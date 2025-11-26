import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  nome_completo: string;
  email_hotmart: string;
  whatsapp: string;
  login_count: number;
}

interface StaffAccount {
  id: string;
  owner_id: string;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isOwner: boolean;
  staffAccount: StaffAccount | null;
  loading: boolean;
  signOut: () => Promise<void>;
  incrementLoginCount: (userId?: string) => Promise<number>;
  hasRole: (role: string) => boolean;
  hasPermission: (codigo: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      const userRoles = (data || []).map(r => r.role);
      setRoles(userRoles);
      setIsOwner(userRoles.includes('owner'));
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      setRoles([]);
      setIsOwner(false);
    }
  };

  const loadStaffAccount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('id, owner_id, ativo')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsStaff(true);
        setStaffAccount(data);
        // Update ultimo_acesso
        await supabase
          .from('staff_accounts')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', data.id);
      } else {
        setIsStaff(false);
        setStaffAccount(null);
      }
    } catch (error) {
      console.error('Erro ao carregar conta de staff:', error);
      setIsStaff(false);
      setStaffAccount(null);
    }
  };

  const loadPermissions = async (userId: string) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff_accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffError) throw staffError;

      if (staffData) {
        const { data: permsData, error: permsError } = await supabase
          .from('staff_permissions')
          .select('permission_codigo')
          .eq('staff_id', staffData.id);

        if (permsError) throw permsError;
        setPermissions((permsData || []).map(p => p.permission_codigo));
      } else {
        // Not a staff user, clear permissions
        setPermissions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
    }
  };

  const hasRole = (role: string) => roles.includes(role);
  
  const hasPermission = (codigo: string) => {
    // Owners have all permissions
    if (isOwner) return true;
    // Staff must have explicit permission
    return permissions.includes(codigo);
  };

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadProfile(session.user.id);
          loadUserRoles(session.user.id);
          loadStaffAccount(session.user.id);
          loadPermissions(session.user.id);
        }, 0);
      }
      setLoading(false);
    });

    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadProfile(session.user.id);
            loadUserRoles(session.user.id);
            loadStaffAccount(session.user.id);
            loadPermissions(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
          setIsStaff(false);
          setIsOwner(false);
          setStaffAccount(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Logout automático ao fechar navegador
  useEffect(() => {
    const sessionMarker = sessionStorage.getItem('offgroom_session_active');
    
    if (!sessionMarker && session) {
      supabase.auth.signOut();
    } else if (session) {
      sessionStorage.setItem('offgroom_session_active', 'true');
    }
  }, [session]);

  const incrementLoginCount = async (userId?: string): Promise<number> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return 0;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('login_count')
        .eq('id', targetUserId)
        .single();

      const newCount = (currentProfile?.login_count || 0) + 1;

      const { error } = await supabase
        .from('profiles')
        .update({ login_count: newCount })
        .eq('id', targetUserId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, login_count: newCount } : null);
      return newCount;
    } catch (error) {
      console.error('Erro ao incrementar login_count:', error);
      return 0;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    
    // Clear all sensitive data from localStorage
    const keysToRemove = [
      'agendamentos',
      'agendamentosPacotes',
      'lancamentos_financeiros',
      'contas_bancarias',
      'empresaConfig',
      'groomers',
      'pacotes',
      'produtos',
      'receitas',
      'despesas',
      'servicos',
      'clientes',
      'racas'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    setIsStaff(false);
    setIsOwner(false);
    setStaffAccount(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      roles, 
      permissions, 
      isStaff, 
      isOwner, 
      staffAccount,
      loading, 
      signOut, 
      incrementLoginCount, 
      hasRole,
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
