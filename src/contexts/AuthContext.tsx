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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  incrementLoginCount: (userId?: string) => Promise<number>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
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
      setRoles((data || []).map(r => r.role));
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      setRoles([]);
    }
  };

  const hasRole = (role: string) => roles.includes(role);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadProfile(session.user.id);
          loadUserRoles(session.user.id);
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
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
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
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, incrementLoginCount, hasRole }}>
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
