import { useEffect } from "react";
import { toast } from "sonner";

export function UpdateNotifier() {
  useEffect(() => {
    return window.zenith.updater.onUpdateDownloaded(() => {
      toast.info("Uma nova versão foi baixada.", {
        duration: Infinity,
        action: {
          label: "Reiniciar e atualizar",
          onClick: () => window.zenith.updater.quitAndInstall(),
        },
      });
    });
  }, []);

  return null;
}
