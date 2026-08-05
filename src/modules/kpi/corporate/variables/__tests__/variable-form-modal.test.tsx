/**
 * Variable form modal tests — code is create-only and immutable on edit;
 * aggregationMode is REQUIRED on create and loaded/submitted on edit.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VariableFormModal } from '../variable-form-modal';
import type { Variable } from '../variables.types';

const mockOnSubmit = jest.fn().mockResolvedValue(true);
const mockOnClose = jest.fn();

const variable: Variable = {
  id: 'var-1',
  code: 'ROI',
  name: 'Return on Investment',
  unit: '%',
  aggregationMode: 'SUM',
  description: 'Profitability',
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

/* Controllable Select mock — the Aggregation Mode select fires 'AVERAGE' by
 * default so tests can drive mode selection in jsdom. */
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  // Controllable Select: renders children (so FieldError appears) and fires a
  // fixed selection per aria-label so tests can drive mode selection.
  const SelectMock = (props: {
    'aria-label'?: string;
    onSelectionChange?: (key: string | number) => void;
    children?: React.ReactNode;
  }) => {
    const label = props['aria-label'] ?? '';
    const value = label === 'Aggregation mode' ? 'AVERAGE' : '';
    return React.createElement(
      'div',
      {
        'data-testid': 'select-aggregation-mode',
        onClick: () => props.onSelectionChange?.(value),
      },
      props.children,
    );
  };
  SelectMock.Trigger = 'span';
  SelectMock.Value = 'span';
  SelectMock.Indicator = 'span';
  SelectMock.Popover = 'span';
  return {
    ...actual,
    Select: SelectMock,
  };
});

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <VariableFormModal
      mode="CREATE"
      isOpen={true}
      onClose={mockOnClose}
      onSubmit={mockOnSubmit}
      isSubmitting={false}
      {...overrides}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Variable form modal', () => {
  it('create mode shows the Code field', () => {
    renderModal({ mode: 'CREATE' });
    expect(screen.getByPlaceholderText('e.g. ROI')).toBeInTheDocument();
  });

  it('edit mode hides the Code field (immutable)', () => {
    renderModal({ mode: 'EDIT', variable });
    expect(screen.queryByPlaceholderText('e.g. ROI')).not.toBeInTheDocument();
  });

  it('edit mode prefills name/unit/description', () => {
    renderModal({ mode: 'EDIT', variable });
    expect(screen.getByDisplayValue('Return on Investment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('%')).toBeInTheDocument();
  });

  it('create REQUIRES aggregationMode — submit is blocked without a selection', async () => {
    renderModal({ mode: 'CREATE' });
    fireEvent.change(screen.getByPlaceholderText('e.g. ROI'), { target: { value: 'ROI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Return on Investment'), { target: { value: 'ROI' } });
    // No mode selected (Select mock never clicked)
    fireEvent.click(screen.getByText('Create'));
    expect(await screen.findByText('Aggregation mode is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('create submits the exact backend enum value selected in the UI', async () => {
    renderModal({ mode: 'CREATE' });
    fireEvent.change(screen.getByPlaceholderText('e.g. ROI'), { target: { value: 'ROI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Return on Investment'), { target: { value: 'ROI' } });
    fireEvent.click(screen.getByTestId('select-aggregation-mode')); // mock selects 'AVERAGE'
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    expect(mockOnSubmit.mock.calls[0][0]).toMatchObject({
      code: 'ROI',
      name: 'ROI',
      unit: null,
      aggregationMode: 'AVERAGE',
    });
  });

  it('edit form loads and submits the persisted mode explicitly', async () => {
    renderModal({ mode: 'EDIT', variable }); // variable.aggregationMode = 'SUM'
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const payload = mockOnSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('code');
    expect(payload).toMatchObject({ name: 'Return on Investment' });
    // The loaded mode is submitted — unrelated edits never erase it
    expect(payload.aggregationMode).toBe('SUM');
  });

  it('edit can switch the mode to another enum value', async () => {
    renderModal({ mode: 'EDIT', variable });
    fireEvent.click(screen.getByTestId('select-aggregation-mode')); // mock selects 'AVERAGE'
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const payload = mockOnSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.aggregationMode).toBe('AVERAGE');
  });

  it('create rejects a code that violates the backend pattern', async () => {
    renderModal({ mode: 'CREATE' });
    fireEvent.change(screen.getByPlaceholderText('e.g. ROI'), { target: { value: 'roi' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Return on Investment'), { target: { value: 'ROI' } });
    fireEvent.click(screen.getByText('Create'));
    expect(
      await screen.findByText(/must start with an uppercase letter/),
    ).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('disables submit while pending', () => {
    renderModal({ mode: 'CREATE', isSubmitting: true });
    expect(screen.getByText('Create')).toBeDisabled();
  });
});
