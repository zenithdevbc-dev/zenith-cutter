import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TendenciaPerdaItem } from "@/lib/relatorioMateriais";

interface TendenciaPerdasChartProps {
  dados: TendenciaPerdaItem[];
}

/**
 * Perdas registradas ao longo do tempo (só dias com registro — o
 * período pode ser grande ou sem filtro nenhum, diferente do gráfico
 * fixo de 30 dias do Dashboard). Cor âmbar (--status-pending) marca
 * semanticamente "atenção/perda", distinta do azul de produção.
 * Cálculo em lib/relatorioMateriais.ts; só renderiza.
 */
export function TendenciaPerdasChart({ dados }: TendenciaPerdasChartProps) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma perda registrada no período filtrado.</p>;
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
          formatter={(value) => [String(value ?? 0), "Perdas registradas"]}
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
          stroke="var(--color-status-pending)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-status-pending)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
