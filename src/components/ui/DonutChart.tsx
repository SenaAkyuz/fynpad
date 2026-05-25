import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';

export type DonutSegment = { value: number; color: string; label: string };

export type DonutChartProps = {
  segments: DonutSegment[];
  /** dış çap */
  size: number;
  /** halka kalınlığı */
  strokeWidth: number;
  /** ortada büyük metin (örn. "₺12,8B") */
  centerLabel?: string;
  /** ortada üstte küçük metin (örn. "Toplam") */
  centerSubLabel?: string;
};

/**
 * react-native-svg ile custom donut. Kontinüöz halka, butt linecap (DESIGN.md 7.2).
 * Segment açısı = (value / total) * 360. SVG -90° döndürülerek üstten başlar.
 */
export function DonutChart({
  segments,
  size,
  strokeWidth,
  centerLabel,
  centerSubLabel,
}: DonutChartProps) {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={colors.surfaceContainerHigh}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * circumference;
            const node = (
              <Circle
                key={`${seg.label}-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                fill="none"
              />
            );
            offset += len;
            return node;
          })}
        </G>
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {centerSubLabel ? (
          <Text variant="labelSm" color="onSurfaceVariant">
            {centerSubLabel}
          </Text>
        ) : null}
        {centerLabel ? (
          <Text variant="headlineSm" style={styles.centerLabel}>
            {centerLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontWeight: '700',
  },
});
