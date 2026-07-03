import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Locale } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';

export type DefaultCurrency = 'TRY' | 'USD' | 'EUR';

/**
 * Auth işlem sonucu. `cancelled` yalnızca kullanıcı OAuth tarayıcısını kendisi kapattığında
 * (dismiss/cancel) true olur → çağıran taraf bunu gerçek bir hata gibi GÖSTERMEMELİ, sessizce
 * geçmeli. Session'a/navigasyona dokunulmaz (kullanıcı neredeyse orada kalır).
 */
export type AuthResult =
  | { success: true }
  | { success: false; errorKey: string; cancelled?: boolean };

/**
 * Kayıt sonucu. Email confirmation AÇIK ise signUp session döndürmez (requiresVerification:true)
 * → kullanıcı 6 haneli kodla e-postasını doğrulamalı. KAPALI ise auto-login (requiresVerification:false).
 */
export type SignUpResult =
  | { success: true; requiresVerification: boolean }
  | { success: false; errorKey: string };

type SupabaseLikeError = { code?: string; message?: string; status?: number } | null | undefined;

function getOAuthCallbackParam(url: string, name: string): string | null {
  try {
    const parsed = new URL(url);
    const queryValue = parsed.searchParams.get(name);
    if (queryValue) return queryValue;
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    return hashParams.get(name);
  } catch {
    return null;
  }
}

/** Dev modda gerçek Supabase hatasını telefon console'una basar. */
function logAuthError(context: string, error: unknown): void {
  if (__DEV__) {
    const e = error as SupabaseLikeError;
    console.log(
      `[FynPad/auth] ${context} error:`,
      JSON.stringify({ message: e?.message, status: e?.status, code: e?.code }, null, 2)
    );
  }
}

/** Supabase hata kodu/mesajını i18n key'ine çevirir. Spesifik kodlar önce kontrol edilir. */
function mapAuthError(error: unknown): string {
  const e = error as SupabaseLikeError;
  const code = (e?.code ?? '').toString().toLowerCase();
  const status = e?.status;
  const msg = (e?.message ?? '').toLowerCase();

  // Rate limit (Supabase free tier ~4 mail/saat) — login'de 429 maskelenmesin diye en başta.
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many')
  ) {
    return 'errors.auth.rateLimitEmail';
  }

  // Redirect URL izinli değil
  if (code === 'redirect_to_not_allowed' || (msg.includes('redirect') && msg.includes('not allowed'))) {
    return 'errors.auth.redirectNotAllowed';
  }

  // OTP kodu geçersiz / süresi dolmuş (şifre sıfırlama kodu)
  if (
    code === 'otp_expired' ||
    code === 'otp_disabled' ||
    msg.includes('token has expired') ||
    (msg.includes('token') && msg.includes('invalid')) ||
    msg.includes('otp')
  ) {
    return 'errors.auth.otpExpiredOrInvalid';
  }

  // E-posta zaten kayıtlı
  if (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('already exists')
  ) {
    return 'errors.auth.emailAlreadyInUse';
  }

  // E-posta doğrulanmamış (confirm-email açıkken doğrulanmamış hesapla login denemesi)
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'errors.auth.emailNotConfirmed';
  }

  // Hatalı kimlik bilgisi
  if (code === 'invalid_credentials' || msg.includes('invalid login')) {
    return 'errors.auth.invalidCredentials';
  }

  // Zayıf şifre
  if (code === 'weak_password' || msg.includes('weak password') || msg.includes('password should')) {
    return 'errors.auth.weakPassword';
  }

  // Geçersiz e-posta formatı (validation normalde önce yakalar)
  if (code === 'email_address_invalid' || msg.includes('invalid email')) {
    return 'errors.auth.invalidEmail';
  }

  // Ağ hatası / status yok
  if (msg.includes('network') || msg.includes('fetch') || status === 0 || !status) {
    return 'errors.auth.network';
  }

  return 'errors.auth.unknown';
}

/** Hatayı logla + i18n key döndür (helper'larda tek satır kullanım için). */
function fail(context: string, error: unknown): { success: false; errorKey: string } {
  logAuthError(context, error);
  return { success: false, errorKey: mapAuthError(error) };
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  locale: Locale;
  defaultCurrency: DefaultCurrency;
}): Promise<SignUpResult> {
  const { email, password, locale, defaultCurrency } = params;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { locale, default_currency: defaultCurrency } },
    });
    if (error) {
      return fail('signUp', error);
    }
    // Var olan bir e-posta için Supabase boş identities ile sahte bir user döndürür
    // (enumeration koruması) → "already in use" say.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, errorKey: 'errors.auth.emailAlreadyInUse' };
    }
    // Email confirmation AÇIKken session null döner → kullanıcı OTP ile doğrulamalı.
    // KAPALIyken auto-login (session dolu) → doğrudan dashboard.
    return { success: true, requiresVerification: !data.session };
  } catch (error) {
    return fail('signUp', error);
  }
}

/**
 * Kayıt (signup) OTP kodunu doğrular → e-postayı onaylar ve full session açar.
 * Şifre sıfırlamadaki verifyOtp ile paralel; type 'signup'.
 */
export async function verifySignupOtp(params: { email: string; token: string }): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'signup',
    });
    if (error) {
      return fail('verifySignupOtp', error);
    }
    return { success: true };
  } catch (error) {
    return fail('verifySignupOtp', error);
  }
}

/** Kayıt doğrulama (signup) OTP kodunu yeniden e-posta ile gönderir. */
export async function resendSignupOtp(params: { email: string }): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: params.email });
    if (error) {
      return fail('resendSignupOtp', error);
    }
    return { success: true };
  } catch (error) {
    return fail('resendSignupOtp', error);
  }
}

export async function signInWithEmail(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });
    if (error) {
      return fail('signIn', error);
    }
    return { success: true };
  } catch (error) {
    return fail('signIn', error);
  }
}

export async function getGoogleOAuthUrl(): Promise<
  { success: true; url: string } | { success: false; errorKey: string }
> {
  try {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      return fail('getGoogleOAuthUrl', error);
    }
    if (!data.url) {
      return { success: false, errorKey: 'errors.auth.unknown' };
    }
    return { success: true, url: data.url };
  } catch (error) {
    return fail('getGoogleOAuthUrl', error);
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectTo = Linking.createURL('auth/callback');

    if (Platform.OS === 'web') {
      const res = await getGoogleOAuthUrl();
      if (!res.success) return res;
      window.location.assign(res.url);
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      return fail('signInWithGoogle', error);
    }
    if (!data.url) {
      return { success: false, errorKey: 'errors.auth.unknown' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // dismiss/cancel/locked → kullanıcı akışı kendisi kesti. Gerçek hata değil: session'a
    // ve navigasyona DOKUNMA, çağıran taraf sessizce geçsin (cancelled:true).
    if (result.type !== 'success') {
      return { success: false, errorKey: 'errors.auth.oauthCancelled', cancelled: true };
    }

    const providerError = getOAuthCallbackParam(result.url, 'error_description');
    if (providerError) {
      return fail('signInWithGoogle.provider', { message: providerError });
    }

    const code = getOAuthCallbackParam(result.url, 'code');
    if (!code) {
      return { success: false, errorKey: 'errors.auth.unknown' };
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      // Yarış: callback ekranı aynı code'u önce exchange ettiyse burada verifier tükenmiş olur
      // ama session VARDIR → hata sayma, başarı dön.
      const { data: after } = await supabase.auth.getSession();
      if (after.session) return { success: true };
      return fail('signInWithGoogle.exchangeCodeForSession', exchangeError);
    }
    return { success: true };
  } catch (error) {
    return fail('signInWithGoogle', error);
  }
}

export function hasOAuthCallbackParams(url: string): boolean {
  return !!(
    getOAuthCallbackParam(url, 'code') ||
    getOAuthCallbackParam(url, 'error') ||
    getOAuthCallbackParam(url, 'error_description')
  );
}

export async function completeOAuthCallback(url: string): Promise<AuthResult> {
  try {
    const providerError =
      getOAuthCallbackParam(url, 'error_description') ?? getOAuthCallbackParam(url, 'error');
    if (providerError) {
      return fail('completeOAuthCallback.provider', { message: providerError });
    }

    const code = getOAuthCallbackParam(url, 'code');
    if (!code) {
      return { success: false, errorKey: 'errors.auth.unknown' };
    }

    // Idempotent: openAuthSessionAsync veya paralel bir handler code'u zaten exchange edip session
    // açtıysa TEKRAR exchange etme — "code already used" hatası + yanlış "something went wrong"
    // toast'ı yerine başarı say (session zaten var).
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session) {
      return { success: true };
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Yarış: signInWithGoogle aynı code'u önce exchange ettiyse verifier tükenmiş olur ama
      // session VARDIR → hata gösterme, başarı say.
      const { data: after } = await supabase.auth.getSession();
      if (after.session) {
        return { success: true };
      }
      return fail('completeOAuthCallback.exchangeCodeForSession', error);
    }
    return { success: true };
  } catch (error) {
    return fail('completeOAuthCallback', error);
  }
}

/**
 * Kullanıcı kaynaklı (kasıtlı) çıkışları, refresh token'ın istemsiz sonlanmasından
 * ayırt etmek için bayrak. Kasıtlı çıkışta "oturum süresi doldu" bildirimi GÖSTERİLMEZ.
 */
let intentionalSignOut = false;

/** Kasıtlı bir signOut'tan hemen önce çağrılır (supabase.auth.signOut'u doğrudan çağıran yerler için). */
export function markIntentionalSignOut(): void {
  intentionalSignOut = true;
}

/** Bayrağı okuyup sıfırlar — SIGNED_OUT listener'ında bildirim gösterilip gösterilmeyeceğini belirler. */
export function consumeIntentionalSignOut(): boolean {
  const wasIntentional = intentionalSignOut;
  intentionalSignOut = false;
  return wasIntentional;
}

export async function signOut(): Promise<void> {
  intentionalSignOut = true;
  await supabase.auth.signOut();
  useAuthStore.getState().setSession(null);
}

/**
 * Şifre sıfırlama OTP kodunu e-posta ile gönderir. Deep link (redirectTo) KULLANMAZ —
 * e-posta template'i `{{ .Token }}` ile 6 haneli kod basar; kullanıcı kodu app'e girer.
 */
export async function sendPasswordResetEmail(params: { email: string }): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(params.email);
    if (error) {
      return fail('resetPasswordForEmail', error);
    }
    return { success: true };
  } catch (error) {
    return fail('resetPasswordForEmail', error);
  }
}

/**
 * OTP kodunu doğrular (recovery session açar) ve yeni şifreyi yazar. Tek adımda iki
 * Supabase çağrısı: verifyOtp → updateUser. Deep link / PKCE gerekmez.
 */
export async function verifyPasswordResetOtp(params: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<AuthResult> {
  try {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'recovery',
    });
    if (verifyError) {
      return fail('verifyPasswordResetOtp', verifyError);
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: params.newPassword,
    });
    if (updateError) {
      return fail('verifyPasswordResetOtp', updateError);
    }
    return { success: true };
  } catch (error) {
    return fail('verifyPasswordResetOtp', error);
  }
}

/** Reset deep link ile session açıldıktan sonra yeni şifreyi yazar. */
export async function updatePassword(params: { newPassword: string }): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password: params.newPassword });
    if (error) {
      return fail('updatePassword', error);
    }
    return { success: true };
  } catch (error) {
    return fail('updatePassword', error);
  }
}
