import { getPasswordStatus, markPasswordCreated } from '@/lib/authCapabilities';
import { supabase } from '@/lib/supabase';

/**
 * Şifre modu tespiti.
 *
 * Eski yaklaşım `user.identities` içinde 'email' provider aramaktı ve KESİN olarak yanlıştı:
 * OAuth hesabına sonradan şifre eklendiğinde identities listesi değişmez, Google identity
 * Google olarak kalır → Ayarlar şifre oluşturulduktan sonra bile "Şifre Oluştur" gösterirdi.
 * Artık kaynak, sunucuda tutulan ve client'ın keyfi yazamadığı `user_auth_capabilities`
 * satırını okuyan `get_my_password_status` RPC'sidir (bkz. 0014_password_capabilities.sql).
 */

const rpcMock = jest.spyOn(supabase, 'rpc');

afterEach(() => {
  jest.clearAllMocks();
});

describe('getPasswordStatus', () => {
  it('sunucu true derse şifre VAR', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null } as never);
    await expect(getPasswordStatus()).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('get_my_password_status');
  });

  it('sunucu false derse şifre YOK', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null } as never);
    await expect(getPasswordStatus()).resolves.toBe(false);
  });

  it('null/tanımsız yanıtı şifre YOK sayar (güvenli varsayılan)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null } as never);
    await expect(getPasswordStatus()).resolves.toBe(false);
  });

  it('identities/user_metadata DEĞİL, yalnızca RPC okunur', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null } as never);
    const getUserSpy = jest.spyOn(supabase.auth, 'getUser');

    await getPasswordStatus();

    // Regresyon kilidi: client tarafı identity listesine geri dönülmemeli.
    expect(getUserSpy).not.toHaveBeenCalled();
  });

  it('RPC hatasını yutmaz (sessiz yanlış durum gösterme)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
    await expect(getPasswordStatus()).rejects.toBeDefined();
  });
});

describe('markPasswordCreated', () => {
  it('şifre oluşturulduğunda sunucu durumunu günceller', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null } as never);
    await expect(markPasswordCreated()).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('mark_my_password_created');
  });

  it('RPC hatasını yutmaz', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } } as never);
    await expect(markPasswordCreated()).rejects.toBeDefined();
  });
});
