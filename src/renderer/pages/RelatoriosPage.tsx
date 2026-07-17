import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelatorioProducaoTab } from "@/components/relatorios/RelatorioProducaoTab";
import { HistoricoOrdensTab } from "@/components/relatorios/HistoricoOrdensTab";
import { MateriaisTab } from "@/components/relatorios/MateriaisTab";
import { ClientesTab } from "@/components/relatorios/ClientesTab";
import { OperadoresTab } from "@/components/relatorios/OperadoresTab";
import { listRelatorioProducao, listRelatorioPerdas } from "@/lib/relatorios";
import { listOrdensCorte } from "@/lib/ordensCorte";
import { listClientes } from "@/lib/clientes";
import { listTecidos } from "@/lib/tecidos";
import { listUsuarios } from "@/lib/usuarios";
import { mesclarHistoricoOrdens } from "@/lib/historicoOrdens";
import type {
  Cliente,
  OrdemCorteResumo,
  RelatorioPerdaLinha,
  RelatorioProducaoLinha,
  Tecido,
  Usuario,
} from "@shared/models";

/**
 * Relatórios (admin/supervisor) — cinco abas: "Produção" (visão
 * gerencial de um período, com KPIs), "Histórico de Ordens" (consulta
 * de toda ordem já registrada), "Materiais" (consumo/perdas por
 * material), "Clientes" (atividade/volume por cliente) e "Operadores"
 * (produtividade/carga de trabalho por operador, pedido do usuário
 * 2026-07-16). Dados compartilhados (ordens, sessões de produção,
 * perdas, cadastros pra filtro) são buscados uma única vez aqui e
 * passados como props — cada aba só filtra/renderiza, sem lógica de
 * negócio nem chamada IPC própria.
 */
export function RelatoriosPage() {
  const [ordens, setOrdens] = useState<OrdemCorteResumo[] | null>(null);
  const [producao, setProducao] = useState<RelatorioProducaoLinha[] | null>(null);
  const [perdas, setPerdas] = useState<RelatorioPerdaLinha[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecidos, setTecidos] = useState<Tecido[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    listOrdensCorte()
      .then(setOrdens)
      .catch(() => toast.error("Não foi possível carregar as ordens de corte."));
    listRelatorioProducao()
      .then(setProducao)
      .catch(() => toast.error("Não foi possível carregar os dados de produção."));
    listRelatorioPerdas()
      .then(setPerdas)
      .catch(() => toast.error("Não foi possível carregar as perdas registradas."));
    listClientes()
      .then((c) => setClientes(c.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os clientes."));
    listTecidos()
      .then((t) => setTecidos(t.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os materiais."));
    listUsuarios()
      .then((u) => setUsuarios(u.filter((x) => x.ativo)))
      .catch(() => toast.error("Não foi possível carregar os operadores."));
  }, []);

  const historico = useMemo(
    () => (ordens && producao ? mesclarHistoricoOrdens(ordens, producao) : null),
    [ordens, producao],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Relatórios</h2>
        <p className="text-sm text-muted-foreground">
          Produção por período e consulta ao histórico completo de ordens.
        </p>
      </div>

      <Tabs defaultValue="producao" className="min-h-0 flex-1">
        <TabsList className="shrink-0">
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Ordens</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="operadores">Operadores</TabsTrigger>
        </TabsList>
        <TabsContent value="producao" className="min-h-0 overflow-y-auto">
          <RelatorioProducaoTab
            linhas={producao}
            clientes={clientes}
            tecidos={tecidos}
            usuarios={usuarios}
          />
        </TabsContent>
        <TabsContent value="historico" className="min-h-0 overflow-y-auto">
          <HistoricoOrdensTab
            linhas={historico}
            clientes={clientes}
            tecidos={tecidos}
            usuarios={usuarios}
          />
        </TabsContent>
        <TabsContent value="materiais" className="min-h-0 overflow-y-auto">
          <MateriaisTab
            ordens={ordens}
            perdas={perdas}
            clientes={clientes}
            tecidos={tecidos}
          />
        </TabsContent>
        <TabsContent value="clientes" className="min-h-0 overflow-y-auto">
          <ClientesTab linhas={producao} clientes={clientes} tecidos={tecidos} />
        </TabsContent>
        <TabsContent value="operadores" className="min-h-0 overflow-y-auto">
          <OperadoresTab linhas={producao} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
