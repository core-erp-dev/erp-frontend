/**
 * organizationApi.fetchPositionTree — boundary normalization contract.
 * The service must NEVER resolve with `undefined`: a valid response without a
 * tree (or a null payload) normalizes to `[]`, while a failed request rejects
 * so callers can distinguish failure from empty data.
 */
import { api } from '@/lib/axios';
import { organizationApi } from '../organization-api';
import type { ApiResponse } from '@/types/api';
import type { PositionTreeResponse } from '../types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('organizationApi.fetchPositionTree', () => {
  it('returns the tree when the response provides one', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        status: 200,
        message: 'OK',
        data: { tree: [{ id: 'p1', positionName: 'Direktur' }] },
      } satisfies ApiResponse<PositionTreeResponse>,
    });

    const tree = await organizationApi.fetchPositionTree();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/positions/tree');
    expect(tree).toEqual([{ id: 'p1', positionName: 'Direktur' }]);
  });

  it('normalizes a missing tree field to an empty array (valid response, no data yet)', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: {} } satisfies ApiResponse<PositionTreeResponse>,
    });

    await expect(organizationApi.fetchPositionTree()).resolves.toEqual([]);
  });

  it('normalizes a null payload to an empty array', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: null } satisfies ApiResponse<PositionTreeResponse>,
    });

    await expect(organizationApi.fetchPositionTree()).resolves.toEqual([]);
  });

  it('rejects on request failure — never resolves with undefined', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('network down'));

    await expect(organizationApi.fetchPositionTree()).rejects.toThrow('network down');
  });
});
