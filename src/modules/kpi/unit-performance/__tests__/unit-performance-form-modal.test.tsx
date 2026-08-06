/**
 * Unit Performance Add/Edit modal tests.
 * Covers field validation (org unit required, weight 0 < w <= 100), the
 * projected-total three-state UX (>100 blocks, =100 complete, <100 allowed),
 * edit prefill/submit, and create payload shape.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnitPerformanceFormModal } from '../unit-performance-form-modal';
import type { UnitPerformanceRow } from '../unit-performance.types';
import type { OrganizationUnitResponse } from '@/modules/organization/organization-units/types';

const mockOnSubmit = jest.fn().mockResolvedValue(true);
const mockOnClose = jest.fn();

/* Controllable ComboBox mock — fires the first org unit id on click so tests
 * can drive selection in jsdom (same pattern as the variable modal Select mock). */
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  const ComboBoxMock = (props: {
    onSelectionChange?: (key: string | number | null) => void;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'org-unit-combobox',
        onClick: () => props.onSelectionChange?.('ou-1'),
      },
      props.children,
    );
  ComboBoxMock.InputGroup = 'div';
  ComboBoxMock.Trigger = 'span';
  ComboBoxMock.Popover = 'div';
  return {
    ...actual,
    ComboBox: ComboBoxMock,
  };
});

const rows: UnitPerformanceRow[] = [
  {
    id: 'up-1',
    organizationUnitId: 'ou-1',
    unitCode: 'U1',
    unitName: 'Umum & Administrasi',
    weight: 80,
    realization: null,
    performance: null,
    status: 'NO_KPI_DATA',
  },
];

const orgUnits: OrganizationUnitResponse[] = [
  {
    id: 'ou-2',
    parentId: null,
    parentName: null,
    unitCode: 'U2',
    unitName: 'Hubungan Langganan',
    unitType: 'DEPARTMENT',
    description: null,
    isActive: true,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    directChildrenCount: 0,
    activePositionCount: 0,
    children: [],
  },
];

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <UnitPerformanceFormModal
      mode="CREATE"
      isOpen={true}
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      rows={rows}
      orgUnits={orgUnits}
      isSubmitting={false}
      {...overrides}
    />,
  );
}

function typeWeight(value: string) {
  fireEvent.change(screen.getByPlaceholderText('e.g. 25'), { target: { value } });
}

beforeEach(() => jest.clearAllMocks());

describe('validation', () => {
  it('requires an org unit and a weight on create', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Organization unit is required')).toBeInTheDocument();
    expect(screen.getByText('Weight is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects weight 0 and weight above 100', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('org-unit-combobox'));

    typeWeight('0');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Weight must be greater than 0')).toBeInTheDocument();

    typeWeight('101');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Weight must not exceed 100')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});

describe('projected total', () => {
  it('blocks save when the projected total exceeds 100%', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('org-unit-combobox'));

    typeWeight('25'); // 80 + 25 = 105
    expect(await screen.findByText(/exceeds 100%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('shows complete at exactly 100% and allows save', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('org-unit-combobox'));

    typeWeight('20'); // 80 + 20 = 100
    expect(await screen.findByText(/total weight: 100% \(complete\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });

  it('allows an incomplete total below 100% with a warning', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('org-unit-combobox'));

    typeWeight('15'); // 80 + 15 = 95
    expect(await screen.findByText(/total weight: 95% \(incomplete — remaining 5%\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).not.toBeDisabled();
  });
});

describe('submit payloads', () => {
  it('create submits organizationUnitId + weight in percentage points', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('org-unit-combobox'));

    typeWeight('20');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith({ organizationUnitId: 'ou-1', weight: 20 }),
    );
  });

  it('edit prefills the unit and weight and submits weight only', async () => {
    const editRow: UnitPerformanceRow = {
      ...rows[0],
      id: 'up-1',
      organizationUnitId: 'ou-1',
      weight: 30,
    };
    renderModal({ mode: 'EDIT', row: editRow });

    expect(screen.getByText('U1 — Umum & Administrasi')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 25')).toHaveValue('30');

    typeWeight('35');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith({ weight: 35 }, 'up-1'),
    );
  });
});
