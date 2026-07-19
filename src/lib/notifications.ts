import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/locales/i18n';
import { formatAbsoluteDate, formatCurrency, fromISODate } from '@/lib/format';
import { nextRenewalDate } from '@/lib/subscriptions';
import { useAppStore } from '@/stores/useAppStore';
import type { Subscription } from '@/types';

const ID_PREFIX = 'fynpad.sub.';
/**
 * Günlük hatırlatma ID'leri KULLANICIYA ÖZELDİR: `fynpad.daily.<userId>.<morning|evening>`.
 * Eskiden `fynpad.daily.morning` gibi global idi → bir hesabı kapatmak cihazdaki TÜM hesapların
 * hatırlatmalarını iptal ediyordu. Sürüm öncesi zamanlanmış global ID'ler `cancelLegacyDailyReminders`
 * ile bir kez temizlenir (orphan kalmasın).
 */
const DAILY_ID_PREFIX = 'fynpad.daily.';
const dailyPrefix = (userId: string) => `${DAILY_ID_PREFIX}${userId}.`;
/** Android bildirim kanalı (yenilenme hatırlatmaları). */
const CHANNEL_ID = 'subscription-renewals';
const DAILY_CHANNEL_ID = 'daily-expense-reminders';
/** Yenilenmeden kaç gün önce hatırlat (brief 4.4: 2-3 gün önce). */
const DAYS_BEFORE = 2;
/** Hatırlatma saati (yerel). */
const REMIND_HOUR = 9;
const DAILY_REMINDERS = [
  {
    id: 'morning',
    hour: 10,
    minute: 0,
    titleKey: 'notifications.dailyMorningTitle',
    bodyKey: 'notifications.dailyMorningBody',
  },
  {
    id: 'evening',
    hour: 20,
    minute: 0,
    titleKey: 'notifications.dailyEveningTitle',
    bodyKey: 'notifications.dailyEveningBody',
  },
] as const;

/** Bildirim izni ŞU AN verili mi (istek yapmaz). Zil ikonu davranışını belirler. */
export async function getNotificationPermission(): Promise<boolean> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * İzni ister; verilirse günde 2 sabit hatırlatmayı (prefix-güvenli) zamanlar. Zil ikonuna
 * ilk basışta çağrılır. Return: izin verildi (ve zamanlandı) mı.
 */
export async function requestAndScheduleReminders(userId: string): Promise<boolean> {
  return scheduleDailyExpenseReminders(userId);
}

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
    // Android 13+: kanallar izin İSTENMEDEN ÖNCE oluşturulmalı (Expo SDK 54 dokümanı). Aksi
    // halde izin akışı bazı cihazlarda kararsız oluyor ve bildirimler kanalsız kalabiliyor.
    // Yeni kanal uydurulmuyor — projedeki mevcut iki kanal (CHANNEL_ID, DAILY_CHANNEL_ID).
    await ensureAndroidChannel();
    await ensureDailyReminderChannel();
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
async function ensureDailyReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
    name: i18n.t('notifications.dailyChannel'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 150, 200],
  });
}

/** YALNIZCA verilen kullanıcının günlük hatırlatmalarını iptal eder (diğer hesaplarınkine dokunmaz). */
export async function cancelDailyExpenseReminders(userId: string): Promise<void> {
  try {
    const prefix = dailyPrefix(userId);
    const all = await Notifications.getAllScheduledNotificationsAsync();
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
 * Sürüm öncesi global ID'leri (`fynpad.daily.morning|evening` — userId segmenti YOK) temizler.
 * Yeni ID'ler `fynpad.daily.<userId>.<id>` olduğundan kalan segmentte nokta bulunur.
 */
async function cancelLegacyDailyReminders(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter(
          (n) =>
            n.identifier.startsWith(DAILY_ID_PREFIX) &&
            !n.identifier.slice(DAILY_ID_PREFIX.length).includes('.')
        )
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    /* sessiz */
  }
}

export async function scheduleDailyExpenseReminders(userId: string): Promise<boolean> {
  const granted = await requestPermissions();
  if (!granted) {
    return false;
  }

  await cancelDailyExpenseReminders(userId);
  await cancelLegacyDailyReminders();
  await ensureDailyReminderChannel();

  await Promise.all(
    DAILY_REMINDERS.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${dailyPrefix(userId)}${reminder.id}`,
        content: {
          title: i18n.t(reminder.titleKey),
          body: i18n.t(reminder.bodyKey),
          // Tıklanınca nereye gidileceğini belirler (bkz. _layout.tsx listener'ı).
          data: { type: 'daily_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: DAILY_CHANNEL_ID,
        },
      })
    )
  );
  return true;
}

export async function syncDailyExpenseReminders(enabled: boolean, userId: string): Promise<void> {
  if (enabled) {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      return;
    }
    await scheduleDailyExpenseReminders(userId);
    return;
  }
  await cancelDailyExpenseReminders(userId);
  await cancelLegacyDailyReminders();
}

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
          data: { type: 'subscription_renewal', subscriptionId: sub.id },
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
