/**
 * Variable form modal tests — code is create-only and immutable on edit.
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
  description: 'Profitability',
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

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

  it('create submits code + fields', async () => {
    renderModal({ mode: 'CREATE' });
    fireEvent.change(screen.getByPlaceholderText('e.g. ROI'), { target: { value: 'ROI' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Return on Investment'), { target: { value: 'ROI' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    expect(mockOnSubmit.mock.calls[0][0]).toMatchObject({ code: 'ROI', name: 'ROI', unit: null });
  });

  it('edit submits WITHOUT code (immutable)', async () => {
    renderModal({ mode: 'EDIT', variable });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalledTimes(1));
    const payload = mockOnSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('code');
    expect(payload).toMatchObject({ name: 'Return on Investment' });
  });

  it('disables submit while pending', () => {
    renderModal({ mode: 'CREATE', isSubmitting: true });
    expect(screen.getByText('Create')).toBeDisabled();
  });
});
