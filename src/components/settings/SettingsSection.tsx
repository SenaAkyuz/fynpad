import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type SettingsSectionProps = {
  /** Üst başlık (örn. "TERCİHLER"). Verilmezse başlıksız kart. */
  title?: string;
  children: ReactNode;
};

/**
 * Ayarlar bölümü: opsiyonel başlık + içindeki row'ları saran kart.
 * Row'lar arasına 1px hairline ayraç koyar (DESIGN.md outlineVariant).
 */
export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.wrapper}>
      {title ? (
        <Text variant="labelMd" color="onSurfaceVariant" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
});
