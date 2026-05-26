import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ServiceIconPicker } from '@/components/subscriptions/ServiceIconPicker';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type SubscriptionFieldsProps = {
  /** Abonelik toggle durumu. */
  enabled: boolean;
  onToggle: (next: boolean) => void;
  iconKey: string;
  onIconKeyChange: (key: string) => void;
  serviceName: string;
  onServiceNameChange: (value: string) => void;
  planName: string;
  onPlanNameChange: (value: string) => void;
  /** Helper metni i18n key'i (quick-add ile recurring-edit farklı açıklama kullanır). */
  helperKey: string;
};

/**
 * Brief 4.4: "tekrarlayan harcamayı abonelik olarak işaretle". Recurring config altında nested
 * toggle + (açıkken) ikon/servis/plan alanları. Quick Add ve Recurring Rule Edit modal paylaşır.
 * is_subscription=true DB constraint'i: serviceName dolu + kind 'expense' + frequency monthly/yearly
 * → çağıran taraf (kind/frequency) garantiler, burada serviceName toplanır.
 */
export function SubscriptionFields({
  enabled,
  onToggle,
  iconKey,
  onIconKeyChange,
  serviceName,
  onServiceNameChange,
  planName,
  onPlanNameChange,
  helperKey,
}: SubscriptionFieldsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.toggleRow, { backgroundColor: colors.surfaceContainerLow }]}>
        <View style={styles.toggleLeft}>
          <Icon name="credit-card" size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
          <Text variant="labelMd" color="onSurfaceVariant">
            {t('quickAdd.subscription.toggle')}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
          thumbColor={enabled ? colors.onPrimary : colors.surfaceContainerLowest}
          ios_backgroundColor={colors.surfaceContainerHighest}
        />
      </View>

      <Text variant="labelSm" color="onSurfaceVariant" style={styles.helper}>
        {t(helperKey)}
      </Text>

      {enabled ? (
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.fieldLabel}>
              {t('subscriptions.form.icon')}
            </Text>
            <ServiceIconPicker value={iconKey} onChange={onIconKeyChange} />
          </View>

          <TextInput
            label={t('quickAdd.subscription.serviceName')}
            placeholder="Netflix"
            value={serviceName}
            onChangeText={onServiceNameChange}
            maxLength={60}
          />
          <TextInput
            label={t('quickAdd.subscription.planName')}
            placeholder="Premium"
            value={planName}
            onChangeText={onPlanNameChange}
            maxLength={60}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 56,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  helper: {
    marginTop: -spacing.xs,
    lineHeight: 16,
  },
  fields: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.md,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
