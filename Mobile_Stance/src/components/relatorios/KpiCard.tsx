import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

/** Tile de KPI reutilizado pelas 6 abas de Relatórios. */
export function KpiCard({ label, valor }: { label: string; valor: string | number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
  },
  valor: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
});
