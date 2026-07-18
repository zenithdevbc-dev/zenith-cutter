import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DistribuicaoStatusItem } from "@/lib/dashboardCharts";

interface DistribuicaoStatusChartProps {
  dados: DistribuicaoStatusItem[];
}

/**
 * Distribuição de peças por status em gráfico de rosca, com legenda
 * própria ao lado (cor + nome + quantidade) — mais legível que a
 * legenda padrão do recharts em espaços estreitos. Cálculo em
 * lib/dashboardCharts.ts; este componente só renderiza.
 */
export function DistribuicaoStatusChart({ dados }: DistribuicaoStatusChartProps) {
  const total = dados.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-[200px] shrink-0">
        <PieChart>
          <Pie
            data={dados}
            dataKey="quantidade"
            nameKey="nome"
            innerRadius="60%"
            outerRadius="90%"
            paddingAngle={2}
          >
            {dados.map((item) => (
              <Cell key={item.status} fill={item.cor} stroke="var(--color-card)" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, nome) => [String(value ?? 0), String(nome)]}
            contentStyle={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex w-full flex-col gap-1">
        {dados.map((item) => (
          <div key={item.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.cor }}
              />
              {item.nome}
            </span>
            <span className="text-muted-foreground">
              {item.quantidade}
              {total > 0 && ` (${Math.round((item.quantidade / total) * 100)}%)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
