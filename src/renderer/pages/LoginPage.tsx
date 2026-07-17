import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import logo from "@/assets/logo.png";

export function LoginPage() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(login, password);
    if (signInError) setError(signInError);
    setSubmitting(false);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        {/* Fundo sampleado do próprio arquivo da logo (#FBF7F3), não
            bg-card (#FFFFFF) — evita o efeito de caixa visível ao
            redor da imagem (mesmo motivo do SplashScreen/Sidebar). */}
        <CardHeader
          className="flex items-center justify-center rounded-t-xl"
          style={{ backgroundColor: "#FBF7F3" }}
        >
          <img src={logo} alt="Zenith Cutter" className="h-32 w-32 object-contain" />
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured ? (
            <p className="text-sm text-muted-foreground">
              Supabase ainda não foi configurado neste ambiente. Preencha
              VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env
              (veja .env.example) para habilitar o login.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="login">Usuário</Label>
                <Input
                  id="login"
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
