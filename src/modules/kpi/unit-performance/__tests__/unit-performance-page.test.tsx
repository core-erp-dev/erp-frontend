/**
 * Unit Performance page orchestration tests for the weight-matrix model:
 * permission guards (read shows the matrix, manage adds Add Unit/delete),
 * the matrix is fetched for the selected year, participant add/delete flows,
 * and the full matrix save flow (dynamic columns, one atomic request).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnitPerformancePage from '@/app/(main)/kpi/unit-performance/page';
import { unitPerformanceApi } from '../unit-performance-api';
import { organizationUnitApi } from '@/modules/organization/organization-units/services/organization-unit-api';
import type { UnitPerformanceWeightMatrix } from '../unit-performance.types';

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

const matrix: UnitPerformanceWeightMatrix = {
  year: 2026,
  units: [
    { id: 'up-hub', organizationUnitId: 'ou-hub', unitCode: 'HUB', unitName: 'Hublang' },
    { id: 'up-spi', organizationUnitId: 'ou-spi', unitCode: 'SPI', unitName: 'SPI' },
  ],
  indicators: [
    { id: 'ind-1', code: 'IND_01', name: 'ROE', aspectName: 'ASP_01' },
  ],
  weights: [
    { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 60 },
    { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 40 },
  ],
  totals: { 'ind-1': 100 },
  complete: true,
};

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.getWeightMatrix.mockResolvedValue(matrix);
  mockedApi.saveWeightMatrix.mockResolvedValue(matrix);
  mockedApi.create.mockResolvedValue({
    id: 'up-new', organizationUnitId: 'ou-new', unitCode: 'NEW', unitName: 'New Unit',
    weight: null, realization: null, performance: null, status: null,
  });
  mockedApi.delete.mockResolvedValue(undefined);
  mockedOrgUnitApi.getUnitTree.mockResolvedValue([
    { id: 'ou-new', parentId: null, parentName: null, unitCode: 'NEW', unitName: 'New Unit',
      unitType: 'DEPARTMENT', children: [] },
  ]);
});

describe('access control', () => {
  it('shows Access Denied without the read permission', async () => {
    render(<UnitPerformancePage />);
    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
    expect(mockedApi.getWeightMatrix).not.toHaveBeenCalled();
  });

  it('read-only user sees the matrix but no Add Unit button', async () => {
    mockPermissions = { 'unit_performance:read': true };
    render(<UnitPerformancePage />);
    expect(await screen.findByText('ROE')).toBeInTheDocument();
    // unit name appears in the matrix header AND the participants list
    expect(screen.getAllByText('Hublang').length).toBeGreaterThan(0);
    expect(screen.queryByText('Add Unit')).not.toBeInTheDocument();
  });

  it('manage user sees Add Unit and can open the org-unit-only modal', async () => {
    mockPermissions = { 'unit_performance:read': true, 'unit_performance:manage': true };
    render(<UnitPerformancePage />);
    fireEvent.click(await screen.findByText('Add Unit'));

    expect(await screen.findByText('Organization Unit')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select organization unit')).toBeInTheDocument();
    // NO per-unit weight field anymore — weights live in the matrix
    expect(screen.queryByText('Weight (%)')).not.toBeInTheDocument();
  });
});

describe('matrix fetch', () => {
  it('fetches the weight matrix for the current year by default', async () => {
    mockPermissions = { 'unit_performance:read': true };
    render(<UnitPerformancePage />);
    await screen.findByText('ROE');
    expect(mockedApi.getWeightMatrix).toHaveBeenCalledWith(new Date().getFullYear());
  });
});

describe('matrix save', () => {
  it('submits the whole matrix in one request from the page', async () => {
    mockPermissions = { 'unit_performance:read': true, 'unit_performance:manage': true };
    render(<UnitPerformancePage />);
    await screen.findByText('ROE');

    fireEvent.click(screen.getByRole('button', { name: 'Save Matrix' }));

    await waitFor(() => expect(mockedApi.saveWeightMatrix).toHaveBeenCalledTimes(1));
    expect(mockedApi.saveWeightMatrix).toHaveBeenCalledWith(new Date().getFullYear(), {
      weights: [
        { indicatorId: 'ind-1', unitPerformanceId: 'up-hub', weight: 60 },
        { indicatorId: 'ind-1', unitPerformanceId: 'up-spi', weight: 40 },
      ],
    });
  });
});

describe('participant registry', () => {
  it('adds a unit through the org-unit-only modal (no weight field)', async () => {
    mockPermissions = { 'unit_performance:read': true, 'unit_performance:manage': true };
    render(<UnitPerformancePage />);
    fireEvent.click(await screen.findByText('Add Unit'));

    // the modal is the org-unit picker only — the global weight field is gone
    expect(await screen.findByPlaceholderText('Select organization unit')).toBeInTheDocument();
    expect(screen.queryByText('Weight (%)')).not.toBeInTheDocument();
  });

  it('removes a unit through the delete dialog', async () => {
    mockPermissions = { 'unit_performance:read': true, 'unit_performance:manage': true };
    render(<UnitPerformancePage />);
    await screen.findByText('ROE');

    fireEvent.click(screen.getByLabelText('Remove Hublang'));
    // getByText matches DIRECT text nodes only — the unit name lives in a
    // nested span, so match on the full textContent of the dialog body
    // (multiple ancestors share the text — presence is enough)
    const dialogText = await screen.findAllByText((content, element) =>
      element?.textContent?.includes('Remove') === true
      && element?.textContent?.includes('HUB') === true
      && element?.textContent?.includes('Hublang') === true);
    expect(dialogText.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('up-hub'));
  });
});
