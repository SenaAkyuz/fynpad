import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type PinDotsProps = {
  /** toplam hane sayısı */
  length: number;
  /** girilen hane sayısı */
  current: number;
  /** hata durumu — tüm dots error rengine döner + shake */
  error?: boolean;
};

const DOT_SIZE = 14;

/** 6 dot, dolu = primary, boş = outline border. Hata: error rengi + yatay shake. */
export function PinDots({ length, current, error = false }: PinDotsProps) {
  const { colors } = useTheme();
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) {
      return;
    }
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8],
  });

  return (
    <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              error
                ? { backgroundColor: colors.error, borderColor: colors.error }
                : filled
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: 'transparent', borderColor: colors.outline },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
});
