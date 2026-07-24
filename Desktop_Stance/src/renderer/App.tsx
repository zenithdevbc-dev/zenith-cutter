import { Suspense, lazy, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { SplashScreen } from "@/components/SplashScreen";
import { UpdateNotifier } from "@/components/UpdateNotifier";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth-context";
import { getAllowedNavItems, type PageId } from "@/lib/navigation";

// Code-splitting por página (Sprint 7 — "otimizações"): recharts
// (Dashboard/Relatórios) e jspdf/exceljs/html2canvas (Relatórios) só
// entram no bundle quando a página que os usa é aberta, em vez de
// inflar o chunk inicial que todo mundo baixa no login.
const CadastrosPage = lazy(() =>
  import("@/pages/CadastrosPage").then((m) => ({ default: m.CadastrosPage })),
);
const BancasPage = lazy(() =>
  import("@/pages/BancasPage").then((m) => ({ default: m.BancasPage })),
);
const OrdensCortePage = lazy(() =>
  import("@/pages/OrdensCortePage").then((m) => ({ default: m.OrdensCortePage })),
);
const ProducaoPage = lazy(() =>
  import("@/pages/ProducaoPage").then((m) => ({ default: m.ProducaoPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ConfiguracoesPage = lazy(() =>
  import("@/pages/ConfiguracoesPage").then((m) => ({ default: m.ConfiguracoesPage })),
);
const RelatoriosPage = lazy(() =>
  import("@/pages/RelatoriosPage").then((m) => ({ default: m.RelatoriosPage })),
);

function PageFallback() {
  return (
    <div className="flex flex-col gap-3 p-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

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
          <div key={currentPage} className="h-full animate-in fade-in duration-200">
            <Suspense fallback={<PageFallback />}>
              {currentPage === "cadastros" ? (
                <CadastrosPage />
              ) : currentPage === "bancas" ? (
                <BancasPage />
              ) : currentPage === "ordens-corte" ? (
                <OrdensCortePage />
              ) : currentPage === "producao" ? (
                <ProducaoPage />
              ) : currentPage === "dashboard" ? (
                <DashboardPage />
              ) : currentPage === "relatorios" ? (
                <RelatoriosPage />
              ) : (
                <ConfiguracoesPage />
              )}
            </Suspense>
          </div>
        </AppShell>
      )}
    </>
  );
}

export default App;
