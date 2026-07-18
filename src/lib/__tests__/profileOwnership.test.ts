import { assertOwner, updateProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

/**
 * docs/claude-fix-plan/04 — persist edilen mutation'ın sahiplik doğrulaması.
 *
 * Senaryo: A hesabında çevrimdışı bir profil değişikliği kuyruğa girer, uygulama
 * beklenmedik şekilde kapanır (çıkışta cache temizliği çalışamaz), sonra B giriş yapar.
 * Restore edilen mutation B'nin oturumunda çalışırsa A'nın değişikliğini B'ye yazar.
 */

const getUserMock = jest.spyOn(supabase.auth, 'getUser');

function sessionOf(userId: string | null) {
  return Promise.resolve({
    data: { user: userId ? ({ id: userId } as never) : null },
    error: null,
  } as never);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('assertOwner', () => {
  it('aktif oturum sahiple aynıysa geçer', async () => {
    getUserMock.mockReturnValue(sessionOf('user-a'));
    await expect(assertOwner('user-a')).resolves.toBeUndefined();
  });

  it('BAŞKA kullanıcı oturumdaysa reddeder', async () => {
    getUserMock.mockReturnValue(sessionOf('user-b'));
    await expect(assertOwner('user-a')).rejects.toThrow('MUTATION_OWNER_MISMATCH');
  });

  it('oturum yoksa reddeder', async () => {
    getUserMock.mockReturnValue(sessionOf(null));
    await expect(assertOwner('user-a')).rejects.toThrow('MUTATION_OWNER_MISMATCH');
  });
});

describe('updateProfile', () => {
  it('sahiplik uyuşmazlığında DB’ye hiçbir şey göndermez', async () => {
    getUserMock.mockReturnValue(sessionOf('user-b'));
    const fromSpy = jest.spyOn(supabase, 'from');

    await expect(
      updateProfile({ ownerUserId: 'user-a', patch: { fullName: 'A' } })
    ).rejects.toThrow('MUTATION_OWNER_MISMATCH');

    // Kritik: kontrollü iptal — update sorgusu hiç kurulmamalı.
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('boş patch ile gereksiz DB çağrısı yapmaz', async () => {
    getUserMock.mockReturnValue(sessionOf('user-a'));
    const fromSpy = jest.spyOn(supabase, 'from');

    await expect(updateProfile({ ownerUserId: 'user-a', patch: {} })).resolves.toBeUndefined();
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
