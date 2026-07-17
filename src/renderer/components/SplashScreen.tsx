import logoZenithDev from "@/assets/logo-zenith-dev.png";

/**
 * Tela de carregamento inicial (enquanto a sessão do Supabase resolve),
 * com a logo da Zenith DEV (estúdio) — decisão de 2026-07-16: só
 * aparece aqui, não em outro lugar do app.
 *
 * A logo atual (2026-07-16) tem fundo em degradê cinza (efeito
 * "glow"), não uma cor lisa — não dá pra "casar" a cor do fundo da
 * tela com a da imagem como antes (a v. anterior tinha fundo liso e
 * uma cor fixa resolvia). Fica visível uma borda ao redor da imagem
 * até vir uma versão com fundo transparente.
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
