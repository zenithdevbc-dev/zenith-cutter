import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AtividadeBancasItem } from "@/lib/relatorioBancas";

interface AtividadeBancasChartProps {
  dados: AtividadeBancasItem[];
}

/**
 * Peças de ordens vinculadas a bancas por dia no período filtrado
 * (agregado — não por banca individual, só dias com ordem). Cálculo em
 * lib/relatorioBancas.ts; só renderiza.
 */
export function AtividadeBancasChart({ dados }: AtividadeBancasChartProps) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem ordens de bancas no período filtrado.</p>;
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
          formatter={(value) => [String(value ?? 0), "Peças"]}
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
