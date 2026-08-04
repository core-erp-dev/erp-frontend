/**
 * Input Variables page tests — permissions, rendering, deleted view.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporateVariablesPage from '@/app/(main)/kpi/corporate/variables/page';
import { variablesApi } from '../variables-api';

jest.mock('../variables-api');
const mockedApi = jest.mocked(variablesApi);

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

const sampleVariable = {
  id: 'var-1',
  code: 'ROI',
  name: 'Return on Investment',
  unit: '%',
  description: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedApi.list.mockResolvedValue([sampleVariable]);
  mockedApi.getDeleted.mockResolvedValue([]);
  mockedApi.create.mockResolvedValue(sampleVariable);
  mockedApi.update.mockResolvedValue(sampleVariable);
  mockedApi.softDelete.mockResolvedValue(undefined);
  mockedApi.restore.mockResolvedValue(sampleVariable);
});

describe('Input Variables page', () => {
  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporateVariablesPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders title and variable rows for read-only user', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariablesPage />);
    expect(await screen.findByRole('heading', { name: 'Input Variables' })).toBeInTheDocument();
    expect(await screen.findByText('ROI')).toBeInTheDocument();
    expect(screen.getByText('Return on Investment')).toBeInTheDocument();
  });

  it('read-only user sees no Add Variable or row actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    expect(screen.queryByText('Add Variable')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
  });

  it('manage user sees Add Variable and Deleted tab', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    expect(await screen.findByText('Add Variable')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('manage user sees row edit/delete actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  it('opens the create modal with Add Variable', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    fireEvent.click(await screen.findByText('Add Variable'));
    // Modal opens with the code input visible (create mode)
    expect(await screen.findByPlaceholderText('e.g. ROI')).toBeInTheDocument();
  });

  it('deleted view fetches deleted variables and offers restore', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getDeleted.mockResolvedValue([
      { ...sampleVariable, id: 'var-9', code: 'OLD', name: 'Old Variable', deletedAt: '2026-01-02T00:00:00' },
    ]);
    render(<KpiCorporateVariablesPage />);
    fireEvent.click(await screen.findByText('Deleted'));
    expect(await screen.findByText('OLD')).toBeInTheDocument();
    expect(screen.getByLabelText('Restore')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Restore'));
    await waitFor(() => expect(mockedApi.restore).toHaveBeenCalledWith('var-9'));
  });

  it('delete flow confirms then soft-deletes', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    fireEvent.click(screen.getByLabelText('Delete'));
    expect(await screen.findByText('Delete Variable')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(mockedApi.softDelete).toHaveBeenCalledWith('var-1'));
  });
});
