/**
 * Corporate KPI page orchestration tests.
 * Covers permissions (read/manage), year selection, current/deleted view
 * toggle, lazy deleted fetch, and modal orchestration.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('hides Deleted view without manage', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Current');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('shows Deleted view with manage', async () => {
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
    await screen.findByText('Current');
    expect(screen.queryByText('Add Corporate KPI')).not.toBeInTheDocument();
  });

  it('manage user sees Add Corporate KPI button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Add Corporate KPI')).toBeInTheDocument();
  });

  it('read-only user cannot see Deleted actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Current');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });
});

/* ── Year selection ── */

describe('year selection', () => {
  it('defaults to current year', () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(mockedApi.getTreeByYear).toHaveBeenCalledWith(new Date().getFullYear());
  });
});

/* ── View toggle ── */

describe('view toggle', () => {
  it('renders Current view as default', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Current')).toBeInTheDocument();
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
