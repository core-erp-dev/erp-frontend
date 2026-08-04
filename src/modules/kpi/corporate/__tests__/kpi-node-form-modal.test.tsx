/**
 * Corporate KPI form modal tests — new scoring-field contract.
 * Covers all 4 modes: create/edit Aspect/Indicator with staged scoring config.
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
  nodeType: 'ASPECT', year: 2026, status: 'ACTIVE', description: null,
  displayOrder: 0, formula: null, assessmentRules: null, weight: null, targetScore: null,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

const indicator: CorporateKpiNode = {
  ...aspect,
  id: 'ind-1', parentId: 'asp-1', parentName: 'Financial', code: 'F01',
  name: 'Revenue Growth', nodeType: 'INDICATOR', status: 'DRAFT', description: 'Test indicator',
  formula: 'ROI + NPM', weight: 0.25, targetScore: 80,
  assessmentRules: [
    { lowerBound: null, lowerInclusive: true, upperBound: 50, upperInclusive: false, score: 0 },
    { lowerBound: 50, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 100 },
  ],
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
  const btn = screen.getByText('Create');
  fireEvent.click(btn);
}

beforeEach(() => { jest.clearAllMocks(); });

/* ── Create Aspect ── */

describe('Add Aspect', () => {
  it('renders title Add Corporate KPI', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.getByText('Add Corporate KPI')).toBeInTheDocument();
  });

  it('shows Code, Name, and Description fields', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.getByPlaceholderText('e.g. FIN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Financial')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('does not show Indicator-only scoring fields', () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    expect(screen.queryByText('Parent Aspect')).not.toBeInTheDocument();
    expect(screen.queryByText('Formula')).not.toBeInTheDocument();
    expect(screen.queryByText('Weight (ratio)')).not.toBeInTheDocument();
    expect(screen.queryByText('Target Score')).not.toBeInTheDocument();
  });

  it('rejects blank Code', async () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    clickSave();
    expect(await screen.findByText('Code is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('rejects blank Name', async () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'FIN' } });
    clickSave();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits ASPECT with null scoring fields', async () => {
    renderModal({ mode: 'CREATE_ASPECT' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'FIN' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Financial' } });
    clickSave();
    await screen.findByText('Create');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      nodeType: 'ASPECT', year: 2026, parentId: null,
      formula: null, assessmentRules: null, weight: null, targetScore: null,
      displayOrder: 0,
    });
  });
});

/* ── Create Indicator (staged config — scoring optional) ── */

describe('Add Indicator', () => {
  it('renders title Add Corporate KPI', () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    expect(screen.getByText('Add Corporate KPI')).toBeInTheDocument();
  });

  it('shows Parent Aspect and scoring fields', () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    expect(screen.getByText('Parent Aspect')).toBeInTheDocument();
    expect(screen.getByText('Formula')).toBeInTheDocument();
    expect(screen.getByText('Weight (ratio)')).toBeInTheDocument();
    expect(screen.getByText('Target Score')).toBeInTheDocument();
  });

  it('rejects blank parent', async () => {
    renderModal({ mode: 'CREATE_INDICATOR' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    clickSave();
    expect(await screen.findByText('Parent Aspect is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid Indicator without scoring (staged DRAFT)', async () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    clickSave();
    await screen.findByText('Create');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      nodeType: 'INDICATOR', year: 2026, parentId: 'asp-1',
      formula: null, assessmentRules: null, weight: null, targetScore: null,
    });
    expect(payload).not.toHaveProperty('id');
  });

  it('rejects weight above 1 (100%)', async () => {
    renderModal({ mode: 'CREATE_INDICATOR', preselectedParentId: 'asp-1' });
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 0.25'), { target: { value: '1.5' } });
    clickSave();
    expect(await screen.findByText('Weight must not exceed 100%')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});

/* ── Edit Aspect ── */

describe('Edit Aspect', () => {
  it('populates current values', () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    expect(screen.getByDisplayValue('FIN')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Financial')).toBeInTheDocument();
  });

  it('shows immutable Year', () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    expect(screen.getByText('Year: 2026')).toBeInTheDocument();
  });

  it('submits update without nodeType or year', async () => {
    renderModal({ mode: 'EDIT_ASPECT', node: aspect });
    const codeInput = screen.getByDisplayValue('FIN');
    fireEvent.change(codeInput, { target: { value: 'FIN-UPD' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await screen.findByText('Save Changes');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload.code).toBe('FIN-UPD');
    expect(payload).not.toHaveProperty('nodeType');
    expect(payload).not.toHaveProperty('year');
    expect(payload.parentId).toBeNull();
    expect(payload.formula).toBeNull();
  });
});

/* ── Edit Indicator ── */

describe('Edit Indicator', () => {
  it('populates current scoring values', () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    expect(screen.getByDisplayValue('F01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revenue Growth')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ROI + NPM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80')).toBeInTheDocument();
  });

  it('submits update with scoring fields excluding nodeType/year', async () => {
    renderModal({ mode: 'EDIT_INDICATOR', node: indicator });
    fireEvent.click(screen.getByText('Save Changes'));
    await screen.findByText('Save Changes');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const payload = mockOnSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      code: 'F01', name: 'Revenue Growth', parentId: 'asp-1',
      formula: 'ROI + NPM', weight: 0.25, targetScore: 80,
      displayOrder: 0,
    });
    expect(payload.assessmentRules).toHaveLength(2);
    expect(payload).not.toHaveProperty('nodeType');
    expect(payload).not.toHaveProperty('year');
  });
});

/* ── Pending state ── */

describe('pending state', () => {
  it('disables Create while submitting', () => {
    renderModal({ mode: 'CREATE_ASPECT', isSubmitting: true });
    expect(screen.getByText('Create')).toBeDisabled();
  });

  it('disables Cancel while submitting', () => {
    renderModal({ mode: 'CREATE_ASPECT', isSubmitting: true });
    expect(screen.getByText('Cancel')).toBeDisabled();
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
    expect(screen.getByDisplayValue('ROI + NPM')).toBeInTheDocument();

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
    expect(screen.queryByDisplayValue('ROI + NPM')).not.toBeInTheDocument();
    expect(screen.queryByText('Formula')).not.toBeInTheDocument();
  });
});
