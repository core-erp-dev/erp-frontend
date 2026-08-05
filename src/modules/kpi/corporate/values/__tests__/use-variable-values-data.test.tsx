/**
 * use-variable-values-data hook tests — monthly/annual scopes, success/failure
 * flows, and scope-distinct cache keys.
 */
import { renderHook, act } from '@testing-library/react';
import { useVariableValuesData } from '../use-variable-values-data';
import { valuesApi, extractValuesError } from '../values-api';
import { variablesApi } from '../../variables/variables-api';
import { toast } from '@heroui/react';

jest.mock('../values-api');
jest.mock('../../variables/variables-api');
jest.mock('@heroui/react', () => ({
  toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

const mockedValuesApi = jest.mocked(valuesApi);
const mockedVariablesApi = jest.mocked(variablesApi);

const variableMeta = [
  { id: 'v1', code: 'ROI', name: 'Return on Investment', unit: '%', aggregationMode: 'SUM', description: null, deletedAt: null, createdAt: '', updatedAt: '' },
  { id: 'v2', code: 'NPM', name: 'Net Profit Margin', unit: '%', aggregationMode: 'ANNUAL_REQUIRED', description: null, deletedAt: null, createdAt: '', updatedAt: '' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockedVariablesApi.list.mockResolvedValue(variableMeta);
  // jest.mock('../values-api') stubs every export — restore the error-mapper helper
  jest.mocked(extractValuesError).mockImplementation(
    (e: unknown) => (e instanceof Error ? e.message : 'Failed to load variable values.'),
  );
});

describe('use-variable-values-data', () => {
  it('fetches a monthly sheet merged with variable metadata (month key)', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([
      { id: null, variableId: 'v1', variableCode: 'ROI', year: 2026, month: 8, value: null },
    ]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026, month: 8 }); });

    expect(mockedValuesApi.getSheet).toHaveBeenCalledWith({ year: 2026, month: 8 });
    expect(result.current.sheet).toHaveLength(1);
    expect(result.current.sheet[0]).toMatchObject({
      variableCode: 'ROI',
      name: 'Return on Investment',
      unit: '%',
      aggregationMode: 'SUM',
      value: null,
    });
    expect(result.current.loadedKey).toBe('2026-8');
  });

  it('fetches the annual sheet WITHOUT a month and uses the annual cache key', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([
      { id: 'a1', variableId: 'v2', variableCode: 'NPM', year: 2026, month: null, value: 7 },
    ]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026 }); });

    expect(mockedValuesApi.getSheet).toHaveBeenCalledWith({ year: 2026 });
    expect(result.current.sheet[0].month).toBeNull();
    expect(result.current.sheet[0].aggregationMode).toBe('ANNUAL_REQUIRED');
    expect(result.current.loadedKey).toBe('2026-annual');
  });

  it('monthly and annual scopes never share a cache key', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026, month: 8 }); });
    expect(result.current.loadedKey).toBe('2026-8');
    await act(async () => { await result.current.fetchSheet({ year: 2026 }); });
    expect(result.current.loadedKey).toBe('2026-annual');
    // The annual key is NOT `${year}-${month}` — a monthly key can never alias it.
    expect(result.current.loadedKey).not.toBe('2026-8');
  });

  it('successful monthly save refetches the SAME monthly scope and reports success', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.saveBatch.mockResolvedValue([]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026, month: 8 }); });

    let ok = false;
    await act(async () => {
      ok = await result.current.saveBatch([{ variableId: 'v1', year: 2026, month: 8, value: 10 }]);
    });

    expect(ok).toBe(true);
    expect(mockedValuesApi.saveBatch).toHaveBeenCalledWith({
      items: [{ variableId: 'v1', year: 2026, month: 8, value: 10 }],
    });
    // refetch happened with the monthly period — never the annual sheet
    expect(mockedValuesApi.getSheet).toHaveBeenCalledTimes(2);
    expect(mockedValuesApi.getSheet).toHaveBeenLastCalledWith({ year: 2026, month: 8 });
    expect(toast.success).toHaveBeenCalled();
  });

  it('annual save item carries month = null and refetches the annual scope', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.saveBatch.mockResolvedValue([]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026 }); });

    let ok = false;
    await act(async () => {
      ok = await result.current.saveBatch([{ variableId: 'v2', year: 2026, month: null, value: 7 }]);
    });

    expect(ok).toBe(true);
    expect(mockedValuesApi.saveBatch).toHaveBeenCalledWith({
      items: [{ variableId: 'v2', year: 2026, month: null, value: 7 }],
    });
    expect(mockedValuesApi.getSheet).toHaveBeenLastCalledWith({ year: 2026 });
  });

  it('deleteAnnual calls the annual delete endpoint and refetches', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.deleteAnnual.mockResolvedValue(undefined);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026 }); });

    let ok = false;
    await act(async () => { ok = await result.current.deleteAnnual('v2', 2026); });

    expect(ok).toBe(true);
    expect(mockedValuesApi.deleteAnnual).toHaveBeenCalledWith('v2', 2026);
    expect(mockedValuesApi.getSheet).toHaveBeenLastCalledWith({ year: 2026 });
    expect(toast.success).toHaveBeenCalled();
  });

  it('failed save sets saveError, keeps the sheet, and reports failure', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.saveBatch.mockRejectedValue(new Error('duplicate natural key'));

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026, month: 8 }); });

    let ok = true;
    await act(async () => {
      ok = await result.current.saveBatch([{ variableId: 'v1', year: 2026, month: 8, value: 10 }]);
    });

    expect(ok).toBe(false);
    expect(result.current.saveError).toBeTruthy();
    expect(toast.danger).toHaveBeenCalled();
  });

  it('sheet fetch failure surfaces an error and clears the sheet', async () => {
    mockedValuesApi.getSheet.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet({ year: 2026, month: 8 }); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.sheet).toEqual([]);
    expect(result.current.loadedKey).toBeNull();
  });
});
