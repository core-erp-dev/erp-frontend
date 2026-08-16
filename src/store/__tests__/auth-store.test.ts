import axios from 'axios';
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

const loggedInUser = {
  username: 'Admin',
  email: 'admin@test.local',
  roles: ['ADMIN'],
  permissions: ['user:read'],
};

describe('auth-store: initAuth', () => {
  beforeEach(() => {
    mockPost.mockReset();
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null, isInitializing: true });
  });

  it('skips refresh when the store already has a session (post-login MainLayout mount)', async () => {
    useAuthStore.setState({
      accessToken: 'A0',
      user: loggedInUser,
      isInitializing: true,
    });
    localStorage.setItem('refreshToken', 'T1');

    await useAuthStore.getState().initAuth();

    expect(mockPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isInitializing).toBe(false);
    expect(useAuthStore.getState().accessToken).toBe('A0');
  });

  it('bootstraps via refresh on hard reload (empty store, stored token)', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockResolvedValue(successResponse('A1', 'T2'));

    await useAuthStore.getState().initAuth();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('A1');
    expect(useAuthStore.getState().isInitializing).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBe('T2');
  });

  it('clears the session when refresh is rejected with 401', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockRejectedValue(unauthorizedError());

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isInitializing).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('finishes bootstrap without clearing the token on network errors', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockPost.mockRejectedValue(new Error('Network Error'));

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isInitializing).toBe(false);
    expect(localStorage.getItem('refreshToken')).toBe('T1');
  });

  it('finishes bootstrap immediately when no token is stored', async () => {
    await useAuthStore.getState().initAuth();

    expect(mockPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isInitializing).toBe(false);
  });
});
