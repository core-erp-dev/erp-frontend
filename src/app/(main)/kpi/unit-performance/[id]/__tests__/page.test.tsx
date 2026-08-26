import React from 'react';
import { render, screen } from '@testing-library/react';
import UnitPerformanceDetailPage from '@/app/(main)/kpi/unit-performance/[id]/page';
import { unitPerformanceApi } from '@/modules/kpi/unit-performance/unit-performance-api';

jest.mock('@/modules/kpi/unit-performance/unit-performance-api');
const mockedApi = jest.mocked(unitPerformanceApi);

let mockPermissions: Record<string, boolean> = {};
let mockSearchParams = new URLSearchParams('year=2025&month=6&from=unit-performance&search=HBL');
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: (permission: string) => mockPermissions[permission] ?? false }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useParams: () => ({ id: 'up-1' }),
  useSearchParams: () => mockSearchParams,
}));

const detail = {
  id: 'up-1', organizationUnitId: 'ou-1', unitCode: 'HBL', unitName: 'Hublang',
  year: 2025, month: 6, realization: 0, performance: 0, status: 'OK' as const,
  indicators: [{
    id: 'ind-1', code: '1', name: 'ROE', aspectName: 'Keuangan', unitWeight: 0,
    actualValue: 4, targetValue: 5, contribution: 0, calculationStatus: 'OK',
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = { 'unit_performance:read': true };
  mockSearchParams = new URLSearchParams('year=2025&month=6&from=unit-performance&search=HBL');
  mockedApi.getPerformanceDetail.mockResolvedValue(detail);
  sessionStorage.setItem('unit-performance-detail-origin', 'up-1');
});

it('loads the selected detail period and renders zero weight as 0%', async () => {
  render(<UnitPerformanceDetailPage />);

  expect(await screen.findByDisplayValue('Hublang')).toBeInTheDocument();
  expect(screen.getByText('0%')).toBeInTheDocument();
  expect(mockedApi.getPerformanceDetail).toHaveBeenCalledWith('up-1', 2025, 6);
});

it('uses browser back only when the explicit list marker is present', async () => {
  render(<UnitPerformanceDetailPage />);
  await screen.findByDisplayValue('Hublang');
  screen.getByRole('button', { name: 'Kembali ke Performa Unit' }).click();

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});
