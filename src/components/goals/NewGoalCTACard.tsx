import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * "Yeni Hedef" dashed-border CTA kartı (Part 14, tasarım revizyonu). Goals sayfasında
 * Aylık Birikim kartı ile hedef listesi arasında durur — eski header "+" / FAB'ın yerini alır.
 */
export function NewGoalCTACard({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('goals.newGoalCta')}
      onPress={onPress}
      style={[styles.card, { borderColor: colors.outline }]}
    >
      <View style={[styles.iconBubble, { backgroundColor: colors.primaryContainer }]}>
        <Icon name="plus" size={20} color={colors.onPrimaryContainer} strokeWidth={2.5} />
      </View>
      <Text variant="labelMd" color="primary">
        {t('goals.newGoalCta')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconBubble: {
    borderRadius: radii.full,
    padding: spacing.sm,
  },
});
