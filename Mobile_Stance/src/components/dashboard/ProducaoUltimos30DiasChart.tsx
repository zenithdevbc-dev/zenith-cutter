import { ScrollView } from 'react-native';
import { SimpleBarChart } from '../charts/SimpleBarChart';
import type { ProducaoDiaItem } from '../../lib/dashboardCharts';
import { colors } from '../../theme';

/** Barras de peças produzidas por dia (últimos 30 dias) — rolagem horizontal, tela estreita. */
export function ProducaoUltimos30DiasChart({ dados }: { dados: ProducaoDiaItem[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <SimpleBarChart
        data={dados.map((d) => ({ label: d.label, value: d.quantidade }))}
        height={140}
        color={colors.statusProduction}
      />
    </ScrollView>
  );
}
