/**
 * Focused regression tests for the definition editor permission gating.
 *
 * Guards the smoke-discovered defect: a user without corporate_kpi:manage
 * must see the editor fully disabled (no edit affordances, no save), while
 * an enabled editor still invokes the save callback exactly once.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigurationEditor } from '../configuration-editor';
import type { CorporateConfigurationDefinition } from '../corporate-kpi.types';

// @heroui/react and @phosphor-icons/react are mapped to shared mocks via
// jest moduleNameMapper (jest.config.ts).

const baseDefinition: CorporateConfigurationDefinition = {
  configuration: {
    id: 'cfg-1',
    year: 2028,
    configurationStatus: 'ACTIVE',
    recordingStatus: 'OPEN',
    version: 7,
  },
  aspects: [
    {
      id: 'asp-1',
      clientRef: null,
      code: 'FIN',
      name: 'Finance',
      displayOrder: 1,
      description: null,
      indicators: [
        {
          id: 'ind-1',
          clientRef: null,
          code: 'ROE',
          name: 'Return on Equity',
          unit: '%',
          displayOrder: 1,
          weight: 1,
          targetScore: 3,
          formulaExpression: '(NET_INCOME / EQUITY) * 100',
        },
      ],
    },
  ],
  variables: [
    { id: 'var-1', clientRef: null, code: 'NET_INCOME', name: 'Net Income', unit: null, aggregationMethod: 'SUM', displayOrder: 1 },
  ],
  scoreBands: [],
  performanceBands: [],
};

describe('ConfigurationEditor permission gating', () => {
  it('disables every edit control and the save button when isReadOnly', () => {
    render(
      <ConfigurationEditor
        definition={baseDefinition}
        isLoading={false}
        error={null}
        isMutating={false}
        isReadOnly
        onSave={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /add aspect/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save definition/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove indicator ROE/i })).toBeDisabled();

    // no false "recording is closed" alert for a permission-only lock
    expect(screen.queryByText(/recording is closed/i)).not.toBeInTheDocument();
  });

  it('does not invoke onSave when the disabled save button is pressed', () => {
    const onSave = jest.fn();
    render(
      <ConfigurationEditor
        definition={baseDefinition}
        isLoading={false}
        error={null}
        isMutating={false}
        isReadOnly
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save definition/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('invokes onSave exactly once when editable', () => {
    const onSave = jest.fn().mockResolvedValue({ version: 8, idMapping: {} });
    render(
      <ConfigurationEditor
        definition={baseDefinition}
        isLoading={false}
        error={null}
        isMutating={false}
        isReadOnly={false}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /save definition/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
