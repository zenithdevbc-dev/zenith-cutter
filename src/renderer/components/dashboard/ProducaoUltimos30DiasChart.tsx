import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProducaoDiaItem } from "@/lib/dashboardCharts";

interface ProducaoUltimos30DiasChartProps {
  dados: ProducaoDiaItem[];
}

/**
 * Peças produzidas por dia, últimos 30 dias (dia sem conclusão
 * aparece com 0 — eixo do tempo contínuo). Cálculo em
 * lib/dashboardCharts.ts; este componente só renderiza.
 */
export function ProducaoUltimos30DiasChart({ dados }: ProducaoUltimos30DiasChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          interval={2}
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
          formatter={(value) => [String(value ?? 0), "Peças produzidas"]}
          labelFormatter={(label) => `Dia ${label}`}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="quantidade" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
