import { View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Path } from 'react-native-svg';
import { colors } from '../../theme';

export interface SimpleLineChartItem {
  label: string;
  value: number;
}

/** Linha simples com `react-native-svg` puro — mesma família de `DonutChart`/`SimpleBarChart`. */
export function SimpleLineChart({
  data,
  width,
  height = 140,
  color = colors.statusProduction,
}: {
  data: SimpleLineChartItem[];
  width: number;
  height?: number;
  color?: string;
}) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const padding = 10;
  const usableHeight = height - padding * 2;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const pontos = data.map((d, i) => ({
    x: padding + i * stepX,
    y: padding + usableHeight - (d.value / maxValue) * usableHeight,
  }));
  const path = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <SvgLine
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke={colors.border}
          strokeWidth={1}
        />
        {data.length > 1 && <Path d={path} stroke={color} strokeWidth={2} fill="none" />}
        {pontos.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </Svg>
    </View>
  );
}
