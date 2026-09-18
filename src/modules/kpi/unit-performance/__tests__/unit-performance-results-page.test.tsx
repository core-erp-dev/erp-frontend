import React from 'react';
import { render, screen } from '@testing-library/react';
import UnitPerformancePage from '@/app/(main)/kpi/unit-performance/page';
import { unitPerformanceApi } from '../unit-performance-api';
import type { UnitPerformanceRow } from '../unit-performance.types';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';

jest.mock('../unit-performance-api');
const mockedApi = jest.mocked(unitPerformanceApi);

jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api', () => ({
  corporateKpiStructuresApi: { list: jest.fn() },
  extractStructureError: jest.fn(() => 'Gagal memuat struktur.'),
}));
const mockedStructuresApi = jest.mocked(corporateKpiStructuresApi);

let mockPermissions: Record<string, boolean> = {};
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: (permission: string) => mockPermissions[permission] ?? false }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  return { ...actual, toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() } };
});

const row: UnitPerformanceRow = {
  id: 'up-1', organizationUnitId: 'ou-1', unitCode: 'U1', unitName: 'Unit Satu',
  weight: null, realization: 12.5, performance: 78.25, status: 'OK', indicators: [{
    id: 'ind-1', code: 'IND-01', name: 'Kualitas Layanan', aspectName: 'Layanan',
    unitWeight: 25, actualValue: 0, targetValue: 5, contribution: 0, performance: 0,
    calculationStatus: 'OK', status: 'OK',
  }, {
    id: 'ind-02', code: 'IND-02', name: 'Efisiensi', aspectName: 'Operasional',
    unitWeight: null, actualValue: null, targetValue: 5, contribution: null, performance: null,
    calculationStatus: 'NOT_CONFIGURED', status: 'NOT_CONFIGURED',
  }, {
    id: 'ind-03', code: 'IND-03', name: 'Ketersediaan Data', aspectName: 'Layanan',
    unitWeight: 25, actualValue: null, targetValue: 5, contribution: null, performance: null,
    calculationStatus: 'MISSING_VALUE', status: 'NO_KPI_DATA',
  }, {
    id: 'ind-04', code: 'IND-04', name: 'Kelengkapan Matriks', aspectName: 'Operasional',
    unitWeight: 25, actualValue: null, targetValue: null, contribution: null, performance: null,
    calculationStatus: 'OK', status: 'MATRIX_INCOMPLETE',
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.getPerformance.mockResolvedValue([row]);
  mockedStructuresApi.list.mockResolvedValue([]);
});

it('guards the result page before fetching', async () => {
  render(<UnitPerformancePage />);
  expect(await screen.findByText('Akses Ditolak')).toBeInTheDocument();
  expect(mockedApi.getPerformance).not.toHaveBeenCalled();
});

it('fetches and renders the result contract without exposing matrix editing', async () => {
  mockPermissions = { 'unit_performance:read': true };
  render(<UnitPerformancePage />);

  const unitLinks = await screen.findAllByRole('link', { name: 'Unit Satu' });
  expect(unitLinks).toHaveLength(1);
  expect(mockedApi.getPerformance).toHaveBeenCalledWith(new Date().getFullYear(), new Date().getMonth() + 1);
  const matrix = screen.getByLabelText('Matrix Performa Unit');
  expect(matrix).toBeInTheDocument();
  expect(screen.getByText('Indikator')).toBeInTheDocument();
  expect(screen.getByText('Layanan')).toBeInTheDocument();
  expect(screen.getByText('Operasional')).toBeInTheDocument();
  expect(screen.getByText('IND-01')).toBeInTheDocument();
  expect(screen.getAllByText('0%')).toHaveLength(2);
  expect(screen.getByText('N/A')).toBeInTheDocument();
  expect(screen.getByText('Belum diatur')).toBeInTheDocument();
  expect(screen.getByText('Belum lengkap')).toBeInTheDocument();
  const columnTexts = Array.from(matrix.querySelectorAll('[data-mock="Table.Column"]')).map((column) => column.textContent ?? '').join(' ');
  expect(columnTexts).not.toContain('Bobot Unit');
  expect(columnTexts).not.toContain('Nilai Aktual');
  expect(columnTexts).not.toContain('Target');
  expect(columnTexts).not.toContain('Kontribusi Unit');
  expect(columnTexts).not.toContain('Status');
  const detailLink = unitLinks[0];
  expect(detailLink).toHaveAttribute('href', expect.stringContaining('/kpi/unit-performance/up-1?'));
  expect(detailLink.getAttribute('href')).toContain(`year=${new Date().getFullYear()}`);
  expect(detailLink.getAttribute('href')).toContain(`month=${new Date().getMonth() + 1}`);
  expect(detailLink.getAttribute('href')).toContain('from=unit-performance');
  expect(screen.getAllByText('Nilai Aktual').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Target').length).toBeGreaterThan(0);
  expect(screen.queryByText('Simpan Matriks Bobot')).not.toBeInTheDocument();
});

it('renders every row returned by the non-paginated endpoint', async () => {
  mockPermissions = { 'unit_performance:read': true };
  mockedApi.getPerformance.mockResolvedValue(
    Array.from({ length: 11 }, (_, index) => ({
      ...row,
      id: `up-${index}`,
      unitCode: `U${index}`,
      unitName: `Unit ${index}`,
    })),
  );

  render(<UnitPerformancePage />);

  const unitLinks = await screen.findAllByRole('link', { name: 'Unit 10' });
  expect(unitLinks).toHaveLength(1);
  expect(screen.queryByText('Berikutnya')).not.toBeInTheDocument();
});

it('explains an empty participant result separately from missing indicator data', async () => {
  mockPermissions = { 'unit_performance:read': true };
  mockedApi.getPerformance.mockResolvedValue([]);

  render(<UnitPerformancePage />);

  expect(await screen.findByText('Belum ada unit peserta untuk periode yang dipilih.')).toBeInTheDocument();
});

it('explains a participant result with no indicator breakdown', async () => {
  mockPermissions = { 'unit_performance:read': true };
  mockedApi.getPerformance.mockResolvedValue([{ ...row, indicators: [] }]);

  render(<UnitPerformancePage />);

  expect(await screen.findByText('Belum ada indikator yang dapat ditampilkan untuk periode yang dipilih.')).toBeInTheDocument();
});

it('keeps the period unresolved while structure metadata is loading', () => {
  mockedStructuresApi.list.mockReturnValue(new Promise(() => undefined));
  mockPermissions = { 'unit_performance:read': true, 'corporate_kpi:read': true };
  render(<UnitPerformancePage />);

  expect(screen.getByRole('button', { name: 'Pilih tahun' })).toHaveTextContent('-');
  expect(mockedApi.getPerformance).not.toHaveBeenCalled();
});

it('keeps period selectors enabled while results are refetching', () => {
  mockedApi.getPerformance.mockReturnValue(new Promise(() => undefined));
  mockPermissions = { 'unit_performance:read': true };
  render(<UnitPerformancePage />);

  expect(screen.getByRole('button', { name: 'Pilih tahun' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Pilih bulan' })).not.toBeDisabled();
});
