import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Usuario } from "@shared/models";

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
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
      return;
    }
    const client = supabase;

    let cancelled = false;

    client
      .from("usuarios")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
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
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signIn(email: string, password: string) {
    if (!supabase) {
      return { error: "Supabase ainda não foi configurado neste projeto." };
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
    <AuthContext.Provider value={{ session, usuario, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
