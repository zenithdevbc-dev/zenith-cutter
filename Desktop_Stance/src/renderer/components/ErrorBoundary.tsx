import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Rede de segurança pra erro inesperado de render (Sprint 7 —
 * "tratamento de erros"). Só uma class component consegue capturar
 * isso em React — sem ela, um bug de render deixa a tela em branco
 * sem recuperação, inaceitável pra um operador de chão de fábrica que
 * não vai abrir o DevTools. Reporta pro log do processo main antes de
 * mostrar a tela de recuperação, pra não depender do usuário
 * descrever o que viu.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    window.zenith.log
      .reportError({ message: error.message, stack: error.stack ?? info.componentStack ?? undefined })
      .catch(() => {
        // Se nem o IPC de log responder, não há mais nada a fazer aqui —
        // a tela de recuperação abaixo já cobre o usuário.
      });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-lg font-semibold">Ocorreu um erro inesperado</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            O Zenith Cutter encontrou um problema e precisa recarregar. Nenhum
            dado local foi perdido.
          </p>
          <Button onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
