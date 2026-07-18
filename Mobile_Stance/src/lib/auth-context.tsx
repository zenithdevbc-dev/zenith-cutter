import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Usuario, Empresa } from '../models';

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  loading: boolean;
  signIn: (
    codigoEmpresa: string,
    login: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setUsuario(null);
      setEmpresa(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('usuarios')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setUsuario(null);
          return;
        }
        const perfil = data as Usuario;
        if (!perfil.ativo) {
          await supabase.auth.signOut();
          return;
        }
        setUsuario(perfil);

        const { data: empresaData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', perfil.empresa_id)
          .single();
        if (cancelled) return;
        if (empresaData) setEmpresa(empresaData as Empresa);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signIn(codigoEmpresa: string, login: string, password: string) {
    // Mesmo modelo de 3 credenciais do Desktop_Stance
    // (auth-context.tsx.signIn): login (não e-mail) resolvido via RPC
    // security-definer que também exige o código da empresa (AA00) —
    // impede logar na empresa errada por acidente.
    const { data: email, error: resolveError } = await supabase.rpc(
      'resolve_login_email',
      { p_login: login, p_codigo_empresa: codigoEmpresa },
    );
    if (resolveError || !email) {
      return { error: 'Login ou senha inválidos.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      return { error: null };
    }
    // Mensagem genérica igual pros dois casos (login inexistente vs.
    // senha errada) — evita enumeração, mesmo padrão do desktop.
    return { error: 'Login ou senha inválidos.' };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, usuario, empresa, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
