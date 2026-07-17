import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { gerarResumoProducao } from "@/lib/resumoProducao";
import type { MesaCorteComStatus, OrdemCorteResumo, RelatorioProducaoLinha } from "@shared/models";

interface ResumoProducaoCardProps {
  mesas: MesaCorteComStatus[] | null;
  podeVerOrdens: boolean;
  ordens: OrdemCorteResumo[] | null;
  producao: RelatorioProducaoLinha[] | null;
}

/**
 * Card "inteligente" no topo do Dashboard (pedido do usuário,
 * 2026-07-16): saudação por horário + destaques da produção em texto
 * corrido, não em lista de KPI. Sem dado novo — só narra o que o
 * Dashboard já busca (mesas pra todos os papéis; ordens/produção só
 * quando `podeVerOrdens`, mesma regra do resto da página). Geração do
 * texto em lib/resumoProducao.ts (puro); este componente só decide o
 * estado de carregamento e renderiza.
 */
export function ResumoProducaoCard({
  mesas,
  podeVerOrdens,
  ordens,
  producao,
}: ResumoProducaoCardProps) {
  const carregando = mesas === null || (podeVerOrdens && (ordens === null || producao === null));

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-3 py-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        {carregando ? (
          <Skeleton className="h-5 w-full max-w-md" />
        ) : (
          <p className="text-sm leading-relaxed">
            {gerarResumoProducao({
              mesasTotal: mesas.filter((m) => m.ativo).length,
              mesasOcupadas: mesas.filter((m) => m.ativo && m.ocupada).length,
              ordens: podeVerOrdens ? ordens ?? [] : undefined,
              producao: podeVerOrdens ? producao ?? [] : undefined,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
