import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AtividadeClientesItem } from "@/lib/relatorioClientes";

interface AtividadeClientesChartProps {
  dados: AtividadeClientesItem[];
}

/**
 * Ordens criadas por dia no período filtrado (agregado — não por
 * cliente individual, só dias com ordem). Cálculo em
 * lib/relatorioClientes.ts; só renderiza.
 */
export function AtividadeClientesChart({ dados }: AtividadeClientesChartProps) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem ordens no período filtrado.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          formatter={(value) => [String(value ?? 0), "Ordens criadas"]}
          labelFormatter={(label) => `Dia ${label}`}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="quantidade"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-primary)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
