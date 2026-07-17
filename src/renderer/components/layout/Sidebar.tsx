import { cn } from "@/lib/utils";
import { getAllowedNavItems, type PageId } from "@/lib/navigation";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/logo.png";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { empresa, usuario } = useAuth();
  const items = getAllowedNavItems(usuario?.papel);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col items-center gap-1 border-b border-sidebar-border px-4 py-3">
        {/* Logo atual (2026-07-16) tem fundo em degradê cinza, não cor
            lisa — não dá mais pra "casar" com uma cor fixa de fundo
            (ver SplashScreen). Sem moldura clara: o cinza da imagem já
            fica razoável direto sobre o fundo escuro da sidebar. */}
        <img src={logo} alt="Zenith Cutter" className="h-16 w-full rounded-md object-contain" />
        {empresa && (
          <span className="truncate text-xs text-sidebar-foreground">
            {empresa.nome}
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === currentPage;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
