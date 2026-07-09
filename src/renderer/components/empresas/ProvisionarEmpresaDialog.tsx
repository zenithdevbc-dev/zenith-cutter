import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createEmpresa } from "@/lib/empresas";

/**
 * Uso interno Zenith DEV — provisiona empresa-cliente nova + primeiro
 * administrador. Não é signup público: a autorização é o segredo
 * compartilhado (mesmo que protege a Edge Function create-empresa),
 * digitado aqui a cada uso, nunca guardado. Acessível só pelo link
 * discreto na tela de login (ver LoginPage.tsx) — nenhum usuário de
 * empresa-cliente vê ou precisa disso no dia a dia.
 */
export function ProvisionarEmpresaDialog() {
  const [open, setOpen] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminLogin, setAdminLogin] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNomeEmpresa("");
    setAdminNome("");
    setAdminEmail("");
    setAdminLogin("");
    setAdminSenha("");
    setSecret("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { empresa } = await createEmpresa({
        nome_empresa: nomeEmpresa,
        admin_nome: adminNome,
        admin_email: adminEmail,
        admin_login: adminLogin,
        admin_senha: adminSenha,
        provisioning_secret: secret,
      });
      toast.success(`Empresa ${empresa.nome} provisionada.`);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao provisionar empresa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Provisionar nova empresa (uso interno Zenith DEV)
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provisionar empresa-cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome-empresa">Nome da empresa</Label>
            <Input
              id="nome-empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-nome">Nome do administrador</Label>
            <Input
              id="admin-nome"
              value={adminNome}
              onChange={(e) => setAdminNome(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-email">E-mail do administrador</Label>
            <Input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-login">Login do administrador</Label>
            <Input
              id="admin-login"
              value={adminLogin}
              onChange={(e) => setAdminLogin(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-senha">Senha provisória</Label>
            <Input
              id="admin-senha"
              type="password"
              minLength={8}
              value={adminSenha}
              onChange={(e) => setAdminSenha(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="secret">Chave de provisionamento</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Provisionando..." : "Provisionar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
