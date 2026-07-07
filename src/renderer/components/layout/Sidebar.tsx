import { cn } from "@/lib/utils";
import { NAV_ITEMS, type PageId } from "@/lib/navigation";
import { useAuth } from "@/lib/auth-context";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { empresa } = useAuth();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 flex-col justify-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">
          Zenith Cutter
        </span>
        {empresa && (
          <span className="truncate text-xs text-muted-foreground">
            {empresa.nome}
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
