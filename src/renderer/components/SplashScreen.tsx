import logoZenithDev from "@/assets/logo-zenith-dev.jpeg";

/**
 * Tela de carregamento inicial (enquanto a sessão do Supabase resolve),
 * com a logo da Zenith DEV (estúdio) — decisão de 2026-07-16: só
 * aparece aqui, não em outro lugar do app.
 *
 * O fundo usa a cor real do arquivo da logo (sampleada do próprio
 * .jpeg, #FDFAF5), não a variável --background (#FAFAF8) do tema —
 * são levemente diferentes por causa da compressão JPEG, e essa
 * diferença mínima já era suficiente pra aparecer uma "caixa" visível
 * ao redor da logo. Só nesta tela; o resto do app continua usando
 * --background normalmente.
 */
export function SplashScreen() {
  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ backgroundColor: "#FDFAF5" }}
    >
      <img
        src={logoZenithDev}
        alt="Zenith DEV"
        className="h-40 w-40 animate-pulse object-contain"
      />
    </div>
  );
}
