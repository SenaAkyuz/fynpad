import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Finansal Hedefler (Part 14). Şimdilik placeholder — tab tasarım canonical'inde 4. slotta
 * (Analiz ile Ayarlar arasında). Tam implementasyon Part 14'te gelecek.
 */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Screen center edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name="target" size={40} color={colors.onSurfaceVariant} strokeWidth={2} />
        </View>
        <Text variant="headlineMd" style={styles.title}>
          {t('goals.title')}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
          {t('goals.comingSoon')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.stackMd,
    gap: spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});
