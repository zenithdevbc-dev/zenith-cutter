import logoZenithDev from "@/assets/logo-zenith-dev.jpeg";

/**
 * Tela de carregamento inicial (enquanto a sessão do Supabase resolve),
 * com a logo da Zenith DEV (estúdio) — decisão de 2026-07-16: só
 * aparece aqui, não em outro lugar do app.
 */
export function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <img
        src={logoZenithDev}
        alt="Zenith DEV"
        className="h-40 w-40 animate-pulse object-contain"
      />
    </div>
  );
}
