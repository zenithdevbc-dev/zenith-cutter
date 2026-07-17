import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import type { TempoProducaoOperadorItem } from "@/lib/relatorioOperadores";

interface ComparacaoTempoProducaoChartProps {
  dados: TempoProducaoOperadorItem[];
}

/**
 * Tempo médio de produção por operador (só quem tem ordem concluída
 * no período) — série única, barras horizontais. Cálculo em
 * lib/relatorioOperadores.ts; só renderiza.
 */
export function ComparacaoTempoProducaoChart({ dados }: ComparacaoTempoProducaoChartProps) {
  if (dados.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma ordem concluída no período filtrado.
      </p>
    );
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
          dataKey="operador"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value) => [formatarDuracaoMinutos(Number(value ?? 0)), "Tempo médio"]}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="minutos" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
