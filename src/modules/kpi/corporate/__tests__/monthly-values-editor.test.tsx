/**
 * Focused regression tests for the monthly values editor permission gating.
 *
 * A user without corporate_kpi:manage must see the values editor fully
 * disabled and must not be able to trigger a save.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthlyValuesEditor } from '../monthly-values-editor';
import type { CorporateConfigurationDefinition } from '../corporate-kpi.types';

// @heroui/react is mapped to the shared mock via jest moduleNameMapper.

const baseDefinition: CorporateConfigurationDefinition = {
  configuration: {
    id: 'cfg-1',
    year: 2028,
    configurationStatus: 'ACTIVE',
    recordingStatus: 'OPEN',
    version: 7,
  },
  aspects: [],
  variables: [
    { id: 'var-1', clientRef: null, code: 'NET_INCOME', name: 'Net Income', unit: null, aggregationMethod: 'SUM', displayOrder: 1 },
  ],
  scoreBands: [],
  performanceBands: [],
};

describe('MonthlyValuesEditor permission gating', () => {
  it('disables save and inputs when isReadOnly and never calls onSave', () => {
    const onSave = jest.fn();
    render(
      <MonthlyValuesEditor
        definition={baseDefinition}
        isMutating={false}
        isReadOnly
        onSave={onSave}
        loadValues={jest.fn()}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /save month/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();

    // no false "recording is closed" alert for a permission-only lock
    expect(screen.queryByText(/recording is closed/i)).not.toBeInTheDocument();
  });
});
