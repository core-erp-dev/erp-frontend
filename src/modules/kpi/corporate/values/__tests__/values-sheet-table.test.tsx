/**
 * Monthly sheet table tests — null-value rows, 0 vs empty, invalid input.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValuesSheetTable, valueToDraft, isValidValueInput } from '../values-sheet-table';
import type { VariableValueSheetRow } from '../values.types';

const rows: VariableValueSheetRow[] = [
  { id: null, variableId: 'v1', variableCode: 'ROI', name: 'Return on Investment', unit: '%', year: 2026, month: 8, value: null },
  { id: 'r2', variableId: 'v2', variableCode: 'NPM', name: 'Net Profit Margin', unit: '%', year: 2026, month: 8, value: 0 },
  { id: 'r3', variableId: 'v3', variableCode: 'REV', name: 'Revenue', unit: 'IDR', year: 2026, month: 8, value: 12.5 },
];

function renderTable(overrides: Record<string, unknown> = {}) {
  return render(
    <ValuesSheetTable
      sheet={rows}
      draft={{}}
      onDraftChange={jest.fn()}
      isLoading={false}
      error={null}
      onRetry={jest.fn()}
      canEdit
      {...overrides}
    />,
  );
}

describe('values sheet table', () => {
  it('renders all variables with code, name, unit', () => {
    renderTable();
    expect(screen.getByText('ROI')).toBeInTheDocument();
    expect(screen.getByText('Return on Investment')).toBeInTheDocument();
    expect(screen.getByText('NPM')).toBeInTheDocument();
    expect(screen.getByText('IDR')).toBeInTheDocument();
  });

  it('shows an empty input for a variable with value null', () => {
    renderTable();
    const roiInput = screen.getByLabelText('Value for ROI') as HTMLInputElement;
    expect(roiInput.value).toBe('');
  });

  it('distinguishes 0 from empty — value 0 renders as "0"', () => {
    renderTable();
    const npmInput = screen.getByLabelText('Value for NPM') as HTMLInputElement;
    expect(npmInput.value).toBe('0');
  });

  it('read-only mode renders text instead of inputs', () => {
    renderTable({ canEdit: false });
    expect(screen.queryByLabelText('Value for ROI')).not.toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    // null value shows an em dash in read-only mode
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('marks invalid input and blocks nothing (validation surfaces on Save)', () => {
    const onDraftChange = jest.fn();
    const { rerender } = render(
      <ValuesSheetTable
        sheet={rows}
        draft={{ v3: 'abc' }}
        onDraftChange={onDraftChange}
        isLoading={false}
        error={null}
        onRetry={jest.fn()}
        canEdit
      />,
    );
    expect(screen.getByText('Enter a valid number')).toBeInTheDocument();
    rerender(
      <ValuesSheetTable
        sheet={rows}
        draft={{ v3: '0' }}
        onDraftChange={onDraftChange}
        isLoading={false}
        error={null}
        onRetry={jest.fn()}
        canEdit
      />,
    );
    expect(screen.queryByText('Enter a valid number')).not.toBeInTheDocument();
  });

  it('shows empty-state prompt before a period is loaded', () => {
    renderTable({ sheet: [], isLoading: false, error: null });
    expect(
      screen.getByText('Select a year and month, then press Load to view the monthly sheet.'),
    ).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it('valueToDraft maps null to empty and 0 to "0"', () => {
    expect(valueToDraft(null)).toBe('');
    expect(valueToDraft(0)).toBe('0');
    expect(valueToDraft(12.5)).toBe('12.5');
  });

  it('isValidValueInput accepts empty and finite numbers only', () => {
    expect(isValidValueInput('')).toBe(true);
    expect(isValidValueInput('0')).toBe(true);
    expect(isValidValueInput('-1.5')).toBe(true);
    expect(isValidValueInput('abc')).toBe(false);
    expect(isValidValueInput('1e')).toBe(false);
  });
});
