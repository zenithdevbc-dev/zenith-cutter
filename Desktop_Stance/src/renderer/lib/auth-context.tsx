import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import { syncManager } from "./syncManager";
import { setSessionPin, clearSessionPin } from "./pin";
import type { Usuario, Empresa } from "@shared/models";

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  isAdmin: boolean;
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
      syncManager.stop();
      window.zenith.session.clearEmpresaLocal();
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
          clearSessionPin();
          client.auth.signOut();
          return;
        }
        // Achado crítico de auditoria: o SQLite local é um único
        // arquivo por máquina, sem isolamento entre empresas — sem
        // isso, um usuário de outra empresa logando na mesma máquina
        // via dados cacheados de uma empresa anterior. Precisa
        // terminar ANTES de setUsuario (que libera a UI a renderizar
        // páginas que já disparam leitura local) — se corresse depois,
        // haveria uma janela onde a UI já autenticada tenta ler antes
        // do main process saber qual empresa filtrar. Usa
        // perfil.empresa_id direto (não espera o fetch de "empresas"
        // abaixo, que é só pra exibir o nome).
        await window.zenith.session.setEmpresaLocal(perfil.empresa_id);
        if (cancelled) return;
        setUsuario(perfil);
        // Dispara o motor de sync (retry automático em segundo plano,
        // detecção de rede/reconexão — Sprint 6); nunca bloqueia o uso
        // do app se a rede estiver indisponível.
        syncManager.start();

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

  async function signIn(codigoEmpresa: string, login: string, password: string) {
    if (!supabase) {
      return { error: "Supabase ainda não foi configurado neste projeto." };
    }

    // A credencial visível ao usuário é o login (não o e-mail) — resolve
    // para o e-mail real do Supabase Auth antes de autenticar. Roda como
    // anon (sem sessão ainda), via função security definer no Postgres
    // que só devolve o e-mail, nada mais. Pedido do usuário: o código da
    // empresa (campo "EMPRESA", formato AA00) também precisa bater —
    // funciona como uma segunda senha, pra não dar pra logar na empresa
    // errada por acidente.
    const { data: email, error: resolveError } = await supabase.rpc(
      "resolve_login_email",
      { p_login: login, p_codigo_empresa: codigoEmpresa },
    );
    if (resolveError || !email) {
      return { error: "Login ou senha inválidos." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      await setSessionPin(password);
      return { error: null };
    }
    // Achado de auditoria: repassar error.message aqui (ex.: "Invalid
    // login credentials", em inglês, direto do Supabase) é uma
    // mensagem diferente da genérica usada acima pra "login não
    // existe" — dava pra descobrir se um login existia só pela
    // mensagem de erro voltar diferente. Mesma mensagem genérica pros
    // dois casos.
    return { error: "Login ou senha inválidos." };
  }

  async function signOut() {
    clearSessionPin();
    syncManager.stop();
    await window.zenith.session.clearEmpresaLocal();
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
