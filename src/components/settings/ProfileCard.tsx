import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type ProfileCardProps = {
  /** Görünen ad; boşsa fallback metin gösterilir. */
  name: string;
  email: string;
  onPress: () => void;
};

/**
 * Settings üst profil kartı (GlassCard): initial avatar + ad + email + chevron.
 * Tap → /profile-edit.
 */
export function ProfileCard({ name, email, onPress }: ProfileCardProps) {
  const { colors } = useTheme();
  const trimmed = name.trim();
  const initial = (trimmed[0] ?? email.trim()[0] ?? 'F').toUpperCase();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <GlassCard>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text variant="headlineSm" color="onPrimaryContainer">
              {initial}
            </Text>
          </View>
          <View style={styles.texts}>
            <Text variant="headlineSm" numberOfLines={1}>
              {trimmed || email.split('@')[0]}
            </Text>
            <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
