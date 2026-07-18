import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradeQuantidadeInput } from "@/components/ordens/GradeQuantidadeInput";
import {
  listProducaoPerdas,
  registrarProducaoPerda,
  listProducaoObservacoes,
  registrarProducaoObservacao,
} from "@/lib/producao";
import { listProdutoTamanhos } from "@/lib/produtoTamanhos";
import { useAuth } from "@/lib/auth-context";
import type {
  ProducaoObservacao,
  ProducaoPerda,
  ProdutoTamanho,
  SessaoProducaoResumo,
} from "@shared/models";

interface PerdasObservacoesDialogProps {
  sessao: SessaoProducaoResumo;
}

/**
 * Registro de perdas e observações da sessão (Sprint 4) — log
 * cronológico, sem PIN (não é uma transição de estado listada em
 * 3.1), mas rastreável por usuário+timestamp (3.5).
 */
export function PerdasObservacoesDialog({ sessao }: PerdasObservacoesDialogProps) {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState<ProdutoTamanho[]>([]);
  const [perdas, setPerdas] = useState<ProducaoPerda[] | null>(null);
  const [observacoes, setObservacoes] = useState<ProducaoObservacao[] | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const [texto, setTexto] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listProdutoTamanhos(sessao.produto_id)
      .then((tamanhos) => setGrade(tamanhos.filter((t) => t.ativo)))
      .catch(() => toast.error("Não foi possível carregar a grade do produto."));
    listProducaoPerdas(sessao.id)
      .then(setPerdas)
      .catch(() => toast.error("Não foi possível carregar as perdas registradas."));
    listProducaoObservacoes(sessao.id)
      .then(setObservacoes)
      .catch(() => toast.error("Não foi possível carregar as observações."));
  }, [open, sessao.id, sessao.produto_id]);

  async function handleRegistrarPerda(event: FormEvent) {
    event.preventDefault();
    if (!usuario) return;
    const itens = grade
      .map((t) => ({ produto_tamanho_id: t.id, quantidade: Number(quantidades[t.id] || 0) }))
      .filter((i) => i.quantidade > 0);
    if (itens.length === 0) return;

    setSubmitting(true);
    try {
      const novas: ProducaoPerda[] = [];
      for (const item of itens) {
        const nova = await registrarProducaoPerda(
          {
            sessao_id: sessao.id,
            produto_tamanho_id: item.produto_tamanho_id,
            quantidade: item.quantidade,
            motivo: motivo || null,
          },
          usuario.id,
        );
        novas.push(nova);
      }
      setPerdas((prev) => [...novas, ...(prev ?? [])]);
      setQuantidades({});
      setMotivo("");
    } catch {
      toast.error("Não foi possível registrar a perda.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdicionarObservacao(event: FormEvent) {
    event.preventDefault();
    if (!usuario || !texto.trim()) return;
    setSubmitting(true);
    try {
      const nova = await registrarProducaoObservacao(
        { sessao_id: sessao.id, texto: texto.trim() },
        usuario.id,
      );
      setObservacoes((prev) => [nova, ...(prev ?? [])]);
      setTexto("");
    } catch {
      toast.error("Não foi possível adicionar a observação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Perdas / Observações
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ordem Nº {sessao.ordem_numero} — Perdas e Observações</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="perdas">
          <TabsList>
            <TabsTrigger value="perdas">Perdas</TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="perdas" className="flex flex-col gap-4">
            <form onSubmit={handleRegistrarPerda} className="flex flex-col gap-3">
              <GradeQuantidadeInput
                grade={grade}
                quantidades={quantidades}
                onChange={(id, value) =>
                  setQuantidades((prev) => ({ ...prev, [id]: value }))
                }
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <Button type="submit" disabled={submitting}>
                  Registrar
                </Button>
              </div>
            </form>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {perdas === null ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : perdas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma perda registrada.</p>
              ) : (
                perdas.map((perda) => (
                  <div key={perda.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {perda.tamanho ? `${perda.tamanho} — ${perda.quantidade}` : perda.quantidade}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(perda.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {perda.motivo && <p className="text-muted-foreground">{perda.motivo}</p>}
                    <p className="text-xs text-muted-foreground">{perda.usuario_nome}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="observacoes" className="flex flex-col gap-4">
            <form onSubmit={handleAdicionarObservacao} className="flex gap-2">
              <Input
                placeholder="Nova observação"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <Button type="submit" disabled={submitting || !texto.trim()}>
                Adicionar
              </Button>
            </form>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {observacoes === null ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : observacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
              ) : (
                observacoes.map((obs) => (
                  <div key={obs.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{obs.usuario_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(obs.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p>{obs.texto}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
