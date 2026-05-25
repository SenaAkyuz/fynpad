import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { PinDots } from '@/components/ui/PinDots';
import { PinKeypad } from '@/components/ui/PinKeypad';
import { Text } from '@/components/ui/Text';
import { authenticate, canUseBiometric } from '@/lib/biometric';
import { PIN_LENGTH, setPin } from '@/lib/pin';
import { useLockStore } from '@/stores/useLockStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Stage = 'welcome' | 'create' | 'confirm' | 'biometric' | 'done';

/**
 * PIN kurulum akışı — Expo Router route'u. Dashboard'dan router.push('/pin-setup').
 * Tek ekran içinde stage state machine: welcome → create → confirm → (biometric) → done.
 */
export default function PinSetupScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const setLockEnabled = useLockStore((s) => s.setLockEnabled);
  const setBiometricEnabled = useLockStore((s) => s.setBiometricEnabled);

  const [stage, setStage] = useState<Stage>('welcome');
  const [pin, setPinValue] = useState('');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;
  const busy = useRef(false);

  const skipBiometric = useCallback(() => {
    setStage('done');
  }, []);

  // create → 6 hane girince PIN'i sakla, confirm'e geç.
  useEffect(() => {
    if (stage === 'create' && entered.length === PIN_LENGTH) {
      setPinValue(entered);
      setEntered('');
      setStage('confirm');
    }
  }, [stage, entered]);

  // confirm → 6 hane girince eşleştir.
  useEffect(() => {
    if (stage !== 'confirm' || entered.length !== PIN_LENGTH || busy.current) {
      return;
    }
    if (entered !== pin) {
      setError(true);
      const id = setTimeout(() => {
        setError(false);
        setPinValue('');
        setEntered('');
        setStage('create');
      }, 900);
      return () => clearTimeout(id);
    }
    busy.current = true;
    void (async () => {
      await setPin(pin);
      const canBio = await canUseBiometric();
      busy.current = false;
      setStage(canBio ? 'biometric' : 'done');
    })();
  }, [stage, entered, pin]);

  // Android donanım geri tuşu.
  useEffect(() => {
    const onBack = () => {
      const s = stageRef.current;
      if (s === 'welcome' || s === 'create' || s === 'confirm') {
        router.back();
        return true;
      }
      if (s === 'biometric') {
        skipBiometric();
        return true;
      }
      // done: geri yapma, sadece "Devam" ile çıkış.
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [router, skipBiometric]);

  const handleDigit = (d: string) => {
    setError(false);
    setEntered((prev) => (prev.length >= PIN_LENGTH ? prev : prev + d));
  };
  const handleDelete = () => {
    setError(false);
    setEntered((prev) => prev.slice(0, -1));
  };

  const handleEnableBiometric = () => {
    void (async () => {
      const result = await authenticate(t('lock.biometricPrompt'), t('pinSetup.welcomeCancel'));
      if (result.success) {
        setBiometricEnabled(true);
        setStage('done');
      } else {
        setError(true);
      }
    })();
  };

  const handleDone = () => {
    setLockEnabled(true);
    router.replace('/(tabs)/dashboard');
  };

  const cancelable = stage === 'welcome' || stage === 'create' || stage === 'confirm';

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      {cancelable ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.close}
        >
          <Text variant="headlineSm" color="onSurfaceVariant">
            {'✕'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.close} />
      )}

      {stage === 'welcome' ? (
        <CenteredStage
          title={t('pinSetup.welcomeTitle')}
          subtitle={t('pinSetup.welcomeSubtitle')}
          icon={<LockGlyph color={colors.primary} />}
        >
          <Button label={t('pinSetup.welcomeContinue')} onPress={() => setStage('create')} />
          <Button
            label={t('pinSetup.welcomeCancel')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </CenteredStage>
      ) : null}

      {stage === 'create' || stage === 'confirm' ? (
        <View style={styles.pinStage}>
          <View style={styles.header}>
            <Logo variant="headlineSm" />
            <Text variant="headlineMd" style={styles.title}>
              {stage === 'create' ? t('pinSetup.createTitle') : t('pinSetup.confirmTitle')}
            </Text>
            <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
              {stage === 'create' ? t('pinSetup.createSubtitle') : t('pinSetup.confirmSubtitle')}
            </Text>
          </View>

          <View style={styles.dotsWrap}>
            <PinDots length={PIN_LENGTH} current={entered.length} error={error} />
            <View style={styles.errorSlot}>
              {error ? (
                <Text variant="labelSm" color="error">
                  {t('pinSetup.pinMismatch')}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.keypadWrap}>
            <PinKeypad onDigit={handleDigit} onDelete={handleDelete} />
          </View>
        </View>
      ) : null}

      {stage === 'biometric' ? (
        <CenteredStage
          title={t('pinSetup.biometricTitle')}
          subtitle={t('pinSetup.biometricSubtitle')}
          icon={<BiometricGlyph color={colors.primary} />}
        >
          {error ? (
            <Text variant="labelSm" color="error" style={styles.centerText}>
              {t('pinSetup.biometricFailed')}
            </Text>
          ) : null}
          <Button label={t('pinSetup.biometricEnable')} onPress={handleEnableBiometric} />
          <Button label={t('pinSetup.biometricSkip')} variant="secondary" onPress={skipBiometric} />
        </CenteredStage>
      ) : null}

      {stage === 'done' ? (
        <CenteredStage
          title={t('pinSetup.doneTitle')}
          subtitle={t('pinSetup.doneSubtitle')}
          icon={<CheckGlyph color={colors.secondary} />}
        >
          <Button label={t('pinSetup.doneContinue')} onPress={handleDone} />
        </CenteredStage>
      ) : null}
    </View>
  );
}

function CenteredStage({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.centered}>
      <View style={styles.centeredContent}>
        {icon}
        <Text variant="headlineMd" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyMd" color="onSurfaceVariant" style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

/** Daire içinde büyük glyph — dekoratif stage ikonları (ikon kütüphanesi yok). */
function IconCircle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: `${color}1f`, borderColor: color }]}>
      {children}
    </View>
  );
}

function LockGlyph({ color }: { color: string }) {
  return (
    <IconCircle color={color}>
      <Text style={[styles.glyph, { color }]}>{'🔒'}</Text>
    </IconCircle>
  );
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <IconCircle color={color}>
      <Text style={[styles.glyph, { color }]}>{'✓'}</Text>
    </IconCircle>
  );
}

/** Üç iç içe kemerden parmak izi benzeri ikon. */
function BiometricGlyph({ color }: { color: string }) {
  const size = 44;
  return (
    <IconCircle color={color}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
        {[0, 1, 2].map((i) => {
          const s = size - i * 12;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                bottom: 6,
                width: s,
                height: s,
                borderColor: color,
                borderWidth: 2,
                borderBottomWidth: 0,
                borderTopLeftRadius: s / 2,
                borderTopRightRadius: s / 2,
              }}
            />
          );
        })}
      </View>
    </IconCircle>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.containerMargin,
  },
  close: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
  },
  pinStage: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  dotsWrap: {
    marginTop: spacing['2xl'],
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
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 44,
    lineHeight: 52,
  },
});
