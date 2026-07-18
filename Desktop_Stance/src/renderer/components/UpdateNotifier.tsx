import { useEffect } from "react";
import { toast } from "sonner";

// Mesmo id nos dois toasts: o segundo (update-downloaded) substitui o
// primeiro (update-available) no lugar, em vez de empilhar dois avisos.
const UPDATE_TOAST_ID = "app-update";

export function UpdateNotifier() {
  useEffect(() => {
    const unsubscribeAvailable = window.zenith.updater.onUpdateAvailable(() => {
      // Dispara assim que a checagem encontra versão nova — antes do
      // download (~134MB) terminar. Pedido do usuário: avisar mais
      // cedo em vez de só quando o download completo já tiver
      // acabado (que pode demorar dependendo da internet).
      toast.loading("Nova versão encontrada — baixando em segundo plano...", {
        id: UPDATE_TOAST_ID,
        duration: Infinity,
      });
    });

    const unsubscribeDownloaded = window.zenith.updater.onUpdateDownloaded(() => {
      toast.info("Uma nova versão foi baixada.", {
        id: UPDATE_TOAST_ID,
        duration: Infinity,
        action: {
          label: "Reiniciar e atualizar",
          onClick: () => window.zenith.updater.quitAndInstall(),
        },
      });
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeDownloaded();
    };
  }, []);

  return null;
}
