import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { DbStatusCard } from "@/components/DbStatusCard";
import type { PageId } from "@/lib/navigation";

const PAGE_DESCRIPTIONS: Record<PageId, string> = {
  dashboard:
    "Visão operacional de ordens por status, mesas livres/ocupadas e indicadores. Chega no Sprint 5.",
  "fila-producao":
    "Fila ordenada de produção, seleção de mesa e confirmação de início. Chega no Sprint 3.",
  "ordens-corte":
    "Criação, edição e consulta de Ordens de Corte. Chega no Sprint 2.",
  cadastros:
    "Usuários, Clientes, Produtos, Tecidos e Mesas de Corte. Chega no Sprint 1.",
  configuracoes: "Configurações básicas do sistema. Chega no Sprint 1.",
};

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      <div className="flex flex-col gap-4">
        <PlaceholderPage
          title="Em construção"
          description={PAGE_DESCRIPTIONS[currentPage]}
        />
        {currentPage === "dashboard" && <DbStatusCard />}
      </div>
    </AppShell>
  );
}

export default App;
