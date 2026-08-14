/**
 * DataTable (employee list) — Position column contract and table states.
 * The row shows the PRIMARY position as plain text; additional positions
 * appear as a `+N` Chip whose Tooltip lists every non-primary position name
 * (primary is never included). Also covers loading, error and empty states.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../data-table';
import type { CoreUser, UserPositionResponse } from '../../types';
import type { PaginatedResponse } from '@/types/api';

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: () => true, hasAnyPerm: () => true }),
}));

const makePosition = (
  id: string,
  positionName: string,
  isPrimary: boolean,
  isActive = true,
): UserPositionResponse => ({
  id,
  userId: 'u1',
  userName: 'Budi',
  userEmail: 'budi@example.com',
  positionId: `pos-${id}`,
  positionName,
  positionCode: 'CODE',
  startDate: '2026-01-01',
  endDate: null,
  isPrimary,
  isActive,
  assignedBy: null,
  createdAt: '2026-01-01',
});

const makeUser = (overrides: Partial<CoreUser>): CoreUser => ({
  id: 'u1',
  authServiceId: null,
  nip: '123456',
  fullName: 'Budi Santoso',
  email: 'budi@example.com',
  deletedAt: null,
  joinDate: '2026-01-01',
  phoneNumber: null,
  gender: null,
  birthDate: null,
  address: null,
  lastSyncAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  roles: [],
  permissions: [],
  primaryPosition: null,
  positions: [],
  ...overrides,
});

const pagination = (totalElements: number): PaginatedResponse<CoreUser> => ({
  content: [],
  page: 1,
  size: 10,
  totalElements,
  totalPages: Math.max(1, Math.ceil(totalElements / 10)),
  last: true,
});

const renderTable = (users: CoreUser[], props?: Partial<React.ComponentProps<typeof DataTable>>) =>
  render(
    <DataTable
      users={users}
      pagination={pagination(users.length)}
      onPageChange={jest.fn()}
      onDelete={jest.fn()}
      onRestore={jest.fn()}
      {...props}
    />,
  );

describe('DataTable — Position column', () => {
  it('shows the primary position as plain text and counts the rest in a +N chip', () => {
    const user = makeUser({
      positions: [
        makePosition('a', 'Direktur', true),
        makePosition('b', 'Kepala Bagian', false),
        makePosition('c', 'Staf Unit', false),
      ],
    });

    renderTable([user]);

    expect(screen.getByText('Direktur')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    // Tooltip lists every non-primary position…
    expect(screen.getByText('Kepala Bagian')).toBeInTheDocument();
    expect(screen.getByText('Staf Unit')).toBeInTheDocument();
    // …and NEVER the primary position.
    expect(screen.getAllByText('Direktur')).toHaveLength(1);
  });

  it('does not render a chip when the user has only the primary position', () => {
    const user = makeUser({ positions: [makePosition('a', 'Staf Unit', true)] });

    renderTable([user]);

    expect(screen.getByText('Staf Unit')).toBeInTheDocument();
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('renders a dash when the user has no active positions', () => {
    const user = makeUser({ positions: [] });

    renderTable([user]);

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('marks the primary position from the isPrimary field, not array order', () => {
    // Primary is the LAST entry — order must not matter.
    const user = makeUser({
      positions: [
        makePosition('a', 'Staf Unit', false),
        makePosition('b', 'Analis', false),
        makePosition('c', 'Kepala Divisi', true),
      ],
    });

    renderTable([user]);

    expect(screen.getByText('Kepala Divisi')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('uses a HeroUI Chip for the additional-position count', () => {
    const user = makeUser({
      positions: [makePosition('a', 'Direktur', true), makePosition('b', 'Staf Unit', false)],
    });

    const { container } = renderTable([user]);
    const chip = screen.getByText('+1').closest('[data-mock="Chip"]');
    expect(chip).not.toBeNull();
    expect(container).not.toBeNull();
  });
});

describe('DataTable — table states', () => {
  it('shows the table spinner while loading (same state as the first load)', () => {
    renderTable([], { isLoading: true });
    expect(document.querySelector('[data-mock="Spinner"]')).not.toBeNull();
  });

  it('shows a clear error state instead of a fake empty state on failure', () => {
    renderTable([], { error: 'Gagal memuat data pegawai', isLoading: false });
    expect(screen.getByText('Gagal memuat data pegawai')).toBeInTheDocument();
    expect(screen.queryByText('Tidak ada data')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is simply no data', () => {
    renderTable([]);
    expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
  });

  it('renders Indonesian pagination summary text', () => {
    const user = makeUser({ positions: [makePosition('a', 'Staf Unit', true)] });
    renderTable([user]);
    expect(screen.getByText(/1–1 dari 1 data/)).toBeInTheDocument();
    expect(screen.getByText('Sebelumnya')).toBeInTheDocument();
    expect(screen.getByText('Berikutnya')).toBeInTheDocument();
  });
});
