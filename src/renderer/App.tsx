import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CadastrosPage } from "@/pages/CadastrosPage";
import { OrdensCortePage } from "@/pages/OrdensCortePage";
import { ProducaoPage } from "@/pages/ProducaoPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ConfiguracoesPage } from "@/pages/ConfiguracoesPage";
import { LoginPage } from "@/pages/LoginPage";
import { SplashScreen } from "@/components/SplashScreen";
import { UpdateNotifier } from "@/components/UpdateNotifier";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";
import { getAllowedNavItems, type PageId } from "@/lib/navigation";

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
        <SplashScreen />
      ) : !session ? (
        <LoginPage />
      ) : (
        <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
          {currentPage === "cadastros" ? (
            <CadastrosPage />
          ) : currentPage === "ordens-corte" ? (
            <OrdensCortePage />
          ) : currentPage === "producao" ? (
            <ProducaoPage />
          ) : currentPage === "dashboard" ? (
            <DashboardPage />
          ) : (
            <ConfiguracoesPage />
          )}
        </AppShell>
      )}
    </>
  );
}

export default App;
