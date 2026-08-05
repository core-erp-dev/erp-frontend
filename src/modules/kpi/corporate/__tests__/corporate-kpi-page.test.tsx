/**
 * Corporate KPI page orchestration tests.
 * Covers permissions (read/manage), year selection, current/deleted view
 * toggle, lazy deleted fetch, and modal orchestration.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporatePage from '@/app/(main)/kpi/corporate/page';
import { corporateKpiApi } from '../corporate-kpi-api';
import type { CorporateKpiNode } from '../corporate-kpi.types';

/* ── Mock dependencies ── */

jest.mock('../corporate-kpi-api');
const mockedApi = jest.mocked(corporateKpiApi);

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

const sampleNode: CorporateKpiNode = {
  id: 'asp-1', parentId: null, parentName: null, code: 'FIN', name: 'Financial',
  nodeType: 'ASPECT', year: 2026, status: 'ACTIVE', description: null,
  displayOrder: 0, formula: null, assessmentRules: null, weight: null, targetScore: null,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.getTreeByYear.mockResolvedValue([]);
  mockedApi.getDeleted.mockResolvedValue([]);
  mockedApi.create.mockResolvedValue(sampleNode);
  mockedApi.update.mockResolvedValue(sampleNode);
});

/* ── Permissions: read ── */

describe('read permissions', () => {
  it('renders title', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByRole('heading', { name: 'Corporate KPI' })).toBeInTheDocument();
  });

  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporatePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('hides the Deleted toggle without manage', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('shows the Deleted toggle with manage', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });
});

/* ── Permissions: manage ── */

describe('manage permissions', () => {
  it('read-only user sees no mutation actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Add Corporate KPI')).not.toBeInTheDocument();
  });

  it('manage user sees Add Corporate KPI button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Add Corporate KPI')).toBeInTheDocument();
  });

  it('read-only user cannot see the Deleted toggle', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });
});

/* ── Year selection ── */

describe('period selection', () => {
  it('defaults to the current year in MONTHLY mode (year + month)', () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(mockedApi.getTreeByYear).toHaveBeenCalledWith(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    );
  });

  it('switching to Year refetches the ANNUAL tree with year only (month omitted)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);
    await screen.findByText('Month');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      new Date().getFullYear(),
      undefined,
    ));
  });

  it('switching back to Month refetches with the month again', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);
    await screen.findByText('Month');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      new Date().getFullYear(), undefined,
    ));
    fireEvent.click(screen.getByText('Month', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      new Date().getFullYear(), new Date().getMonth() + 1,
    ));
  });

  it('read-only users see the tree but never the Input Values action', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Input Nilai')).not.toBeInTheDocument();
    expect(screen.queryByText('Input Values')).not.toBeInTheDocument();
  });

  it('manage users never see an Input Values button (values entry lives on its own page)', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Month')).toBeInTheDocument();
    expect(screen.queryByText('Input Nilai')).not.toBeInTheDocument();
    expect(screen.queryByText('Input Values')).not.toBeInTheDocument();
  });
});

/* ── View toggle ── */

describe('view toggle', () => {
  it('renders Current view as default (toggle reads "Deleted")', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('toggles to Deleted view and back', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);

    fireEvent.click(await screen.findByText('Deleted'));
    // Deleted scope: toggle reads "Current" and the deleted data is fetched
    expect(await screen.findByText('Current')).toBeInTheDocument();
    expect(mockedApi.getDeleted).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Current'));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });
});

/* ── Lazy deleted fetch ── */

describe('lazy deleted fetch', () => {
  it('does not call getDeleted on initial load', () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(mockedApi.getDeleted).not.toHaveBeenCalled();
  });
});

/* ── Default tree expansion ── */

describe('tree expansion', () => {
  const indicator: CorporateKpiNode = {
    ...sampleNode,
    id: 'ind-1',
    parentId: 'asp-1',
    parentName: 'Financial',
    code: 'F01',
    name: 'Revenue Growth',
    nodeType: 'INDICATOR',
    children: [],
  };

  it('expands every expandable row by default on first load', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [indicator] }]);
    render(<KpiCorporatePage />);
    // The child indicator is visible without any expand interaction
    expect(await screen.findByText('Revenue Growth')).toBeInTheDocument();
  });

  it('collapses a row once the user toggles it (auto-expand ends on first toggle)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [indicator] }]);
    render(<KpiCorporatePage />);
    await screen.findByText('Revenue Growth');

    fireEvent.click(screen.getByLabelText('Collapse'));
    expect(screen.queryByText('Revenue Growth')).not.toBeInTheDocument();
  });
});
