import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Abonelik ikon kataloğu. `brand` → marka renginde kutu + baş harf; `icon` → line-art Icon.
 * Brief 4.4 "ikon/logo seçebilir" → predefined liste. (Upload MVP'de YOK.)
 */
type BrandIcon = { key: string; label: string; type: 'brand'; bg: string; initial: string };
type LineIcon = { key: string; label: string; type: 'icon'; icon: IconName };
export type ServiceIconDef = BrandIcon | LineIcon;

export const SERVICE_ICONS: ServiceIconDef[] = [
  { key: 'netflix', label: 'Netflix', type: 'brand', bg: '#E50914', initial: 'N' },
  { key: 'spotify', label: 'Spotify', type: 'brand', bg: '#1DB954', initial: 'S' },
  { key: 'youtube', label: 'YouTube', type: 'brand', bg: '#FF0000', initial: 'Y' },
  { key: 'disney', label: 'Disney+', type: 'brand', bg: '#113CCF', initial: 'D' },
  { key: 'apple', label: 'Apple', type: 'brand', bg: '#1d1d1f', initial: 'A' },
  { key: 'amazon', label: 'Amazon', type: 'brand', bg: '#FF9900', initial: 'a' },
  { key: 'icloud', label: 'iCloud', type: 'brand', bg: '#3478F6', initial: 'i' },
  { key: 'gpt', label: 'ChatGPT', type: 'brand', bg: '#10A37F', initial: 'G' },
  { key: 'tv', label: 'subscriptions.iconLabels.tv', type: 'icon', icon: 'tv' },
  { key: 'music', label: 'subscriptions.iconLabels.music', type: 'icon', icon: 'music' },
  { key: 'cloud', label: 'subscriptions.iconLabels.cloud', type: 'icon', icon: 'cloud' },
  { key: 'gamepad', label: 'subscriptions.iconLabels.game', type: 'icon', icon: 'gamepad' },
  { key: 'book', label: 'subscriptions.iconLabels.education', type: 'icon', icon: 'book' },
  { key: 'gym', label: 'subscriptions.iconLabels.fitness', type: 'icon', icon: 'activity' },
  { key: 'newspaper', label: 'subscriptions.iconLabels.news', type: 'icon', icon: 'file-text' },
  { key: 'generic', label: 'subscriptions.iconLabels.other', type: 'icon', icon: 'repeat' },
];

const ICON_BY_KEY = new Map(SERVICE_ICONS.map((s) => [s.key, s]));

export function getServiceIcon(key: string | null): ServiceIconDef {
  return (key && ICON_BY_KEY.get(key)) || SERVICE_ICONS[SERVICE_ICONS.length - 1];
}

export type ServiceIconProps = {
  iconKey: string | null;
  size?: number;
};

/** Bir icon_key'i görsele çevirir (liste item + picker seçili gösterimi için). */
export function ServiceIcon({ iconKey, size = 48 }: ServiceIconProps) {
  const { colors } = useTheme();
  const def = getServiceIcon(iconKey);
  const radius = size <= 40 ? radii.md : radii.lg;

  if (def.type === 'brand') {
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: def.bg }]}>
        <Text style={[styles.initial, { fontSize: size * 0.42, color: '#ffffff' }]}>{def.initial}</Text>
      </View>
    );
  }
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

export type ServiceIconPickerProps = {
  value: string;
  onChange: (key: string) => void;
};

/** İkon seçim grid'i (4 sütun). Seçili olan primary outline + glow ile vurgulu. */
export function ServiceIconPicker({ value, onChange }: ServiceIconPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {SERVICE_ICONS.map((def) => {
        const active = def.key === value;
        const label = def.type === 'brand' ? def.label : t(def.label);
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
                active && {
                  borderColor: colors.primary,
                  ...shadows.primaryGlow,
                  shadowColor: colors.primary,
                },
                !active && { borderColor: 'transparent' },
              ]}
            >
              <ServiceIcon iconKey={def.key} size={48} />
            </View>
            <Text variant="labelSm" color={active ? 'primary' : 'onSurfaceVariant'} numberOfLines={1} style={styles.label}>
              {label}
            </Text>
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
  initial: {
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
  cell: {
    width: '22%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: 2,
  },
  label: {
    textAlign: 'center',
  },
});
