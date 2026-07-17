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
        {/* Fundo sampleado do próprio arquivo da logo (#FBF7F3), não
            --background (#FAFAF8) — evita o efeito de caixa visível
            ao redor da imagem (mesmo motivo do SplashScreen). */}
        <div className="w-full rounded-md p-1.5" style={{ backgroundColor: "#FBF7F3" }}>
          <img src={logo} alt="Zenith Cutter" className="h-16 w-full object-contain" />
        </div>
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
