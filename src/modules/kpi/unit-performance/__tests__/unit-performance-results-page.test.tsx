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
  weight: null, realization: 12.5, performance: 78.25, status: 'OK',
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

  expect(await screen.findByText('Unit Satu')).toBeInTheDocument();
  expect(mockedApi.getPerformance).toHaveBeenCalledWith(new Date().getFullYear(), new Date().getMonth() + 1);
  expect(screen.getByText('Bobot')).toBeInTheDocument();
  expect(screen.getByText('Kode')).toBeInTheDocument();
  expect(screen.getByText('Hasil')).toBeInTheDocument();
  const detailLink = screen.getByRole('link', { name: 'Unit Satu' });
  expect(detailLink).toHaveAttribute('href', expect.stringContaining('/kpi/unit-performance/up-1?'));
  expect(detailLink.getAttribute('href')).toContain(`year=${new Date().getFullYear()}`);
  expect(detailLink.getAttribute('href')).toContain(`month=${new Date().getMonth() + 1}`);
  expect(detailLink.getAttribute('href')).toContain('from=unit-performance');
  const detailButton = screen.getByRole('button', { name: 'Lihat Unit Satu' });
  expect(detailButton).toBeInTheDocument();
  expect(screen.queryByText('Nilai')).not.toBeInTheDocument();
  expect(screen.queryByText('Target Nilai Renbis')).not.toBeInTheDocument();
  expect(screen.queryByText('Simpan Matriks Bobot')).not.toBeInTheDocument();
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
