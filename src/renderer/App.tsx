import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { CadastrosPage } from "@/pages/CadastrosPage";
import { DbStatusCard } from "@/components/DbStatusCard";
import { SyncStatusCard } from "@/components/SyncStatusCard";
import { LoginPage } from "@/pages/LoginPage";
import { UpdateNotifier } from "@/components/UpdateNotifier";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";
import { getAllowedNavItems, type PageId } from "@/lib/navigation";

const PAGE_DESCRIPTIONS: Record<Exclude<PageId, "cadastros">, string> = {
  dashboard:
    "Visão operacional de ordens por status, mesas livres/ocupadas e indicadores. Chega no Sprint 5.",
  "fila-producao":
    "Fila ordenada de produção, seleção de mesa e confirmação de início. Chega no Sprint 3.",
  "ordens-corte":
    "Criação, edição e consulta de Ordens de Corte. Chega no Sprint 2.",
  configuracoes: "Configurações básicas do sistema. Chega no Sprint 1.",
};

function App() {
  const { session, usuario, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  useEffect(() => {
    if (!usuario) return;
    const allowed = getAllowedNavItems(usuario.papel);
    if (!allowed.some((item) => item.id === currentPage)) {
      setCurrentPage(allowed[0]?.id ?? "dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  return (
    <>
      <Toaster />
      <UpdateNotifier />
      {loading ? (
        <div className="h-screen w-screen bg-background" />
      ) : !session ? (
        <LoginPage />
      ) : (
        <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
          {currentPage === "cadastros" ? (
            <CadastrosPage />
          ) : (
            <div className="flex flex-col gap-4">
              <PlaceholderPage
                title="Em construção"
                description={PAGE_DESCRIPTIONS[currentPage]}
              />
              {currentPage === "dashboard" && (
                <>
                  <DbStatusCard />
                  <SyncStatusCard />
                </>
              )}
            </div>
          )}
        </AppShell>
      )}
    </>
  );
}

export default App;
