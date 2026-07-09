import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Usuario, Empresa } from "@shared/models";

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

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
    if (!supabase || !session) {
      setUsuario(null);
      setEmpresa(null);
      return;
    }
    const client = supabase;

    let cancelled = false;

    client
      .from("usuarios")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setUsuario(null);
          return;
        }
        const perfil = data as Usuario;
        if (!perfil.ativo) {
          // Usuário desativado não pode continuar com sessão ativa.
          client.auth.signOut();
          return;
        }
        setUsuario(perfil);

        const { data: empresaData } = await client
          .from("empresas")
          .select("*")
          .eq("id", perfil.empresa_id)
          .single();
        if (cancelled) return;
        if (empresaData) {
          const empresaRow = empresaData as Empresa;
          setEmpresa(empresaRow);
          window.zenith.empresas.cache(empresaRow);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signIn(login: string, password: string) {
    if (!supabase) {
      return { error: "Supabase ainda não foi configurado neste projeto." };
    }

    // A credencial visível ao usuário é o login (não o e-mail) — resolve
    // para o e-mail real do Supabase Auth antes de autenticar. Roda como
    // anon (sem sessão ainda), via função security definer no Postgres
    // que só devolve o e-mail, nada mais.
    const { data: email, error: resolveError } = await supabase.rpc(
      "resolve_login_email",
      { p_login: login },
    );
    if (resolveError || !email) {
      return { error: "Login ou senha inválidos." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  const isAdmin = usuario?.papel === "administrador" && usuario?.ativo === true;

  return (
    <AuthContext.Provider
      value={{ session, usuario, empresa, isAdmin, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
