/**
 * Corporate KPI form modal tests — P1.2.
 * Covers all 4 modes: create/edit Aspect/Indicator.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KpiNodeFormModal } from '../kpi-node-form-modal';
import type { CorporateKpiNode } from '../corporate-kpi.types';

const mockOnSubmit = jest.fn().mockResolvedValue(true);
const mockOnClose = jest.fn();

/* ── Sample data ── */

const aspect: CorporateKpiNode = {
  id: 'asp-1', parentId: null, parentName: null, code: 'FIN', name: 'Financial',
  nodeType: 'ASPECT', year: 2026, unit: null, targetValue: null, status: 'ACTIVE',
  description: null, deletedAt: null, createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00', children: [],
};

const indicator: CorporateKpiNode = {
  id: 'ind-1', parentId: 'asp-1', parentName: 'Financial', code: 'F01',
  name: 'Revenue Growth', nodeType: 'INDICATOR', year: 2026, unit: '%',
  targetValue: 10.5, status: 'DRAFT', description: 'Test indicator',
  deletedAt: null, createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00', children: [],
};

const aspects = [
  aspect,
  { ...aspect, id: 'asp-2', code: 'CUST', name: 'Customer' },
];

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <KpiNodeFormModal
      mode="CREATE_ASPECT"
      isOpen={true}
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      preselectedParentId={undefined}
      node={undefined}
      aspects={aspects}
      selectedYear={2026}
      isSubmitting={false}
      {...overrides}
    />,
  );
}

function clickSave() {
  const btn = screen.getByText('Save');
  fireEvent.click(btn);
}

beforeEach(() => { jest.clearAllMocks(); });

/* ── Create Aspect ── */

describe('Create Aspect', () => {
  it('renders title Create Aspect', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.getByText('Create Aspect')).toBeInTheDocument();
  });

  it('shows Code, Name, and Description fields', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.getByPlaceholderText('e.g. FIN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Financial')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('does not show Indicator-only fields', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.queryByText('Parent Aspect')).not.toBeInTheDocument();
    expect(screen.queryByText('Unit')).not.toBeInTheDocument();
    expect(screen.queryByText('Target Value')).not.toBeInTheDocument();
  });

  it('rejects blank Code', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    clickSave();
    expect(screen.getByText('Code is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects blank Name', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'FIN' } });
    clickSave();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits with nodeType:ASPECT, year, and explicit nulls', async () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'FIN' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Financial' } });
    clickSave();
    await screen.findByText('Save'); // wait for UI update
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      nodeType: 'ASPECT', year: 2026, parentId: null, unit: null, targetValue: null,
    });
  });
});

/* ── Create Indicator ── */

describe('Create Indicator', () => {
  it('renders title Create Indicator', () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    expect(screen.getByText('Create Indicator')).toBeInTheDocument();
  });

  it('shows Parent Aspect, Unit, and Target Value fields', () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    expect(screen.getByText('Parent Aspect')).toBeInTheDocument();
    expect(screen.getByText('Unit')).toBeInTheDocument();
    expect(screen.getByText('Target Value')).toBeInTheDocument();
  });

  it('rejects blank parent', () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. %'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5'), { target: { value: '10' } });
    clickSave();
    expect(screen.getByText('Parent Aspect is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects blank unit', () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5'), { target: { value: '10' } });
    clickSave();
    expect(screen.getByText('Unit is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects blank target value', () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. %'), { target: { value: '%' } });
    clickSave();
    expect(screen.getByText('Target value is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects zero target value', () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. %'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5'), { target: { value: '0' } });
    clickSave();
    expect(screen.getByText('Target value must be greater than zero.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects negative target value', () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. %'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5'), { target: { value: '-1' } });
    clickSave();
    expect(screen.getByText('Target value must be greater than zero.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid Indicator with nodeType:INDICATOR', async () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. %'), { target: { value: '%' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.5'), { target: { value: '10.5' } });
    clickSave();
    await screen.findByText('Save');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      nodeType: 'INDICATOR', year: 2026, parentId: 'asp-1', unit: '%', targetValue: 10.5,
    });
    expect(payload).not.toHaveProperty('id');
  });
});

/* ── Edit Aspect ── */

describe('Edit Aspect', () => {
  it('populates current values', () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    expect(screen.getByDisplayValue('FIN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Financial')).toBeInTheDocument();
  });

  it('shows immutable Type and Year', () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    expect(screen.getByText('Type: Aspect')).toBeInTheDocument();
    expect(screen.getByText('Year: 2026')).toBeInTheDocument();
  });

  it('submits update without nodeType or year', async () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    const codeInput = screen.getByDisplayValue('FIN');
    fireEvent.change(codeInput, { target: { value: 'FIN-UPD' } });
    clickSave();
    await screen.findByText('Save');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload.code).toBe('FIN-UPD');
    expect(payload).not.toHaveProperty('nodeType');
    expect(payload).not.toHaveProperty('year');
    expect(payload.parentId).toBeNull();
    expect(payload.unit).toBeNull();
    expect(payload.targetValue).toBeNull();
  });
});

/* ── Edit Indicator ── */

describe('Edit Indicator', () => {
  it('populates current values', () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    expect(screen.getByDisplayValue('F01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revenue Growth')).toBeInTheDocument();
    expect(screen.getByDisplayValue('%')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10.5')).toBeInTheDocument();
  });

  it('rejects empty unit on edit', () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    fireEvent.change(screen.getByDisplayValue('%'), { target: { value: '' } });
    clickSave();
    expect(screen.getByText('Unit is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects empty target value on edit', () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    fireEvent.change(screen.getByDisplayValue('10.5'), { target: { value: '' } });
    clickSave();
    expect(screen.getByText('Target value is required.')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits update with parent/unit/target excluding nodeType/year', async () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    clickSave();
    await screen.findByText('Save');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      code: 'F01', name: 'Revenue Growth', parentId: 'asp-1', unit: '%', targetValue: 10.5,
    });
    expect(payload).not.toHaveProperty('nodeType');
    expect(payload).not.toHaveProperty('year');
  });
});

/* ── Pending state ── */

describe('pending state', () => {
  it('disables Save while submitting', () => {
    renderModal({ mode: 'CREATE_ASPECT', isSubmitting: true });
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('disables Cancel while submitting', () => {
    renderModal({ mode: 'CREATE_ASPECT', isSubmitting: true });
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('shows Saving... text while submitting', () => {
    renderModal({ mode: 'CREATE_ASPECT', isSubmitting: true });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});

/* ── Form reset ── */

describe('form reset', () => {
  it('Edit Indicator A → close → Edit Indicator B shows B values', () => {
    const { rerender } = renderModal({
      mode: 'EDIT_INDICATOR',
      node: { ...indicator, id: 'ind-a', code: 'F01', name: 'Indicator A' },
    });
    expect(screen.getByDisplayValue('F01')).toBeInTheDocument();

    rerender(
      <KpiNodeFormModal
        mode="EDIT_INDICATOR"
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        node={{ ...indicator, id: 'ind-b', code: 'F02', name: 'Indicator B' }}
        aspects={aspects}
        selectedYear={2026}
        isSubmitting={false}
      />,
    );
    expect(screen.getByDisplayValue('F02')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('F01')).not.toBeInTheDocument();
  });

  it('Edit Indicator → Create Aspect clears Indicator-only values', () => {
    const { rerender } = renderModal({
      mode: 'EDIT_INDICATOR',
      node: indicator,
    });
    expect(screen.getByDisplayValue('%')).toBeInTheDocument();

    rerender(
      <KpiNodeFormModal
        mode="CREATE_ASPECT"
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        aspects={aspects}
        selectedYear={2026}
        isSubmitting={false}
      />,
    );
    expect(screen.queryByDisplayValue('%')).not.toBeInTheDocument();
    expect(screen.queryByText('Unit')).not.toBeInTheDocument();
    expect(screen.queryByText('Target Value')).not.toBeInTheDocument();
  });

  it('pending state resets after success', () => {
    const { rerender } = renderModal({
      mode: 'CREATE_ASPECT',
      isSubmitting: true,
    });
    expect(screen.getByText('Saving...')).toBeDisabled();

    rerender(
      <KpiNodeFormModal
        mode="CREATE_ASPECT"
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        aspects={aspects}
        selectedYear={2026}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText('Save')).not.toBeDisabled();
  });
});
