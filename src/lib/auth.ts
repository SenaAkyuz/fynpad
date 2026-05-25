import { supabase } from '@/lib/supabase';
import type { Locale } from '@/stores/useAppStore';

export type DefaultCurrency = 'TRY' | 'USD' | 'EUR';

export type AuthResult = { success: true } | { success: false; errorKey: string };

type SupabaseLikeError = { code?: string; message?: string; status?: number } | null | undefined;

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

  // E-posta zaten kayıtlı
  if (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('already exists')
  ) {
    return 'errors.auth.emailAlreadyInUse';
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
}): Promise<AuthResult> {
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
    // Confirm-email kapalıyken, var olan bir e-posta için Supabase boş identities
    // ile sahte bir user döndürür (enumeration koruması) → "already in use" say.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, errorKey: 'errors.auth.emailAlreadyInUse' };
    }
    return { success: true };
  } catch (error) {
    return fail('signUp', error);
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

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function sendPasswordResetEmail(params: {
  email: string;
  redirectUrl: string;
}): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
      redirectTo: params.redirectUrl,
    });
    if (error) {
      return fail('resetPasswordForEmail', error);
    }
    return { success: true };
  } catch (error) {
    return fail('resetPasswordForEmail', error);
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
