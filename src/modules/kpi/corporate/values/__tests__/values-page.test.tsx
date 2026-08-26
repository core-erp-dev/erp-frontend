/**
 * KPI Values page tests — Positions-style list page: read permission guard,
 * title, auto-fetch on mount (monthly year + month), Year tab refetch
 * (year only, month omitted), month-selector visibility, client-side search,
 * empty/loading/error states, and the absence of any action buttons
 * (no Add/Save/Input/Deleted — the deleted scope is not in the API).
 * The data hook is mocked; page orchestration (period fetch contract, search
 * filtering, states) is what we verify here.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporateVariableValuesPage from '@/app/(main)/kpi/corporate/variable-values/page';
import { useVariableValuesData } from '../use-variable-values-data';
import type { VariableValueSheetRow } from '../values.types';

jest.mock('../use-variable-values-data');

let mockUrlParams = new URLSearchParams();
let mockUrlListeners = new Set<() => void>();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: (url: string) => {
      mockUrlParams = new URLSearchParams(url.split('?')[1] ?? '');
      mockUrlListeners.forEach((listener) => listener());
    },
  }),
  useSearchParams: () => {
    const React = jest.requireActual('react') as typeof import('react');
    const [, forceUpdate] = React.useState(0);
    React.useEffect(() => {
      const listener = () => forceUpdate((value) => value + 1);
      mockUrlListeners.add(listener);
      return () => mockUrlListeners.delete(listener);
    }, []);
    return mockUrlParams;
  },
}));

jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api', () => ({
  corporateKpiStructuresApi: {
    list: jest.fn().mockResolvedValue([{ year: new Date().getFullYear(), status: 'ACTIVE' }]),
  },
}));

let mockPermissions: Record<string, boolean> = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: (perm: string) => mockPermissions[perm] ?? false,
  }),
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    // Drive the page's search box in jsdom (the shared mock renders a plain div).
    SearchField: (props: { value?: string; onChange?: (v: string) => void }) =>
      React.createElement('input', {
        'data-testid': 'search-kpi-values',
        defaultValue: props.value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange?.(e.target.value),
      }),
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

const mockedHook = jest.mocked(useVariableValuesData);

const monthlySheet: VariableValueSheetRow[] = [
  { id: null, variableId: 'v1', variableCode: 'ROI', name: 'Return on Investment', unit: '%', aggregationMode: 'SUM', year: 2026, month: 8, value: null },
  { id: 'r2', variableId: 'v2', variableCode: 'NPM', name: 'Net Profit Margin', unit: '%', aggregationMode: 'ANNUAL_REQUIRED', year: 2026, month: 8, value: 5 },
];

const baseHook = {
  sheet: monthlySheet,
  isLoading: false,
  error: null,
  isSaving: false,
  saveError: null,
  loadedKey: '2026-8',
  fetchSheet: jest.fn().mockResolvedValue(undefined),
  saveBatch: jest.fn().mockResolvedValue(true),
  deleteAnnual: jest.fn().mockResolvedValue(true),
};

let fetchSheetMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUrlParams = new URLSearchParams();
  mockUrlListeners = new Set();
  mockPermissions = {};
  fetchSheetMock = jest.fn().mockResolvedValue(undefined);
  mockedHook.mockReturnValue({ ...baseHook, fetchSheet: fetchSheetMock });
});

describe('KPI Values page', () => {
  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporateVariableValuesPage />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
  });

  it('renders the KPI Values title and breadcrumb', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    expect(await screen.findByRole('heading', { name: 'Nilai Variabel KPI' })).toBeInTheDocument();
    expect(screen.getAllByText('Nilai Variabel KPI').length).toBeGreaterThanOrEqual(2);
  });

  it('auto-fetches the MONTHLY sheet on mount (year + month)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    await screen.findByText('Bulan');
    await waitFor(() => expect(fetchSheetMock).toHaveBeenCalledWith({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      sortBy: 'name',
      sortDirection: 'asc',
    }));
  });

  it('keeps period selectors enabled while the sheet is refetching', async () => {
    mockedHook.mockReturnValue({ ...baseHook, isLoading: true, fetchSheet: fetchSheetMock });
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);

    await waitFor(() => expect(screen.getByLabelText('Pilih tahun')).not.toBeDisabled());
    expect(screen.getByLabelText('Pilih bulan')).not.toBeDisabled();
  });

  it('displays values read-only with no page-level action buttons', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    expect(await screen.findByText('Return on Investment')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // NPM value rendered as plain text
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByText('Load')).not.toBeInTheDocument();
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
    // The forbidden names never appear on this page
    expect(screen.queryByText('Input Nilai')).not.toBeInTheDocument();
    expect(screen.queryByText('Input Variable')).not.toBeInTheDocument();
    expect(screen.queryByText('Input Variables')).not.toBeInTheDocument();
    expect(screen.queryByText('Variable Input')).not.toBeInTheDocument();
  });

  it('switching to Year refetches the ANNUAL sheet (month omitted) and hides the month selector', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    await screen.findByText('Bulan');
    expect(screen.getByLabelText('Pilih bulan')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tahun'));
    await waitFor(() => expect(fetchSheetMock).toHaveBeenLastCalledWith({
      year: new Date().getFullYear(),
      sortBy: 'name',
      sortDirection: 'asc',
    }));
    expect(screen.queryByLabelText('Pilih bulan')).not.toBeInTheDocument();
  });

  it('switching back to Month refetches with the month again', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    await screen.findByText('Bulan');

    fireEvent.click(screen.getByText('Tahun'));
    await waitFor(() => expect(fetchSheetMock).toHaveBeenLastCalledWith({
      year: new Date().getFullYear(),
      sortBy: 'name',
      sortDirection: 'asc',
    }));
    fireEvent.click(screen.getByText('Bulan'));
    await waitFor(() => expect(fetchSheetMock).toHaveBeenLastCalledWith({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      sortBy: 'name',
      sortDirection: 'asc',
    }));
  });

  it('filters rows client-side by code or name', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    await screen.findByText('Return on Investment');

    fireEvent.change(screen.getByTestId('search-kpi-values'), { target: { value: 'NPM' } });
    await waitFor(() => expect(screen.getByText('NPM')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('Return on Investment')).not.toBeInTheDocument());

    fireEvent.change(screen.getByTestId('search-kpi-values'), { target: { value: 'zzz' } });
    expect(await screen.findByText(/Tidak ada nilai yang cocok/)).toBeInTheDocument();
  });

  it('renders the annual empty state after switching to Year with no rows', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedHook.mockReturnValue({ ...baseHook, sheet: [], fetchSheet: fetchSheetMock });
    render(<KpiCorporateVariableValuesPage />);
    fireEvent.click(await screen.findByText('Tahun'));
    expect(
      await screen.findByText('Tidak ada variabel yang memerlukan nilai tahunan untuk tahun ini.'),
    ).toBeInTheDocument();
  });

  it('shows the loading spinner while the sheet is loading', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedHook.mockReturnValue({ ...baseHook, sheet: [], isLoading: true, fetchSheet: fetchSheetMock });
    render(<KpiCorporateVariableValuesPage />);
    expect(document.querySelector('[data-mock="Spinner"]')).toBeInTheDocument();
  });

  it('shows the error state and refetches on Retry', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedHook.mockReturnValue({
      ...baseHook,
      sheet: [],
      error: 'Gagal memuat nilai variabel.',
      fetchSheet: fetchSheetMock,
    });
    render(<KpiCorporateVariableValuesPage />);
    expect(await screen.findByText('Gagal memuat nilai variabel.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Coba Lagi'));
    expect(fetchSheetMock).toHaveBeenCalledTimes(2);
  });
});
