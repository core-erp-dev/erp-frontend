/**
 * use-variable-values-data hook tests — success and failure flows.
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
  { id: 'v1', code: 'ROI', name: 'Return on Investment', unit: '%', description: null, deletedAt: null, createdAt: '', updatedAt: '' },
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
  it('fetches a sheet merged with variable metadata', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([
      { id: null, variableId: 'v1', variableCode: 'ROI', year: 2026, month: 8, value: null },
    ]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet(2026, 8); });

    expect(mockedValuesApi.getSheet).toHaveBeenCalledWith(2026, 8);
    expect(result.current.sheet).toHaveLength(1);
    expect(result.current.sheet[0]).toMatchObject({
      variableCode: 'ROI',
      name: 'Return on Investment',
      unit: '%',
      value: null,
    });
    expect(result.current.loadedKey).toBe('2026-8');
  });

  it('successful save refetches the sheet and reports success', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.saveBatch.mockResolvedValue([]);

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet(2026, 8); });

    let ok = false;
    await act(async () => {
      ok = await result.current.saveBatch([{ variableId: 'v1', year: 2026, month: 8, value: 10 }]);
    });

    expect(ok).toBe(true);
    expect(mockedValuesApi.saveBatch).toHaveBeenCalledWith({
      items: [{ variableId: 'v1', year: 2026, month: 8, value: 10 }],
    });
    // refetch happened
    expect(mockedValuesApi.getSheet).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalled();
  });

  it('failed save sets saveError, keeps the sheet, and reports failure', async () => {
    mockedValuesApi.getSheet.mockResolvedValue([]);
    mockedValuesApi.saveBatch.mockRejectedValue(new Error('duplicate natural key'));

    const { result } = renderHook(() => useVariableValuesData());
    await act(async () => { await result.current.fetchSheet(2026, 8); });

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
    await act(async () => { await result.current.fetchSheet(2026, 8); });

    expect(result.current.error).toBeTruthy();
    expect(result.current.sheet).toEqual([]);
    expect(result.current.loadedKey).toBeNull();
  });
});
