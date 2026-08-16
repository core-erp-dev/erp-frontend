import axios from 'axios';
import { registerAuthStorageSync } from '@/lib/auth-storage-sync';
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

const loggedInUser = {
  username: 'Admin',
  email: 'admin@test.local',
  roles: ['ADMIN'],
  permissions: ['user:read'],
};

const fireStorage = (key: string, newValue: string | null) => {
  window.dispatchEvent(
    new StorageEvent('storage', { key, newValue, oldValue: null }),
  );
};

describe('auth-storage-sync: cross-tab session sync', () => {
  beforeEach(() => {
    mockPost.mockReset();
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null, isInitializing: true });
  });

  it('clears auth state when another tab removes the refresh token (logout sync)', () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    const unsubscribe = registerAuthStorageSync();

    fireStorage('refreshToken', null);

    expect(useAuthStore.getState().accessToken).toBeNull();
    unsubscribe();
  });

  it('ignores storage events for other keys', () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    const unsubscribe = registerAuthStorageSync();

    fireStorage('some-other-key', 'x');
    fireStorage('refreshToken', 'T2');

    // token replaced while a valid session exists → ignored, no refresh
    expect(mockPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe('A1');
    unsubscribe();
  });

  it('does not trigger a refresh when a valid session exists and the token rotates', () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    const unsubscribe = registerAuthStorageSync();

    fireStorage('refreshToken', 'T2');

    expect(mockPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe('A1');
    unsubscribe();
  });

  it('bootstraps via refresh when this tab has no session and the token was rotated', async () => {
    localStorage.setItem('refreshToken', 'T2');
    mockPost.mockResolvedValue(successResponse('A1', 'T3'));
    const unsubscribe = registerAuthStorageSync();

    fireStorage('refreshToken', 'T2');

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('A1');
    unsubscribe();
  });

  it('unsubscribes cleanly (no effect after removal)', () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    const unsubscribe = registerAuthStorageSync();
    unsubscribe();

    fireStorage('refreshToken', null);

    expect(useAuthStore.getState().accessToken).toBe('A1');
  });
});
