import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/Logo';
import { PinDots } from '@/components/ui/PinDots';
import { PinKeypad } from '@/components/ui/PinKeypad';
import { Text } from '@/components/ui/Text';
import { signOut } from '@/lib/auth';
import { authenticate, canUseBiometric } from '@/lib/biometric';
import { PIN_LENGTH, clearPin, verifyPin } from '@/lib/pin';
import { useLockStore } from '@/stores/useLockStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const RESET_DELAY_MS = 900;

/**
 * Kilit ekranı — route DEĞİL, root layout içinden tam ekran overlay olarak render edilir.
 * PIN veya (etkinse) biyometrik ile açılır. 5 yanlış denemede 30 sn kilitleme.
 */
export function LockScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const unlock = useLockStore((s) => s.unlock);
  const setLockEnabled = useLockStore((s) => s.setLockEnabled);
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled);
  const biometricEnabled = useLockStore((s) => s.biometricEnabled);

  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [bioAvailable, setBioAvailable] = useState(false);

  const verifying = useRef(false);

  const locked = lockoutUntil !== null;
  const showBiometric = biometricEnabled && bioAvailable && !locked;

  const tryBiometric = useCallback(async () => {
    if (!biometricEnabled || locked) {
      return;
    }
    const ok = await canUseBiometric();
    if (!ok) {
      return;
    }
    const result = await authenticate(t('lock.biometricPrompt'), t('lock.forgotPinCancel'));
    if (result.success) {
      unlock();
    }
  }, [biometricEnabled, locked, t, unlock]);

  // Mount: biyometrik destek kontrolü + etkinse otomatik prompt.
  useEffect(() => {
    let active = true;
    void canUseBiometric().then((ok) => {
      if (active) {
        setBioAvailable(ok);
      }
    });
    void tryBiometric();
    return () => {
      active = false;
    };
    // tryBiometric yalnızca mount'ta çalışmalı; bağımlılık dışı bırakıldı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 6 hane dolunca doğrula.
  useEffect(() => {
    if (entered.length !== PIN_LENGTH || verifying.current) {
      return;
    }
    verifying.current = true;
    let cancelled = false;
    void (async () => {
      const ok = await verifyPin(entered);
      if (cancelled) {
        return;
      }
      if (ok) {
        unlock();
        verifying.current = false;
        return;
      }
      setError(true);
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_MS);
        }
        return next;
      });
      setTimeout(() => {
        setEntered('');
        setError(false);
        verifying.current = false;
      }, RESET_DELAY_MS);
    })();
    return () => {
      cancelled = true;
    };
  }, [entered, unlock]);

  // Lockout geri sayım.
  useEffect(() => {
    if (lockoutUntil === null) {
      return;
    }
    const tick = () => {
      const ms = lockoutUntil - Date.now();
      if (ms <= 0) {
        setLockoutUntil(null);
        setAttempts(0);
        setRemaining(0);
        setEntered('');
      } else {
        setRemaining(Math.ceil(ms / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const handleDigit = (d: string) => {
    if (locked || verifying.current) {
      return;
    }
    setError(false);
    setEntered((prev) => (prev.length >= PIN_LENGTH ? prev : prev + d));
  };

  const handleDelete = () => {
    if (locked || verifying.current) {
      return;
    }
    setError(false);
    setEntered((prev) => prev.slice(0, -1));
  };

  const handleForgotPin = () => {
    Alert.alert(t('lock.forgotPinConfirmTitle'), t('lock.forgotPinConfirmMessage'), [
      { text: t('lock.forgotPinCancel'), style: 'cancel' },
      {
        text: t('lock.forgotPinConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut();
            await clearPin();
            setLockEnabled(false);
            setBiometricEnabled(false);
            unlock();
            // session null → root layout auth guard Welcome'a yönlendirir.
          })();
        },
      },
    ]);
  };

  const subtitle = locked
    ? t('lock.tooManyAttempts', { seconds: remaining })
    : biometricEnabled
      ? t('lock.subtitleBiometric')
      : t('lock.subtitle');

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
      {/* hafif primary glow (DESIGN.md Accent Glows, abartısız) */}
      <View style={[styles.glow, { backgroundColor: colors.primary }]} pointerEvents="none" />

      <View style={styles.header}>
        <Logo />
        <Text
          variant="bodyMd"
          color={locked ? 'error' : 'onSurfaceVariant'}
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.dotsWrap}>
        <PinDots length={PIN_LENGTH} current={entered.length} error={error} />
        <View style={styles.errorSlot}>
          {error && !locked ? (
            <Text variant="labelSm" color="error">
              {t('lock.wrongPin')}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.keypadWrap}>
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onBiometric={showBiometric ? () => void tryBiometric() : undefined}
          disabled={locked}
        />

        <Pressable accessibilityRole="button" hitSlop={12} onPress={handleForgotPin}>
          <Text variant="labelMd" color="primary" style={styles.forgot}>
            {t('lock.forgotPin')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: spacing.containerMargin,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.12,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
  },
  dotsWrap: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.lg,
  },
  errorSlot: {
    height: 16,
    justifyContent: 'center',
  },
  keypadWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xl,
  },
  forgot: {
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
