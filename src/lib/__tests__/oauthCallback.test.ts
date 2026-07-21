import { completeOAuthCallback, hasOAuthCallbackParams } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * OAuth callback yarış + iptal davranışı.
 *
 * Aynı `code`'u iki handler (openAuthSessionAsync sonucu + `auth/callback` ekranı) paralel
 * exchange etmeye çalışabilir. İkinci çağrı "code already used" alır ve kullanıcıya YANLIŞ
 * "Something went wrong" gösterilirdi. Kurallar:
 *   1. Eşzamanlı iki çağrı TEK exchange paylaşır (idempotent).
 *   2. Exchange hata verse bile session VARSA başarı sayılır.
 *   3. Tamamlanan code bellekte birikmez (settle sonrası map'ten düşer).
 */

const getSessionMock = jest.spyOn(supabase.auth, 'getSession');
const exchangeMock = jest.spyOn(supabase.auth, 'exchangeCodeForSession');

const noSession = () => Promise.resolve({ data: { session: null }, error: null } as never);
const withSession = () =>
  Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null } as never);

/** exchangeCodeForSession'ı elle çözülebilir hale getirir (yarış kurgusu için). */
function deferredExchange() {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => {
    resolve = r;
  });
  exchangeMock.mockImplementation(
    () => gate.then(() => ({ data: { session: {} }, error: null })) as never
  );
  return resolve;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('hasOAuthCallbackParams', () => {
  it('code / error parametrelerini tanır', () => {
    expect(hasOAuthCallbackParams('fynpad://auth/callback?code=abc')).toBe(true);
    expect(hasOAuthCallbackParams('fynpad://auth/callback#error=denied')).toBe(true);
    expect(hasOAuthCallbackParams('fynpad://auth/callback')).toBe(false);
  });
});

describe('completeOAuthCallback', () => {
  it('aynı code için eşzamanlı iki çağrı TEK exchange paylaşır', async () => {
    getSessionMock.mockImplementation(noSession);
    const release = deferredExchange();

    const url = 'fynpad://auth/callback?code=shared-code';
    const first = completeOAuthCallback(url);
    const second = completeOAuthCallback(url);
    release();

    await expect(first).resolves.toEqual({ success: true });
    await expect(second).resolves.toEqual({ success: true });
    // Kritik: ikinci çağrı yeniden exchange DENEMEMELİ.
    expect(exchangeMock).toHaveBeenCalledTimes(1);
  });

  it('tamamlanan code bellekte birikmez — sonraki çağrı yeniden exchange eder', async () => {
    getSessionMock.mockImplementation(noSession);
    exchangeMock.mockResolvedValue({ data: { session: {} }, error: null } as never);

    const url = 'fynpad://auth/callback?code=settled-code';
    await completeOAuthCallback(url);
    await completeOAuthCallback(url);

    // Map settle sonrası temizlendiği için ikinci çağrı yeni bir exchange yapar.
    expect(exchangeMock).toHaveBeenCalledTimes(2);
  });

  it('exchange hata verse de session varsa BAŞARI döner (yanlış hata gösterme)', async () => {
    exchangeMock.mockResolvedValue({
      data: { session: null },
      error: { message: 'pkce_code_verifier_not_found' },
    } as never);
    // 1. çağrı (ön kontrol): session yok → exchange denenir.
    // 2. çağrı (hata sonrası): paralel handler oturumu açmış → session var.
    getSessionMock.mockImplementationOnce(noSession).mockImplementation(withSession);

    await expect(
      completeOAuthCallback('fynpad://auth/callback?code=raced-code')
    ).resolves.toEqual({ success: true });
  });

  it('provider hatasında session yoksa hata döner', async () => {
    getSessionMock.mockImplementation(noSession);

    const result = await completeOAuthCallback(
      'fynpad://auth/callback?error_description=access_denied'
    );

    expect(result.success).toBe(false);
    // Provider hatasında exchange hiç denenmemeli.
    expect(exchangeMock).not.toHaveBeenCalled();
  });

  it('session zaten açıksa tekrar exchange etmez', async () => {
    getSessionMock.mockImplementation(withSession);

    await expect(
      completeOAuthCallback('fynpad://auth/callback?code=already-done')
    ).resolves.toEqual({ success: true });
    expect(exchangeMock).not.toHaveBeenCalled();
  });
});
