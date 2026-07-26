import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export interface SimpleBarChartItem {
  label: string;
  value: number;
  color?: string;
}

/**
 * Barras verticais com `View` puro (sem SVG) — mais simples e leve que
 * desenhar retângulos em SVG pra um caso tão direto. Rolagem horizontal
 * (quando o gráfico tem muitas barras, ex. 30 dias) é responsabilidade
 * de quem usa este componente (`ScrollView horizontal`).
 */
export function SimpleBarChart({
  data,
  height = 140,
  barWidth = 14,
  spacing = 10,
  color = colors.statusProduction,
}: {
  data: SimpleBarChartItem[];
  height?: number;
  barWidth?: number;
  spacing?: number;
  color?: string;
}) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const barHeight = Math.round((item.value / maxValue) * height);
        return (
          <View key={`${item.label}-${index}`} style={[styles.column, { width: barWidth + spacing }]}>
            <View style={[styles.trackArea, { height }]}>
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: item.value > 0 ? Math.max(barHeight, 2) : 0,
                    backgroundColor: item.color ?? color,
                  },
                ]}
              />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    alignItems: 'center',
  },
  trackArea: {
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  label: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 4,
  },
});
