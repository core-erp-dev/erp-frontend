import axios from 'axios';
import { refreshSession, RefreshFailedError } from '@/lib/token-service';
import { useAuthStore } from '@/store/auth-store';

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockPost = axios.post as jest.Mock;

const successResponse = (accessToken: string, refreshToken: string) => ({
  data: {
    data: {
      accessToken,
      refreshToken,
      username: 'Admin',
      email: 'admin@test.local',
      roles: ['ADMIN'],
      permissions: ['user:read'],
    },
  },
});

const unauthorizedError = () =>
  Object.assign(new Error('Request failed with status code 401'), {
    response: { status: 401 },
  });

describe('token-service: refreshSession', () => {
  beforeEach(() => {
    mockPost.mockReset();
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null, isInitializing: true });
  });

  it('shares one HTTP refresh between concurrent callers in the same tab', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockResolvedValue(successResponse('A1', 'T2'));

    const [first, second] = await Promise.all([
      refreshSession(),
      refreshSession(),
    ]);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(first).toBe('A1');
    expect(second).toBe('A1');
  });

  it('stores the rotated refresh token and restores the auth store', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockResolvedValue(successResponse('A1', 'T2'));

    await refreshSession();

    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/refresh'),
      { refreshToken: 'T1' },
      expect.anything(),
    );
    expect(useAuthStore.getState().accessToken).toBe('A1');
    expect(useAuthStore.getState().user?.username).toBe('Admin');
    expect(localStorage.getItem('refreshToken')).toBe('T2');
  });

  it('rejects with RefreshFailedError and removes only the failed token on 401', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockRejectedValue(unauthorizedError());

    const error = await refreshSession().catch((e) => e);

    expect(error).toBeInstanceOf(RefreshFailedError);
    expect((error as RefreshFailedError).failedToken).toBe('T1');
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('retries once with the freshest token when another tab rotated it', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost
      .mockImplementationOnce(() => {
        localStorage.setItem('refreshToken', 'T2');
        return Promise.reject(unauthorizedError());
      })
      .mockResolvedValue(successResponse('A2', 'T3'));

    const token = await refreshSession();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost.mock.calls[0][1]).toEqual({ refreshToken: 'T1' });
    expect(mockPost.mock.calls[1][1]).toEqual({ refreshToken: 'T2' });
    expect(token).toBe('A2');
    expect(useAuthStore.getState().accessToken).toBe('A2');
    expect(localStorage.getItem('refreshToken')).toBe('T3');
  });

  it('never loops and never deletes a token written after the retry failed', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost
      .mockImplementationOnce(() => {
        localStorage.setItem('refreshToken', 'T2');
        return Promise.reject(unauthorizedError());
      })
      .mockImplementationOnce(() => {
        localStorage.setItem('refreshToken', 'T3');
        return Promise.reject(unauthorizedError());
      });

    const error = await refreshSession().catch((e) => e);

    expect(error).toBeInstanceOf(RefreshFailedError);
    expect((error as RefreshFailedError).failedToken).toBe('T2');
    expect(mockPost).toHaveBeenCalledTimes(2);
    // T3 was written after the retried token failed → it must survive
    expect(localStorage.getItem('refreshToken')).toBe('T3');
  });

  it('keeps the stored token on network errors (session may still be valid)', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockRejectedValue(new Error('Network Error'));

    const error = await refreshSession().catch((e) => e);

    expect(error).not.toBeInstanceOf(RefreshFailedError);
    expect(localStorage.getItem('refreshToken')).toBe('T1');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('throws RefreshFailedError(null) when no token is available', async () => {
    const error = await refreshSession().catch((e) => e);

    expect(error).toBeInstanceOf(RefreshFailedError);
    expect((error as RefreshFailedError).failedToken).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('serializes cross-tab refresh via the Web Locks API when available', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockResolvedValue(successResponse('A1', 'T2'));

    const lockRequest = jest.fn(
      (_name: string, _opts: unknown, cb: () => Promise<string>) => cb(),
    );
    Object.defineProperty(navigator, 'locks', {
      value: { request: lockRequest },
      configurable: true,
    });

    await refreshSession();

    expect(lockRequest).toHaveBeenCalledWith(
      'erp-auth-refresh',
      { mode: 'exclusive' },
      expect.any(Function),
    );
    delete (navigator as { locks?: unknown }).locks;
  });
});
