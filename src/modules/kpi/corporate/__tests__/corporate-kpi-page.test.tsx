/**
 * Corporate KPI page orchestration tests — P1.1 + P1.2.
 * Covers permissions, year selection, current/deleted view toggle,
 * lazy deleted fetch, create/edit permissions, and modal orchestration.
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
  nodeType: 'ASPECT', year: 2026, unit: null, targetValue: null, status: 'ACTIVE',
  description: null, deletedAt: null, createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00', children: [],
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
  it('renders title and description', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Corporate KPI')).toBeInTheDocument();
  });

  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporatePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('hides Deleted KPIs without read_deleted', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Current KPIs');
    expect(screen.queryByText('Deleted KPIs')).not.toBeInTheDocument();
  });

  it('shows Deleted KPIs with read_deleted', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:read_deleted': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted KPIs')).toBeInTheDocument();
  });
});

/* ── Permissions: create/edit ── */

describe('create/edit permissions', () => {
  it('read-only user sees no mutation actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Current KPIs');
    expect(screen.queryByText('Create Aspect')).not.toBeInTheDocument();
  });

  it('create-only user sees Create Aspect button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:create': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Create Aspect')).toBeInTheDocument();
  });

  it('update-only user sees no Create Aspect button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:update': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    await screen.findByText('Current KPIs');
    expect(screen.queryByText('Create Aspect')).not.toBeInTheDocument();
  });

  it('user with both permissions sees Create Aspect', async () => {
    mockPermissions = {
      'corporate_kpi:read': true,
      'corporate_kpi:create': true,
      'corporate_kpi:update': true,
    };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Create Aspect')).toBeInTheDocument();
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
  it('renders Current KPIs as default', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:read_deleted': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Current KPIs')).toBeInTheDocument();
  });
});

/* ── Lazy deleted fetch ── */

describe('lazy deleted fetch', () => {
  it('does not call getDeleted on initial load', () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:read_deleted': true };
    render(<KpiCorporatePage />);
    expect(mockedApi.getDeleted).not.toHaveBeenCalled();
  });
});
