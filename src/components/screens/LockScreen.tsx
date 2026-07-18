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
import {
  clearLockoutState,
  clearLocalSecurityForUser,
  readLockoutState,
  registerFailedAttempt,
} from '@/lib/lockSecurity';
import { PIN_LENGTH, verifyPin } from '@/lib/pin';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLockStore } from '@/stores/useLockStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

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
  const resetLockState = useLockStore((s) => s.resetLockState);
  const biometricEnabled = useLockStore((s) => s.biometricEnabled);
  const lockUserId = useLockStore((s) => s.userId);

  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [bioAvailable, setBioAvailable] = useState(false);

  const verifying = useRef(false);

  const locked = lockoutUntil !== null;
  // `locked` DAHİL DEĞİL: lockout sırasında biyometri erişilebilir kalır (bkz. tryBiometric).
  const showBiometric = biometricEnabled && bioAvailable;

  /**
   * POLİTİKA: brute-force lockout PIN keypad'ini kapatır ama BİYOMETRİYİ KAPATMAZ.
   * Gerekçe: lockout kör PIN denemesine karşıdır; biyometri zaten sistem tarafından
   * kendi deneme limitine sahiptir ve cihaz sahibinin meşru erişimini gereksiz yere
   * 30 sn engellemek kullanıcıyı cezalandırır.
   */
  const tryBiometric = useCallback(async () => {
    if (!biometricEnabled) {
      return;
    }
    const ok = await canUseBiometric();
    if (!ok) {
      return;
    }
    const result = await authenticate(t('lock.biometricPrompt'), t('lock.forgotPinCancel'));
    if (result.success) {
      // Biyometri de meşru bir başarılı doğrulamadır → lockout sayacını sıfırla.
      if (lockUserId) {
        await clearLockoutState(lockUserId);
      }
      setLockoutUntil(null);
      unlock();
    }
  }, [biometricEnabled, t, unlock, lockUserId]);

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
        // Başarılı giriş → kalıcı deneme sayacı sıfırlanır.
        if (lockUserId) {
          void clearLockoutState(lockUserId);
        }
        unlock();
        verifying.current = false;
        return;
      }
      setError(true);
      // Sayaç KALICI: force-stop ile lockout sıfırlanamasın (bkz. lib/lockSecurity.ts).
      if (lockUserId) {
        const next = await registerFailedAttempt(lockUserId);
        if (next.lockoutUntil !== null) {
          setLockoutUntil(next.lockoutUntil);
        }
      }
      setTimeout(() => {
        setEntered('');
        setError(false);
        verifying.current = false;
      }, RESET_DELAY_MS);
    })();
    return () => {
      cancelled = true;
    };
  }, [entered, unlock, lockUserId]);

  // Açılışta kayıtlı lockout'u geri yükle — uygulama force-stop edilse bile
  // kalan süre devam eder (eskiden yalnızca component state'indeydi, restart sıfırlıyordu).
  useEffect(() => {
    if (!lockUserId) return;
    let active = true;
    void readLockoutState(lockUserId).then((state) => {
      if (active && state.lockoutUntil !== null) {
        setLockoutUntil(state.lockoutUntil);
      }
    });
    return () => {
      active = false;
    };
  }, [lockUserId]);

  // Lockout geri sayım.
  useEffect(() => {
    if (lockoutUntil === null) {
      return;
    }
    const tick = () => {
      const ms = lockoutUntil - Date.now();
      if (ms <= 0) {
        setLockoutUntil(null);
        setRemaining(0);
        setEntered('');
        // Süre doldu → kalıcı sayacı da temizle, sonraki 5 deneme sıfırdan başlasın.
        if (lockUserId) {
          void clearLockoutState(lockUserId);
        }
      } else {
        setRemaining(Math.ceil(ms / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockoutUntil, lockUserId]);

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
            // SIRA KRİTİK: userId'yi oturum KAPANMADAN önce yakala. Eskiden önce signOut
            // çağrılıyor, sonra clearPin() aktif kullanıcıyı auth store'dan okumaya
            // çalışıyordu — oturum bittiği için null dönüp SESSİZCE hiçbir şey silmiyordu
            // ve kullanıcının PIN'i cihazda kalıyordu.
            const userId = useAuthStore.getState().session?.user?.id ?? null;

            if (userId) {
              try {
                // Önce YEREL güvenlik kayıtları: PIN (v1+v2), kilit, biyometri, lockout.
                await clearLocalSecurityForUser(userId);
              } catch {
                // Yerel temizlik başarısız → kullanıcıyı güvenli tarafta bilgilendir,
                // ama oturumu yine de kapat (aksi halde kilitli ekranda mahsur kalır).
                Alert.alert(t('lock.forgotPinFailedTitle'), t('lock.forgotPinFailedMessage'));
              }
            }

            // Yerel temizlik bittikten SONRA oturumu kapat + query cache temizliği.
            await signOut();

            // Bellek içi kilit durumunu da sıfırla (store setter'ları artık async ve
            // userId gerektiriyor; oturum kapandığı için doğrudan reset kullanılır).
            resetLockState();
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
