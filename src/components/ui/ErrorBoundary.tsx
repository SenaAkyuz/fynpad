import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

type ErrorBoundaryProps = {
  children: ReactNode;
  /**
   * Verilirse hata anında bunun render'ı gösterilir (ör. AdBanner gibi tekil widget'lar
   * için sessizce `null`). Verilmezse tam ekranlı "tekrar dene" fallback'i gösterilir.
   */
  fallback?: ReactNode;
  /** Hatayı loglamak/raporlamak için opsiyonel kanca. */
  onError?: (error: Error) => void;
};

type ErrorBoundaryState = { error: Error | null };

/**
 * Alt ağaçtaki render hatalarını yakalar → tüm uygulamanın beyaz ekrana çökmesini önler.
 * Kök seviyede tam ekran fallback, tekil widget'larda (`fallback={null}`) izole kullanılır.
 * Class component olmak zorunda (React yalnızca class API'sinde hata sınırı sağlar).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) {
      console.error('[FynPad/ErrorBoundary] caught:', error);
    }
    this.props.onError?.(error);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

/** Tam ekran kurtarma ekranı — tema + i18n farkındalıklı. */
function DefaultErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
        <Icon name="alert-triangle" size={28} color={colors.primary} strokeWidth={2} />
      </View>
      <Text variant="headlineSm" style={styles.text}>
        {t('common.errorTitle')}
      </Text>
      <Text variant="bodyMd" color="onSurfaceVariant" style={styles.text}>
        {t('common.errorMessage')}
      </Text>
      <Button label={t('common.errorRetry')} onPress={onRetry} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.stackMd,
    gap: spacing.md,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.stackMd,
  },
});
