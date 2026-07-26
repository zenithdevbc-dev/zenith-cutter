import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import type { StatusOrdemCorte } from "@shared/models";

const TODAS_ETAPAS: StatusOrdemCorte[] = [
  "planejado",
  "em_fila",
  "enfesto",
  "corte",
  "embalagem",
  "despacho",
  "pronto",
  "cancelada",
];

interface EtapaMultiSelectProps {
  selecionadas: StatusOrdemCorte[];
  onChange: (proximas: StatusOrdemCorte[]) => void;
  className?: string;
}

/**
 * Filtro "Etapa" por checkbox de seleção múltipla (pedido do usuário,
 * 2026-07-26) — nenhuma selecionada = sem filtro (mostra todas). Usa
 * DropdownMenuCheckboxItem (já existente no design system) em vez de
 * um Popover+Checkbox novo — mesmo resultado, sem componente/lib
 * adicional. `onSelect` com `preventDefault()` impede o menu de
 * fechar a cada clique, permitindo marcar várias etapas seguidas.
 */
export function EtapaMultiSelect({ selecionadas, onChange, className }: EtapaMultiSelectProps) {
  function toggle(status: StatusOrdemCorte, marcado: boolean) {
    if (marcado) {
      onChange([...selecionadas, status]);
    } else {
      onChange(selecionadas.filter((s) => s !== status));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className ?? "w-full justify-between font-normal"}>
          {selecionadas.length === 0 ? "Todas as etapas" : `Etapa (${selecionadas.length})`}
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Etapas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TODAS_ETAPAS.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={selecionadas.includes(status)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(marcado) => toggle(status, marcado)}
          >
            {STATUS_ORDEM_CORTE_LABEL[status]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
