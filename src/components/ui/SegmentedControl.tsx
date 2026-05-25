import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { radii, shadows } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type SegmentOption = { value: string; label: string };

export type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

const PAD = 4;
const HEIGHT = 44;

/**
 * DESIGN.md "Segmented Controls": recessed track (surfaceContainer), aktif tile
 * glass-morphic floating (surfaceContainerHighest + shadow), seçenekler arası smooth slide.
 */
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const count = options.length;
  const tileWidth = trackWidth > 0 ? (trackWidth - PAD * 2) / count : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withTiming(index * tileWidth, { duration: 220 });
  }, [index, tileWidth, tx]);

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceContainer }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {tileWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tile,
            tileStyle,
            {
              width: tileWidth,
              backgroundColor: colors.surfaceContainerHighest,
              ...shadows.floating,
              shadowColor: '#0f172a',
            },
          ]}
        />
      ) : null}

      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.segment}
            onPress={() => onChange(o.value)}
          >
            <Text variant="labelMd" color={active ? 'onSurface' : 'onSurfaceVariant'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: radii.full,
    padding: PAD,
  },
  tile: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    height: HEIGHT - PAD * 2,
    borderRadius: radii.full,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
