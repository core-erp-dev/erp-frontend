/**
 * Corporate KPI page orchestration tests — P1.1.
 * Covers permissions, year selection, current/deleted view toggle, lazy deleted fetch.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiCorporatePage from '@/app/(main)/hr/kpi/corporate/page';
import { corporateKpiApi } from '../corporate-kpi-api';

/* ── Mock dependencies ── */

jest.mock('../corporate-kpi-api');
const mockedApi = jest.mocked(corporateKpiApi);

// We need to control permissions per test
let mockPermissions: Record<string, boolean> = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: (perm: string) => mockPermissions[perm] ?? false,
  }),
}));

// Suppress toast calls in tests
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  return {
    ...actual,
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.getTreeByYear.mockResolvedValue([]);
  mockedApi.getDeleted.mockResolvedValue([]);
});

/* ── Permissions ── */

describe('permissions', () => {
  it('renders title and description for authorized user', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Corporate KPI')).toBeInTheDocument();
    expect(
      screen.getByText('Manage the corporate KPI tree and annual targets.'),
    ).toBeInTheDocument();
  });

  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporatePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('hides Deleted KPIs button without read_deleted permission', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Current KPIs');
    expect(screen.queryByText('Deleted KPIs')).not.toBeInTheDocument();
  });

  it('shows Deleted KPIs button with read_deleted permission', async () => {
    mockPermissions = {
      'corporate_kpi:read': true,
      'corporate_kpi:read_deleted': true,
    };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted KPIs')).toBeInTheDocument();
  });
});

/* ── Year selection ── */

describe('year selection', () => {
  it('defaults to current year', () => {
    mockPermissions = { 'corporate_kpi:read': true };
    const currentYear = new Date().getFullYear();
    render(<KpiCorporatePage />);
    expect(mockedApi.getTreeByYear).toHaveBeenCalledWith(currentYear);
  });
});

/* ── View toggle ── */

describe('view toggle', () => {
  it('renders Current KPIs as default view', async () => {
    mockPermissions = {
      'corporate_kpi:read': true,
      'corporate_kpi:read_deleted': true,
    };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Current KPIs')).toBeInTheDocument();
  });

  it('shows Deleted KPIs button for authorized user', async () => {
    mockPermissions = {
      'corporate_kpi:read': true,
      'corporate_kpi:read_deleted': true,
    };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted KPIs')).toBeInTheDocument();
  });
});

/* ── Lazy deleted fetch ── */

describe('lazy deleted fetch', () => {
  it('does not call getDeleted on initial load', () => {
    mockPermissions = {
      'corporate_kpi:read': true,
      'corporate_kpi:read_deleted': true,
    };
    render(<KpiCorporatePage />);
    expect(mockedApi.getDeleted).not.toHaveBeenCalled();
  });
});
