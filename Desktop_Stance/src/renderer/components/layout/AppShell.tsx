import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { SyncIndicator } from "./SyncIndicator";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, type PageId } from "@/lib/navigation";
import { useAuth } from "@/lib/auth-context";

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function AppShell({ currentPage, onNavigate, children }: AppShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === currentPage);
  const { session, signOut } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <h1 className="flex items-center gap-2.5 text-base font-semibold">
            <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
            {activeItem?.label}
          </h1>
          <div className="flex items-center gap-4">
            <SyncIndicator />
            <span className="text-sm text-muted-foreground">
              {session?.user.email}
            </span>
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
