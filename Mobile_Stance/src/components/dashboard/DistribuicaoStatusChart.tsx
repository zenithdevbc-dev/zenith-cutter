import { StyleSheet, Text, View } from 'react-native';
import { DonutChart } from '../charts/DonutChart';
import type { DistribuicaoStatusItem } from '../../lib/dashboardCharts';
import { colors } from '../../theme';

/** Donut de peças por status. */
export function DistribuicaoStatusChart({ dados }: { dados: DistribuicaoStatusItem[] }) {
  const total = dados.reduce((soma, d) => soma + d.quantidade, 0);

  return (
    <View style={styles.container}>
      <DonutChart
        data={dados.map((d) => ({ value: d.quantidade, color: d.cor }))}
        size={110}
        strokeWidth={20}
        centerLabel={
          <View style={styles.centerLabel}>
            <Text style={styles.centerValue}>{total}</Text>
            <Text style={styles.centerCaption}>peças</Text>
          </View>
        }
      />
      <View style={styles.legenda}>
        {dados.map((item) => (
          <View key={item.status} style={styles.legendaLinha}>
            <View style={[styles.legendaCor, { backgroundColor: item.cor }]} />
            <Text style={styles.legendaTexto} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={styles.legendaValor}>{item.quantidade}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  centerCaption: {
    fontSize: 10,
    color: colors.muted,
  },
  legenda: {
    flex: 1,
    gap: 6,
  },
  legendaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaCor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendaTexto: {
    flex: 1,
    fontSize: 12,
    color: colors.foreground,
  },
  legendaValor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
});
