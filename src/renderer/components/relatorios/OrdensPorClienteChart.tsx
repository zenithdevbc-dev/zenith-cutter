import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OrdensPorClienteItem } from "@/lib/relatorioClientes";

interface OrdensPorClienteChartProps {
  dados: OrdensPorClienteItem[];
}

/**
 * Número de ordens por cliente (top clientes no período filtrado) —
 * série única, barras horizontais (nomes de cliente podem ser
 * longos). Cálculo em lib/relatorioClientes.ts; só renderiza.
 */
export function OrdensPorClienteChart({ dados }: OrdensPorClienteChartProps) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem ordens no período filtrado.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, dados.length * 36)}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="cliente"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value) => [String(value ?? 0), "Ordens"]}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="ordens" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
