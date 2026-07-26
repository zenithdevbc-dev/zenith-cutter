import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme';

export interface DonutChartItem {
  value: number;
  color: string;
}

/**
 * Donut simples com `react-native-svg` puro (sem lib de gráficos de
 * terceiros — `react-native-gifted-charts` foi descartada por exigir em
 * tempo de execução `react-native-linear-gradient`/`expo-linear-gradient`,
 * mesmo com PieChart/BarChart sem usar gradiente nenhum; nenhuma das
 * duas é usada aqui, então evitar mais um módulo nativo/codegen fazia
 * mais sentido do que trabalhar em volta do bug da lib). Técnica:
 * um `Circle` com `strokeDasharray`/`strokeDashoffset` por fatia,
 * girado -90° pra começar às 12h.
 */
export function DonutChart({
  data,
  size = 140,
  strokeWidth = 22,
  centerLabel,
}: {
  data: DonutChartItem[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((soma, d) => soma + d.value, 0);

  let acumulado = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        {total === 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        ) : (
          data.map((item, index) => {
            const fracao = item.value / total;
            const segLen = fracao * circumference;
            const offset = acumulado;
            acumulado += segLen;
            return (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segLen} ${circumference - segLen}`}
                strokeDashoffset={-offset}
                fill="transparent"
              />
            );
          })
        )}
      </Svg>
      {centerLabel && <View style={styles.center}>{centerLabel}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
