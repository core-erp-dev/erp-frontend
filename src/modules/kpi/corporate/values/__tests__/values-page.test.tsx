/**
 * Monthly Variable Values page tests — permissions, dirty state, batch payload.
 * The data hook is mocked; the page logic (period selection, dirty detection,
 * batch payload construction, Save gating) is what we verify here.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporateVariableValuesPage from '@/app/(main)/kpi/corporate/variable-values/page';
import { useVariableValuesData } from '../use-variable-values-data';
import type { VariableValueSheetRow } from '../values.types';

jest.mock('../use-variable-values-data');

let mockPermissions: Record<string, boolean> = {};

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: (perm: string) => mockPermissions[perm] ?? false,
  }),
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    // Controllable Select: fires a fixed selection per aria-label so the page's
    // explicit year/month choice can be driven in jsdom.
    Select: (props: { 'aria-label'?: string; onSelectionChange?: (key: string | number) => void }) => {
      const label = props['aria-label'] ?? '';
      const value = label === 'Select month' ? '8' : '2026';
      return React.createElement(
        'button',
        {
          'data-testid': `select-${label.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'button',
          onClick: () => props.onSelectionChange?.(value),
        },
        label,
      );
    },
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

const mockedHook = jest.mocked(useVariableValuesData);

const sheet: VariableValueSheetRow[] = [
  { id: null, variableId: 'v1', variableCode: 'ROI', name: 'Return on Investment', unit: '%', year: 2026, month: 8, value: null },
  { id: 'r2', variableId: 'v2', variableCode: 'NPM', name: 'Net Profit Margin', unit: '%', year: 2026, month: 8, value: 5 },
];

const baseHook = {
  sheet,
  isLoading: false,
  error: null,
  isSaving: false,
  saveError: null,
  loadedKey: '2026-8',
  fetchSheet: jest.fn().mockResolvedValue(undefined),
  saveBatch: jest.fn().mockResolvedValue(true),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockedHook.mockReturnValue({ ...baseHook, fetchSheet: jest.fn().mockResolvedValue(undefined) });
});

async function loadPeriod() {
  fireEvent.click(screen.getByTestId('select-select-year'));
  fireEvent.click(screen.getByTestId('select-select-month'));
  fireEvent.click(screen.getByText('Load'));
  await waitFor(() => expect(screen.getByText('ROI')).toBeInTheDocument());
}

describe('Monthly Variable Values page', () => {
  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporateVariableValuesPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('read-only user sees the sheet but no Save button', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporateVariableValuesPage />);
    await loadPeriod();
    expect(screen.getByText('Return on Investment')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('manage user sees Save disabled until a value changes', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariableValuesPage />);
    await loadPeriod();
    const save = screen.getByText('Save');
    expect(save).toBeDisabled();
  });

  it('Save becomes enabled after editing and sends only changed rows as batch payload', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedHook.mockReturnValue({ ...baseHook, fetchSheet: jest.fn().mockResolvedValue(undefined) });
    render(<KpiCorporateVariableValuesPage />);
    await loadPeriod();

    // Edit NPM 5 → 7 (changed) and leave ROI empty (unchanged null)
    fireEvent.change(screen.getByLabelText('Value for NPM'), { target: { value: '7' } });
    const save = screen.getByText('Save');
    expect(save).not.toBeDisabled();

    fireEvent.click(save);
    await waitFor(() => expect(baseHook.saveBatch).toHaveBeenCalledTimes(1));
    const payload = baseHook.saveBatch.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(payload).toEqual([
      { variableId: 'v2', year: 2026, month: 8, value: 7 },
    ]);
    // No duplicate natural keys
    expect(new Set(payload.map((i) => `${i.variableId}|${i.year}|${i.month}`)).size)
      .toBe(payload.length);
  });

  it('clearing a stored value marks the sheet dirty (0 vs empty distinction)', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporateVariableValuesPage />);
    await loadPeriod();
    // Save disabled at baseline
    expect(screen.getByText('Save')).toBeDisabled();
    // Clear NPM's stored value 5 → dirty; the atomic upsert requires a value,
    // so cleared rows are skipped and no batch request is fired.
    fireEvent.change(screen.getByLabelText('Value for NPM'), { target: { value: '' } });
    expect(screen.getByText('Save')).not.toBeDisabled();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(baseHook.saveBatch).not.toHaveBeenCalled());
    // The cleared draft survives
    expect((screen.getByLabelText('Value for NPM') as HTMLInputElement).value).toBe('');
  });

  it('Save stays disabled while loading or saving', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedHook.mockReturnValue({ ...baseHook, isLoading: true });
    render(<KpiCorporateVariableValuesPage />);
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('keeps draft and shows error when save fails', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    baseHook.saveBatch.mockResolvedValue(false);
    mockedHook.mockReturnValue({
      ...baseHook,
      fetchSheet: jest.fn().mockResolvedValue(undefined),
      saveError: 'Something went wrong while saving the monthly values.',
    });
    render(<KpiCorporateVariableValuesPage />);
    await loadPeriod();
    fireEvent.change(screen.getByLabelText('Value for NPM'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(baseHook.saveBatch).toHaveBeenCalled());
    // Input survives the failed save
    expect((screen.getByLabelText('Value for NPM') as HTMLInputElement).value).toBe('9');
    expect(screen.getByText('Something went wrong while saving the monthly values.')).toBeInTheDocument();
  });
});
