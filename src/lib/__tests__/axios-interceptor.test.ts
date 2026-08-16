import axios from 'axios';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth-store';

// --- axios module mock -----------------------------------------------------
// jest.mock factories are hoisted, so every mock function is created INSIDE
// the factory (closures) and re-exposed through the mocked module. The
// callable instance + interceptor registrars are built there too, so `api`
// (created at import time) receives them before any test runs.
//
// NOTE: `api` MUST be referenced by the test body — otherwise the import is
// elided and axios.ts never evaluates, so the interceptors are never
// registered (SWC/Jest unused-import elision).
jest.mock('axios', () => {
  const create = jest.fn();
  const post = jest.fn();
  const instanceCall = jest.fn();
  const requestUse = jest.fn();
  const responseUse = jest.fn();

  const instance = Object.assign(instanceCall, {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
    defaults: { headers: { common: {} } },
  });
  create.mockReturnValue(instance);

  return {
    __esModule: true,
    default: {
      create,
      post,
      __instance: instanceCall,
      __requestUse: requestUse,
      __responseUse: responseUse,
    },
  };
});

interface MockedAxios {
  post: jest.Mock;
  __instance: jest.Mock;
  __requestUse: jest.Mock;
  __responseUse: jest.Mock;
}

const mockedAxios = axios as unknown as MockedAxios;
const apiMock = api as unknown as jest.Mock;

const getInterceptors = () => ({
  request: mockedAxios.__requestUse.mock.calls[0][0] as (
    config: { headers: Record<string, string> },
  ) => { headers: Record<string, string> },
  response: mockedAxios.__responseUse.mock.calls[0][1] as (
    error: unknown,
  ) => Promise<unknown>,
});

// ---------------------------------------------------------------------------

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

describe('axios interceptor: 401 refresh + retry', () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    apiMock.mockReset();
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null, isInitializing: true });
  });

  it('attaches the freshest access token on every request', () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });

    const config = { headers: {} };
    getInterceptors().request(config);

    expect(config.headers.Authorization).toBe('Bearer A1');
  });

  it('refreshes once and retries the original request on 401', async () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    localStorage.setItem('refreshToken', 'T1');
    mockedAxios.post.mockResolvedValue(successResponse('A2', 'T2'));
    apiMock.mockResolvedValue('retried-ok');

    const originalConfig = {
      url: '/api/v1/users',
      _retry: false,
      headers: {},
    };
    const result = await getInterceptors().response({
      config: originalConfig,
      response: { status: 401 },
    });

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(originalConfig);
    expect(result).toBe('retried-ok');

    // the retried request carries the NEW access token from the refresh
    useAuthStore.setState({
      accessToken: 'A2',
      user: loggedInUser,
      isInitializing: false,
    });
    const retryConfig = { headers: {} };
    getInterceptors().request(retryConfig);
    expect(retryConfig.headers.Authorization).toBe('Bearer A2');
  });

  it('never refreshes a login 401 (no interceptor loop on login)', async () => {
    const error = {
      config: { url: '/api/v1/auth/login', headers: {} },
      response: { status: 401 },
    };

    await expect(getInterceptors().response(error)).rejects.toBe(error);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('shares a single refresh across concurrent 401s in one tab', async () => {
    localStorage.setItem('refreshToken', 'T1');
    mockedAxios.post.mockResolvedValue(successResponse('A2', 'T2'));
    apiMock.mockResolvedValue('ok');

    const first = {
      config: { url: '/a', _retry: false, headers: {} },
      response: { status: 401 },
    };
    const second = {
      config: { url: '/b', _retry: false, headers: {} },
      response: { status: 401 },
    };

    await Promise.all([
      getInterceptors().response(first),
      getInterceptors().response(second),
    ]);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it('clears the session (compare-and-remove) when refresh is finally rejected', async () => {
    useAuthStore.setState({
      accessToken: 'A1',
      user: loggedInUser,
      isInitializing: false,
    });
    localStorage.setItem('refreshToken', 'T1');
    mockedAxios.post.mockRejectedValue(unauthorizedError());

    await expect(
      getInterceptors().response({
        config: { url: '/a', _retry: false, headers: {} },
        response: { status: 401 },
      }),
    ).rejects.toBeDefined();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('does not refresh an already-retried request (no infinite loop)', async () => {
    const error = {
      config: { url: '/a', _retry: true, headers: {} },
      response: { status: 401 },
    };

    await expect(getInterceptors().response(error)).rejects.toBe(error);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not refresh on non-401 errors', async () => {
    const error = {
      config: { url: '/a', headers: {} },
      response: { status: 500 },
    };

    await expect(getInterceptors().response(error)).rejects.toBe(error);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
