import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Tüm yasal metinlerin yürürlük tarihi (kullanıcı revize edince güncellenmeli). */
export const LEGAL_EFFECTIVE_DATE = '2026-05-25';

export type LegalScreenProps = {
  /** i18n namespace: 'privacy' | 'terms'. */
  namespace: 'privacy' | 'terms';
  /** Bölümlerin sırası — i18n `{namespace}.sections.{key}` altından çekilir. */
  sectionKeys: string[];
};

/**
 * Privacy Policy / Terms of Service ortak ekranı (Part 11 — store compliance).
 * İçerik tamamen i18n'den; metin TEMPLATE'tir, kullanıcı production öncesi revize eder.
 */
export function LegalScreen({ namespace, sectionKeys }: LegalScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd" numberOfLines={1} style={styles.headerTitle}>
          {t(`${namespace}.title`)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="labelSm" color="onSurfaceVariant">
          {t(`${namespace}.effectiveDate`, { date: LEGAL_EFFECTIVE_DATE })}
        </Text>

        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.intro}>
          {t(`${namespace}.intro`)}
        </Text>

        {sectionKeys.map((key) => (
          <View key={key} style={styles.section}>
            <Text variant="headlineSm">{t(`${namespace}.sections.${key}.title`)}</Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.body}>
              {t(`${namespace}.sections.${key}.body`)}
            </Text>
          </View>
        ))}

        <Text variant="labelSm" color="onSurfaceVariant" style={styles.contact}>
          {t(`${namespace}.contact`)}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.stackLg,
    gap: spacing.lg,
  },
  intro: {
    lineHeight: 24,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    lineHeight: 24,
  },
  contact: {
    marginTop: spacing.lg,
    lineHeight: 20,
  },
});
