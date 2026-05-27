import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Hedef ikon kataloğu (Part 14). ServiceIconPicker pattern'i ile aynı görsel dil — line-art
 * Icon kutusu + seçili olanda primary outline + glow. Brief #13 "ikon tanımlar".
 */
type GoalIconDef = { key: string; icon: IconName };

export const GOAL_ICONS: GoalIconDef[] = [
  { key: 'plane', icon: 'plane' }, // Tatil
  { key: 'home', icon: 'home' }, // Ev
  { key: 'car', icon: 'car' }, // Araba
  { key: 'phone', icon: 'smartphone' }, // Telefon
  { key: 'gift', icon: 'gift' }, // Hediye
  { key: 'graduation', icon: 'graduation-cap' }, // Eğitim
  { key: 'piggy', icon: 'piggy-bank' }, // Genel birikim
  { key: 'heart', icon: 'heart' }, // Sağlık / Acil
  { key: 'star', icon: 'star' }, // Diğer
];

const ICON_BY_KEY = new Map(GOAL_ICONS.map((g) => [g.key, g]));

export function getGoalIcon(key: string | null): GoalIconDef {
  return (key && ICON_BY_KEY.get(key)) || GOAL_ICONS[GOAL_ICONS.length - 1];
}

export type GoalIconProps = {
  iconKey: string | null;
  size?: number;
};

/** Bir icon_key'i görsele çevirir (GoalCard + picker seçili gösterimi için). */
export function GoalIcon({ iconKey, size = 48 }: GoalIconProps) {
  const { colors } = useTheme();
  const def = getGoalIcon(iconKey);
  const radius = size <= 40 ? radii.md : radii.lg;

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceContainerHighest },
      ]}
    >
      <Icon name={def.icon} size={size * 0.5} color={colors.primary} strokeWidth={2} />
    </View>
  );
}

export type GoalIconPickerProps = {
  value: string;
  onChange: (key: string) => void;
};

/** İkon seçim grid'i. Seçili olan primary outline + glow ile vurgulu. */
export function GoalIconPicker({ value, onChange }: GoalIconPickerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {GOAL_ICONS.map((def) => {
        const active = def.key === value;
        return (
          <Pressable
            key={def.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={styles.cell}
            onPress={() => onChange(def.key)}
          >
            <View
              style={[
                styles.iconWrap,
                active
                  ? { borderColor: colors.primary, ...shadows.primaryGlow, shadowColor: colors.primary }
                  : { borderColor: 'transparent' },
              ]}
            >
              <GoalIcon iconKey={def.key} size={48} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  cell: {
    alignItems: 'center',
  },
  iconWrap: {
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: 2,
  },
});
