import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { NAV_ITEMS, type PageId } from "@/lib/navigation";

interface AppShellProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function AppShell({ currentPage, onNavigate, children }: AppShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === currentPage);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b px-6">
          <h1 className="text-base font-semibold">{activeItem?.label}</h1>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
