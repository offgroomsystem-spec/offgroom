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
  loading: boolean;
  signOut: () => Promise<void>;
  incrementLoginCount: () => Promise<number>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          loadProfile(session.user.id);
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
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const incrementLoginCount = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('login_count')
        .eq('id', user.id)
        .single();

      const newCount = (currentProfile?.login_count || 0) + 1;

      const { error } = await supabase
        .from('profiles')
        .update({ login_count: newCount })
        .eq('id', user.id);

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
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, incrementLoginCount }}>
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
