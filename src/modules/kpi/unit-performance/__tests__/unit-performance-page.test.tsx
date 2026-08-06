/**
 * Unit Performance page orchestration tests.
 * Covers permissions (read/manage), monthly/yearly fetch shape, row rendering
 * (NO_KPI_DATA renders "–" never 0), the total-weight line states
 * (100% complete / <100% incomplete), and Add Unit modal opening.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnitPerformancePage from '@/app/(main)/kpi/unit-performance/page';
import { unitPerformanceApi } from '../unit-performance-api';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { UnitPerformanceRow } from '../unit-performance.types';

/* ── Mock dependencies ── */

jest.mock('../unit-performance-api');
const mockedApi = jest.mocked(unitPerformanceApi);

jest.mock('@/modules/organization/organization-units/services/organization-unit-api');
const mockedOrgUnitApi = jest.mocked(organizationUnitApi);

let mockPermissions: Record<string, boolean> = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: (perm: string) => mockPermissions[perm] ?? false,
  }),
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  return {
    ...actual,
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

/* ── Sample data ── */

const okRow: UnitPerformanceRow = {
  id: 'up-1',
  organizationUnitId: 'ou-1',
  unitCode: 'U1',
  unitName: 'Umum & Administrasi',
  weight: 30,
  realization: 15,
  performance: 50,
  status: 'OK',
};

const noDataRow: UnitPerformanceRow = {
  id: 'up-2',
  organizationUnitId: 'ou-2',
  unitCode: 'U2',
  unitName: 'Hubungan Langganan',
  weight: 70,
  realization: null,
  performance: null,
  status: 'NO_KPI_DATA',
};

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.getPerformance.mockResolvedValue([]);
  mockedOrgUnitApi.getUnitTree.mockResolvedValue({ tree: [] });
});

describe('access control', () => {
  it('shows Access Denied without the read permission', async () => {
    render(<UnitPerformancePage />);
    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
    expect(mockedApi.getPerformance).not.toHaveBeenCalled();
  });

  it('read-only user sees no Add Unit button', async () => {
    mockPermissions = { 'unit_performance:read': true };
    render(<UnitPerformancePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Add Unit')).not.toBeInTheDocument();
  });

  it('manage user sees the Add Unit button and it opens the modal', async () => {
    mockPermissions = { 'unit_performance:read': true, 'unit_performance:manage': true };
    render(<UnitPerformancePage />);
    fireEvent.click(await screen.findByText('Add Unit'));
    expect(await screen.findByText('Weight (%)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select organization unit')).toBeInTheDocument();
  });
});

describe('period selection', () => {
  it('defaults to MONTHLY mode (year + current month)', () => {
    mockPermissions = { 'unit_performance:read': true };
    render(<UnitPerformancePage />);
    expect(mockedApi.getPerformance).toHaveBeenCalledWith(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    );
  });

  it('switching to Year refetches with year only (month omitted)', async () => {
    mockPermissions = { 'unit_performance:read': true };
    mockedApi.getPerformance.mockResolvedValue([okRow]);
    render(<UnitPerformancePage />);
    await screen.findByText('Month');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getPerformance).toHaveBeenLastCalledWith(
      new Date().getFullYear(),
      undefined,
    ));
  });

  it('switching back to Month refetches with the month again', async () => {
    mockPermissions = { 'unit_performance:read': true };
    mockedApi.getPerformance.mockResolvedValue([okRow]);
    render(<UnitPerformancePage />);
    await screen.findByText('Month');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getPerformance).toHaveBeenLastCalledWith(
      new Date().getFullYear(), undefined,
    ));
    fireEvent.click(screen.getByText('Month', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getPerformance).toHaveBeenLastCalledWith(
      new Date().getFullYear(), new Date().getMonth() + 1,
    ));
  });
});

describe('table rendering', () => {
  it('renders weight/realization/performance and "–" for NO_KPI_DATA (never 0)', async () => {
    mockPermissions = { 'unit_performance:read': true };
    mockedApi.getPerformance.mockResolvedValue([okRow, noDataRow]);
    render(<UnitPerformancePage />);

    expect(await screen.findByText('Umum & Administrasi')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    // NO_KPI_DATA row: realization and performance are "–" — never "0"
    expect(screen.getAllByText('–').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows the total line as complete at exactly 100%', async () => {
    mockPermissions = { 'unit_performance:read': true };
    mockedApi.getPerformance.mockResolvedValue([okRow, noDataRow]); // 30 + 70 = 100
    render(<UnitPerformancePage />);

    // Wait for the rows to render — the total line computes from them.
    expect(await screen.findByText('Umum & Administrasi')).toBeInTheDocument();
    expect(screen.getByText('Total Weight:')).toBeInTheDocument();
    expect(screen.getByText('complete')).toBeInTheDocument();
  });

  it('shows the total line as incomplete below 100%', async () => {
    mockPermissions = { 'unit_performance:read': true };
    mockedApi.getPerformance.mockResolvedValue([
      { ...okRow, weight: 65 },
      { ...noDataRow, weight: 30 },
    ]); // 65 + 30 = 95
    render(<UnitPerformancePage />);

    expect(await screen.findByText('Umum & Administrasi')).toBeInTheDocument();
    expect(await screen.findByText('incomplete — remaining 5%')).toBeInTheDocument();
    expect(screen.queryByText('complete')).not.toBeInTheDocument();
  });
});
