import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radii } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type PinKeypadProps = {
  onDigit: (d: string) => void;
  onDelete: () => void;
  /** verilirse 4. satırın sol tuşu biyometrik tetikler */
  onBiometric?: () => void;
  disabled?: boolean;
};

const BTN_SIZE = 72;
const ICON_SIZE = 28;
const STROKE = 1.5;

/**
 * 4×3 PIN keypad. Numara butonları: 72px, surfaceContainerHigh, full radius,
 * basışta scale 0.95 + surfaceContainerHighest. Her basışta light haptic.
 * 4. satır: [bio?][0][del].
 */
export function PinKeypad({ onDigit, onDelete, onBiometric, disabled = false }: PinKeypadProps) {
  const rows = ['123', '456', '789'];

  const press = (fn: () => void) => () => {
    if (disabled) {
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <View style={[styles.grid, disabled && styles.gridDisabled]}>
      {rows.map((row) => (
        <View key={row} style={styles.row}>
          {row.split('').map((d) => (
            <KeyButton key={d} onPress={press(() => onDigit(d))} disabled={disabled}>
              <Text variant="headlineMd" color="onSurface" style={styles.digit}>
                {d}
              </Text>
            </KeyButton>
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {onBiometric ? (
          <KeyButton onPress={press(onBiometric)} disabled={disabled} ghost>
            <BiometricIcon />
          </KeyButton>
        ) : (
          <View style={styles.slot} />
        )}
        <KeyButton onPress={press(() => onDigit('0'))} disabled={disabled}>
          <Text variant="headlineMd" color="onSurface" style={styles.digit}>
            0
          </Text>
        </KeyButton>
        <KeyButton onPress={press(onDelete)} disabled={disabled} ghost>
          <DeleteIcon />
        </KeyButton>
      </View>
    </View>
  );
}

function KeyButton({
  children,
  onPress,
  disabled,
  ghost = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled: boolean;
  /** ghost = arka plansız (bio / delete tuşları) */
  ghost?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        !ghost && { backgroundColor: colors.surfaceContainerHigh },
        !ghost && pressed && { backgroundColor: colors.surfaceContainerHighest },
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Üç iç içe kemerden oluşan parmak izi benzeri ikon (ikon kütüphanesi yok). */
function BiometricIcon() {
  const { colors } = useTheme();
  return (
    <View style={styles.icon}>
      {[0, 1, 2].map((i) => {
        const size = ICON_SIZE - i * 8;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              bottom: 2,
              width: size,
              height: size,
              borderColor: colors.onSurfaceVariant,
              borderWidth: STROKE,
              borderBottomWidth: 0,
              borderTopLeftRadius: size / 2,
              borderTopRightRadius: size / 2,
            }}
          />
        );
      })}
    </View>
  );
}

function DeleteIcon() {
  const { colors } = useTheme();
  return (
    <Text variant="headlineSm" color="onSurfaceVariant" style={styles.delete}>
      {'⌫'}
    </Text>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 16,
  },
  gridDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  slot: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  digit: {
    fontWeight: '600',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  delete: {
    fontSize: 26,
    lineHeight: 30,
  },
});
