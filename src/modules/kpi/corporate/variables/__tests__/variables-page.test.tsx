/**
 * Variables page tests — permissions, rendering, deleted view.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporateVariablesPage from '@/app/(main)/kpi/corporate/variables/page';
import { variablesApi } from '../variables-api';

jest.mock('../variables-api');
const mockedApi = jest.mocked(variablesApi);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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
  aggregationMode: 'SUM',
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

describe('Variables page', () => {
  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporateVariablesPage />);
    expect(screen.getByText('Akses Ditolak')).toBeInTheDocument();
  });

  it('renders title and variable rows for read-only user', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariablesPage />);
    expect(await screen.findByRole('heading', { name: 'Variabel KPI' })).toBeInTheDocument();
    expect(await screen.findByText('ROI')).toBeInTheDocument();
    expect(screen.getByText('Return on Investment')).toBeInTheDocument();
  });

  it('read-only user sees no Add Variable or row actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    expect(screen.queryByText('Tambah Variabel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Edit /)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Hapus /)).not.toBeInTheDocument();
  });

  it('manage user sees Add Variable and the Deleted toggle', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    expect(await screen.findByText('Tambah Variabel')).toBeInTheDocument();
    expect(screen.getByText('Data Terhapus')).toBeInTheDocument();
  });

  it('manage user sees row edit/delete actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    expect(screen.getByLabelText(/^Edit /)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Hapus /)).toBeInTheDocument();
  });

  it('opens the create modal with Add Variable', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    fireEvent.click(await screen.findByText('Tambah Variabel'));
    // Modal opens with the code input visible (create mode)
    expect(await screen.findByPlaceholderText('Masukkan Kode')).toBeInTheDocument();
  });

  it('deleted view fetches deleted variables and offers restore', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getDeleted.mockResolvedValue([
      { ...sampleVariable, id: 'var-9', code: 'OLD', name: 'Old Variable', deletedAt: '2026-01-02T00:00:00' },
    ]);
    render(<KpiCorporateVariablesPage />);
    fireEvent.click(await screen.findByText('Data Terhapus'));
    expect(await screen.findByText('OLD')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Pulihkan /)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^Pulihkan /));
    await waitFor(() => expect(mockedApi.restore).toHaveBeenCalledWith('var-9'));
  });

  it('toggles back to Current view with the same button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    fireEvent.click(await screen.findByText('Data Terhapus'));
    // Deleted scope: the toggle reads "Current" and the deleted data was fetched
    expect(await screen.findByText('Aktif')).toBeInTheDocument();
    expect(mockedApi.getDeleted).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Aktif'));
    expect(await screen.findByText('Data Terhapus')).toBeInTheDocument();
  });

  it('delete flow confirms then soft-deletes', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');
    fireEvent.click(screen.getByLabelText(/^Hapus /));
    expect(await screen.findByText('Hapus Variabel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hapus', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.softDelete).toHaveBeenCalledWith('var-1'));
  });

  it('edit form submits the loaded mode — an unrelated edit never erases it', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.list.mockResolvedValue([{ ...sampleVariable, aggregationMode: 'ANNUAL_REQUIRED' }]);
    mockedApi.update.mockResolvedValue({ ...sampleVariable, aggregationMode: 'ANNUAL_REQUIRED' });
    render(<KpiCorporateVariablesPage />);
    await screen.findByText('ROI');

    fireEvent.click(screen.getByLabelText(/^Edit /));
    expect(await screen.findByText('Ubah Variabel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(mockedApi.update).toHaveBeenCalled());
    const payload = mockedApi.update.mock.calls[0][1] as Record<string, unknown>;
    // The persisted ANNUAL_REQUIRED mode is submitted back, not dropped
    expect(payload.aggregationMode).toBe('ANNUAL_REQUIRED');
    expect(payload).not.toHaveProperty('code');
  });
});
