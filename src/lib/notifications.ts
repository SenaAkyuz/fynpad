import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/locales/i18n';
import { formatAbsoluteDate, formatCurrency, fromISODate } from '@/lib/format';
import { nextRenewalDate } from '@/lib/subscriptions';
import { useAppStore } from '@/stores/useAppStore';
import type { Subscription } from '@/types';

const ID_PREFIX = 'fynpad.sub.';
/** Android bildirim kanalı (yenilenme hatırlatmaları). */
const CHANNEL_ID = 'subscription-renewals';
/** Yenilenmeden kaç gün önce hatırlat (brief 4.4: 2-3 gün önce). */
const DAYS_BEFORE = 2;
/** Hatırlatma saati (yerel). */
const REMIND_HOUR = 9;

/** Bildirim izni iste; verildi mi döner. İlk subscription oluşturulurken çağrılır. */
export async function requestPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (__DEV__) {
      console.log('[FynPad/notifications] permission status before:', JSON.stringify(current));
    }
    if (current.granted) {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    if (__DEV__) {
      console.log('[FynPad/notifications] permission status after:', JSON.stringify(requested));
    }
    return requested.granted;
  } catch {
    return false;
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18n.t('subscriptions.notificationChannel'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Aboneliğin sonraki N yenilenme tarihini hesapla (en yakından başlayarak). */
function upcomingRenewals(sub: Subscription, count: number): string[] {
  const dates: string[] = [];
  let cursor = new Date();
  for (let i = 0; i < count; i++) {
    const d = nextRenewalDate(sub, cursor);
    if (!d) {
      break;
    }
    dates.push(d);
    // Bir sonraki yenilenmeyi bulmak için günü bir ileri al.
    cursor = new Date(fromISODate(d).getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

/**
 * Aboneliğin sonraki N yenilenmesinden DAYS_BEFORE gün önce local notification schedule eder.
 * Geçmişte kalan hatırlatmalar atlanır. Schedule edilen identifier'ları döner.
 */
export async function scheduleRenewalReminders(
  sub: Subscription,
  count: number = 3
): Promise<string[]> {
  const locale = useAppStore.getState().locale;
  const scheduled: string[] = [];
  const renewals = upcomingRenewals(sub, count);

  for (let index = 0; index < renewals.length; index++) {
    const renewalISO = renewals[index];
    const renewal = fromISODate(renewalISO);
    const remind = new Date(
      renewal.getFullYear(),
      renewal.getMonth(),
      renewal.getDate() - DAYS_BEFORE,
      REMIND_HOUR,
      0,
      0
    );
    if (remind.getTime() <= Date.now()) {
      continue; // geçmiş hatırlatma — atla
    }

    const identifier = `${ID_PREFIX}${sub.id}.${index}`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: i18n.t('subscriptions.renewalNotificationTitle', { name: sub.serviceName }),
          body: i18n.t('subscriptions.renewalNotificationBody', {
            amount: formatCurrency(sub.amount, sub.currency, locale),
            date: formatAbsoluteDate(renewalISO, locale),
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: remind,
          channelId: CHANNEL_ID,
        },
      });
      scheduled.push(identifier);
    } catch {
      // sessiz — izin yok / platform kısıtı; uygulama akışını bozma
    }
  }
  return scheduled;
}

/** Bu subscription'a ait tüm scheduled hatırlatmaları iptal eder. */
export async function cancelRenewalReminders(subscriptionId: string): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const prefix = `${ID_PREFIX}${subscriptionId}.`;
    await Promise.all(
      all
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    /* sessiz */
  }
}

/**
 * Idempotent: önce TÜM fynpad.sub.* hatırlatmalarını iptal et, sonra mevcut aboneliklerin
 * hepsini yeniden schedule et. App start'ta ve her create/edit/delete sonrası çağrılır.
 * İzin yoksa sadece temizlik yapar (schedule etmez).
 */
export async function rescheduleAll(subs: Subscription[]): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => n.identifier.startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    await ensureAndroidChannel();
    for (const sub of subs) {
      await scheduleRenewalReminders(sub);
    }
    if (__DEV__) {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[FynPad/notifications] scheduled count:', all.length);
    }
  } catch {
    /* sessiz */
  }
}
