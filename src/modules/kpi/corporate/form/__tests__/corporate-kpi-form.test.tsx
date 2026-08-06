/**
 * Corporate KPI form tests — aspect/indicator field visibility, guided
 * formula builder serialization, score-rule generation (higher/lower),
 * gap/overlap validation, score simulation, edit data population without
 * formula/rule loss, advanced-mode fallback, and create/update payloads.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CorporateKpiForm } from '../corporate-kpi-form';
import { useCorporateKpiData } from '../../use-corporate-kpi-data';
import { corporateKpiApi } from '../../corporate-kpi-api';
import { variablesApi } from '../../variables/variables-api';
import type { CorporateKpiNode } from '../../corporate-kpi.types';
import type { AssessmentRule } from '../../corporate-kpi.types';

jest.mock('../../use-corporate-kpi-data');
jest.mock('../../corporate-kpi-api');
jest.mock('../../variables/variables-api');

const mockCreateNode = jest.fn().mockResolvedValue(null);
const mockUpdateNode = jest.fn().mockResolvedValue(null);
const mockFetchTree = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: () => true }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/kpi/corporate',
}));

// Overrides: Select fires a fixed selection per aria-label (Year value is
// per-test configurable); ComboBox fires a fixed key per aria-label and
// renders its children so option text is queryable; NumberField types
// through; TagGroup/Tag wire removal; Button exposes its variant via
// data-variant so the tertiary requirement is assertable.
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  let tagGroupOnRemove: ((keys: Set<unknown>) => void) | null = null;
  const TagImpl = (props: { id?: unknown; textValue?: string; children?: React.ReactNode }) =>
    React.createElement(
      'span',
      { 'data-mock': 'Tag', 'data-tag-id': props.id },
      props.children,
      React.createElement(
        'button',
        {
          type: 'button',
          'data-mock': 'Tag.RemoveButton',
          'aria-label': `Remove ${props.textValue ?? String(props.id)}`,
          onClick: () => tagGroupOnRemove?.(new Set([props.id])),
        },
        '×',
      ),
    );
  TagImpl.displayName = 'Tag';
  TagImpl.RemoveButton = TagImpl;
  const TagGroupImpl = (props: { onRemove?: (keys: Set<unknown>) => void; children?: React.ReactNode }) => {
    tagGroupOnRemove = props.onRemove ?? null;
    return React.createElement('div', { 'data-mock': 'TagGroup' }, props.children);
  };
  TagGroupImpl.displayName = 'TagGroup';
  TagGroupImpl.List = (props: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-mock': 'TagGroup.List' }, props.children);
  TagGroupImpl.List.displayName = 'TagGroup.List';
  const ComboBoxImpl = (props: {
    'aria-label'?: string;
    onSelectionChange?: (key: unknown) => void;
    children?: React.ReactNode;
  }) => {
    const label = props['aria-label'] ?? '';
    return React.createElement(
      'div',
      { 'data-mock': 'ComboBox' },
      React.createElement(
        'button',
        {
          'data-testid': `combobox-${label.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'button',
          // Read mockVariableCode at CLICK time (the module var is not React
          // state, so a render-time closure would freeze the first value).
          onClick: () =>
            props.onSelectionChange?.(
              label === 'Parent Aspect' ? 'asp-1'
              : label === 'Built-in values' ? 'PERIOD_MONTH_COUNT'
              : mockVariableCode,
            ),
        },
        label,
      ),
      props.children,
    );
  };
  ComboBoxImpl.displayName = 'ComboBox';
  ComboBoxImpl.InputGroup = actual.ComboBox.InputGroup;
  ComboBoxImpl.Trigger = actual.ComboBox.Trigger;
  ComboBoxImpl.Value = actual.ComboBox.Value;
  ComboBoxImpl.Popover = actual.ComboBox.Popover;
  return {
    ...actual,
    Button: (props: {
      'aria-label'?: string;
      variant?: string;
      type?: string;
      isDisabled?: boolean;
      onPress?: () => void;
      children?: React.ReactNode;
      className?: string;
    }) =>
      React.createElement(
        'button',
        {
          'data-mock': 'Button',
          'data-variant': props.variant ?? 'primary',
          type: props.type ?? 'button',
          disabled: props.isDisabled ?? undefined,
          'aria-label': props['aria-label'],
          className: props.className,
          onClick: props.onPress,
        },
        props.children,
      ),
    ComboBox: ComboBoxImpl,
    NumberField: (() => {
      const NumberFieldImpl = (props: {
        'aria-label'?: string;
        value?: number;
        variant?: string;
        onChange?: (value: unknown) => void;
        children?: React.ReactNode;
      }) =>
        React.createElement(
          'div',
          { 'data-mock': 'NumberField', ...(props.variant ? { 'data-variant': props.variant } : {}) },
          React.createElement('input', {
            'aria-label': props['aria-label'],
            'data-mock': 'NumberField.Input',
            type: 'number',
            value: props.value != null ? String(props.value) : '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange?.(e.target.value),
          }),
          props.children,
        );
      NumberFieldImpl.Group = actual.NumberField.Group;
      NumberFieldImpl.Input = actual.NumberField.Input;
      return NumberFieldImpl;
    })(),
    RadioGroup: (props: {
      value?: string;
      onChange?: (value: string) => void;
      children?: React.ReactNode;
    }) =>
      React.createElement(
        'div',
        { 'data-mock': 'RadioGroup' },
        React.createElement(
          'button',
          { 'data-testid': 'radio-higher', type: 'button', onClick: () => props.onChange?.('higher') },
          'Higher',
        ),
        React.createElement(
          'button',
          { 'data-testid': 'radio-lower', type: 'button', onClick: () => props.onChange?.('lower') },
          'Lower',
        ),
        props.children,
      ),
    Tag: TagImpl,
    TagGroup: TagGroupImpl,
    Select: (() => {
      const SelectImpl = (props: {
        'aria-label'?: string;
        onSelectionChange?: (key: string | number) => void;
        children?: React.ReactNode;
      }) => {
        const label = props['aria-label'] ?? '';
        const value = label === 'Type' ? 'INDICATOR' : mockYearValue;
        return React.createElement(
          'div',
          { 'data-mock': 'Select' },
          React.createElement(
            'button',
            {
              'data-testid': `select-${label.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'button',
              onClick: () => props.onSelectionChange?.(value),
            },
            label,
          ),
          props.children,
        );
      };
      SelectImpl.Trigger = actual.Select.Trigger;
      SelectImpl.Value = actual.Select.Value;
      SelectImpl.Indicator = actual.Select.Indicator;
      SelectImpl.Popover = actual.Select.Popover;
      return SelectImpl;
    })(),
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

let mockYearValue = '2026';
let mockVariableCode = 'ROI';

/* ── Sample data ── */

const aspect: CorporateKpiNode = {
  id: 'asp-1', parentId: null, parentName: null, code: 'FIN', name: 'Financial',
  nodeType: 'ASPECT', year: 2026, status: 'DRAFT', description: null,
  displayOrder: 0, formula: null, assessmentRules: null, weight: null, targetScore: null,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

const higherRules: AssessmentRule[] = [
  { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
  { lowerBound: 60, lowerInclusive: true, upperBound: 70, upperInclusive: false, score: 2 },
  { lowerBound: 70, lowerInclusive: true, upperBound: 80, upperInclusive: false, score: 3 },
  { lowerBound: 80, lowerInclusive: true, upperBound: 90, upperInclusive: false, score: 4 },
  { lowerBound: 90, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 5 },
];

const indicator: CorporateKpiNode = {
  ...aspect,
  id: 'ind-1',
  parentId: 'asp-1',
  parentName: 'Financial',
  code: 'F01',
  name: 'Revenue Growth',
  nodeType: 'INDICATOR',
  formula: 'ROI + NPM',
  assessmentRules: higherRules,
  weight: 0.25,
  targetScore: 80,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockYearValue = '2026';
  mockVariableCode = 'ROI';
  (useCorporateKpiData as jest.Mock).mockReturnValue({
    tree: [aspect], fetchTree: mockFetchTree, createNode: mockCreateNode,
    updateNode: mockUpdateNode, isMutating: false,
  });
  (corporateKpiApi.listBindings as jest.Mock).mockResolvedValue([]);
  (corporateKpiApi.createBinding as jest.Mock).mockResolvedValue({});
  (corporateKpiApi.deleteBinding as jest.Mock).mockResolvedValue(undefined);
  (variablesApi.list as jest.Mock).mockResolvedValue([
    { id: 'v1', code: 'ROI', name: 'Return on Investment', unit: '%', aggregationMode: 'SUM' },
    { id: 'v2', code: 'NPM', name: 'Net Profit Margin', unit: '%', aggregationMode: 'SUM' },
  ]);
});

async function fillBasicFields() {
  fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'F01' } });
  fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Revenue Growth' } });
}

async function fillHigherThresholds() {
  fireEvent.change(screen.getByLabelText('Threshold for score 5'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Threshold for score 4'), { target: { value: '80' } });
  fireEvent.change(screen.getByLabelText('Threshold for score 3'), { target: { value: '70' } });
  fireEvent.change(screen.getByLabelText('Threshold for score 2'), { target: { value: '60' } });
}

describe('Corporate KPI form — create', () => {
  it('renders the Add heading with Basic Information only for an Aspect', () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    expect(screen.getByText('Add Corporate KPI')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.queryByText('Formula Configuration')).not.toBeInTheDocument();
    expect(screen.queryByText('Score Configuration')).not.toBeInTheDocument();
  });

  it('shows indicator-only sections after switching the Type to Indicator', () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    expect(screen.getByText('Formula Configuration')).toBeInTheDocument();
    expect(screen.getByText('Score Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('combobox-parent-aspect')).toBeInTheDocument();
  });

  it('blocks submission until indicator prerequisites are valid', async () => {
    mockCreateNode.mockResolvedValue(aspect);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    await fillBasicFields();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockCreateNode).not.toHaveBeenCalled());
  });

  it('serializes the guided formula and generates higher-is-better rules on create', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    const onSuccess = jest.fn();
    render(<CorporateKpiForm mode="create" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
    await fillBasicFields();
    fireEvent.click(screen.getByTestId('combobox-parent-aspect'));

    // Formula: ROI + PERIOD_MONTH_COUNT (explicit Add after selecting)
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    fireEvent.click(screen.getByLabelText('Add +'));
    fireEvent.click(screen.getByTestId('combobox-built-in-values'));
    fireEvent.click(screen.getByLabelText('Add built-in value'));
    expect(screen.getByText('Return on Investment + months in the period')).toBeInTheDocument();
    expect(screen.queryByText('Formula is valid')).not.toBeInTheDocument();

    // Score rules: 5..1 higher-is-better
    await fillHigherThresholds();
    fireEvent.change(screen.getByLabelText('Sample result'), { target: { value: '85' } });
    expect(screen.getByText('4')).toBeInTheDocument(); // resulting score

    fireEvent.change(screen.getByPlaceholderText('e.g. 0.25 (25%)'), { target: { value: '0.25' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 80'), { target: { value: '80' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    const payload = mockCreateNode.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.nodeType).toBe('INDICATOR');
    expect(payload.year).toBe(2026);
    expect(payload.formula).toBe('ROI + PERIOD_MONTH_COUNT');
    expect(payload.assessmentRules).toEqual(higherRules);
    expect(payload.weight).toBe(0.25);
    expect(payload.targetScore).toBe(80);
    expect(payload.parentId).toBe('asp-1');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('generates lower-is-better ranges with inclusive upper bounds', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);

    fireEvent.click(screen.getByTestId('select-type'));
    await fillBasicFields();
    fireEvent.click(screen.getByTestId('combobox-parent-aspect'));
    fireEvent.click(screen.getByTestId('radio-lower'));

    fireEvent.change(screen.getByLabelText('Threshold for score 5'), { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 4'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 3'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 2'), { target: { value: '90' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    const payload = mockCreateNode.mock.calls[0][0] as { assessmentRules: AssessmentRule[] };
    expect(payload.assessmentRules).toEqual([
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: true, score: 5 },
      { lowerBound: 60, lowerInclusive: false, upperBound: 70, upperInclusive: true, score: 4 },
      { lowerBound: 70, lowerInclusive: false, upperBound: 80, upperInclusive: true, score: 3 },
      { lowerBound: 80, lowerInclusive: false, upperBound: 90, upperInclusive: true, score: 2 },
      { lowerBound: 90, lowerInclusive: false, upperBound: null, upperInclusive: false, score: 1 },
    ]);
  });

  it('blocks submission on gap/overlap thresholds (not strictly decreasing)', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);

    fireEvent.click(screen.getByTestId('select-type'));
    await fillBasicFields();
    fireEvent.click(screen.getByTestId('combobox-parent-aspect'));
    fireEvent.change(screen.getByLabelText('Threshold for score 5'), { target: { value: '80' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 4'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 3'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Threshold for score 2'), { target: { value: '60' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).not.toHaveBeenCalled());
    expect(screen.getAllByText(/strictly decreasing/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('guided formula builder interactions', () => {
  function renderIndicatorCreate() {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
  }

  it('selecting a variable does not add it until Add is pressed', async () => {
    renderIndicatorCreate();
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    expect(screen.queryByText('Return on Investment')).not.toBeInTheDocument();
    expect(
      screen.getByText('Add a variable, constant, built-in value, or operator to build the formula.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Add variable'));
    expect((await screen.findAllByText('Return on Investment')).length).toBeGreaterThanOrEqual(1);
  });

  it('Clear is disabled when empty and clears the whole formula', () => {
    renderIndicatorCreate();
    expect(screen.getByLabelText('Clear formula')).toBeDisabled();
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    expect(screen.getByLabelText('Clear formula')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Clear formula'));
    expect(
      screen.getByText('Add a variable, constant, built-in value, or operator to build the formula.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Clear formula')).toBeDisabled();
  });

  it('adds a constant through the NumberField and Add button', () => {
    renderIndicatorCreate();
    fireEvent.change(screen.getByLabelText('Formula constant'), { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText('Add constant'));
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
    // Invalid constants (not matching the backend grammar) are ignored
    fireEvent.change(screen.getByLabelText('Formula constant'), { target: { value: '-5' } });
    fireEvent.click(screen.getByLabelText('Add constant'));
    expect(screen.queryByText('-5')).not.toBeInTheDocument();
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
  });

  it('adds parentheses from the operator row', async () => {
    renderIndicatorCreate();
    fireEvent.click(screen.getByLabelText('Add ('));
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    fireEvent.click(screen.getByLabelText('Add )'));
    expect((await screen.findAllByText('( ROI )')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Formula is valid')).not.toBeInTheDocument();
  });

  it('removes tokens via the Tag remove button and flags dangling operators', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    await screen.findByText('Return on Investment + Net Profit Margin');

    // Remove the operator → adjacent operands are invalid
    fireEvent.click(screen.getByLabelText('Remove +'));
    expect(screen.getByText('Operands must be separated by an operator.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdateNode).not.toHaveBeenCalled());

    // Remove a variable token
    fireEvent.click(screen.getByLabelText('Remove Return on Investment'));
    expect(screen.getAllByText('Net Profit Margin').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Corporate KPI form — edit', () => {
  it('populates fields, formula tokens, and score rows without data loss', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    const onSuccess = jest.fn();
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={onSuccess} />);

    expect(screen.getByText('Edit Corporate KPI')).toBeInTheDocument();
    expect(screen.getByDisplayValue('F01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revenue Growth')).toBeInTheDocument();
    // Guided formula loaded from the stored formula — readable names (no system formula UI)
    expect(await screen.findByText('Return on Investment + Net Profit Margin')).toBeInTheDocument();
    expect(screen.queryByText(/System formula/i)).not.toBeInTheDocument();
    // Score rows populated from the stored rules (higher-is-better)
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    expect(mockUpdateNode.mock.calls[0][0]).toBe('ind-1');
    const payload = mockUpdateNode.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.formula).toBe('ROI + NPM');
    expect(payload.assessmentRules).toEqual(higherRules);
    expect(payload.weight).toBe(0.25);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('opens a parenthesized formula in Guided mode and preserves it', async () => {
    const parenFormula = { ...indicator, formula: '(ROI + NPM) / 2' };
    mockUpdateNode.mockResolvedValue(parenFormula);
    render(<CorporateKpiForm mode="edit" initialData={parenFormula} onSuccess={jest.fn()} />);

    // Guided mode is active; the readable formula renders the parenthesized tokens
    expect(await screen.findByText('( Return on Investment + Net Profit Margin ) ÷ 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    const payload = mockUpdateNode.mock.calls[0][1] as { formula: string };
    expect(payload.formula).toBe('( ROI + NPM ) / 2');
  });

  it('forces the Advanced rule editor for non-representable rules and preserves them', async () => {
    const nonRepresentable: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: false, upperBound: null, upperInclusive: false, score: 2 },
    ];
    const node = { ...indicator, assessmentRules: nonRepresentable };
    mockUpdateNode.mockResolvedValue(node);
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);

    // Opens in Advanced with the rules preserved exactly
    const jsonInput = screen.getByLabelText('Assessment rules JSON') as HTMLTextAreaElement;
    expect(JSON.parse(jsonInput.value)).toEqual(nonRepresentable);

    // Attempting Simple is blocked with a danger Alert; nothing is rewritten
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Simple'));
    expect(screen.getByText(/cannot be edited in simple mode/)).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Alert"]')).not.toBeNull();
    expect(screen.getByLabelText('Assessment rules JSON')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    const payload = mockUpdateNode.mock.calls[0][1] as { assessmentRules: AssessmentRule[] };
    expect(payload.assessmentRules).toEqual(nonRepresentable);
  });

  it('allows removing and adding score levels (dynamic rows)', async () => {
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    // Remove the first (score 5) level → 4 rows remain
    fireEvent.click(screen.getByLabelText('Remove score level 1'));
    expect(screen.queryByLabelText('Threshold for score 5')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Threshold for score 4')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Add score level'));
    expect(screen.getByLabelText('Score for level 5')).toBeInTheDocument();
  });

  it('lets the user switch to the Advanced JSON editor and back to Simple', async () => {
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Advanced'));
    const jsonInput = screen.getByLabelText('Assessment rules JSON') as HTMLTextAreaElement;
    expect(JSON.parse(jsonInput.value)).toEqual(higherRules);
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Simple'));
    expect(screen.getByLabelText('Threshold for score 5')).toBeInTheDocument();
  });
});

describe('refined formula/combobox UI', () => {
  it('renders Parent Aspect options as "Name • Code" (name first, no em dash)', async () => {
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    expect(await screen.findByText('Financial • FIN')).toBeInTheDocument();
    expect(screen.queryByText('FIN — Financial')).not.toBeInTheDocument();
  });

  it('renders Variable and Built-in Value options as "Name • CODE"', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
    expect(await screen.findByText('Return on Investment • ROI')).toBeInTheDocument();
    expect(screen.getByText('Net Profit Margin • NPM')).toBeInTheDocument();
    expect(screen.getByText('Months in the period • PERIOD_MONTH_COUNT')).toBeInTheDocument();
  });

  it('shows a visible Year validation error and blocks submission', async () => {
    mockYearValue = '1900';
    mockCreateNode.mockResolvedValue(aspect);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-year'));
    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText(/2000/)).toBeInTheDocument();
    await waitFor(() => expect(mockCreateNode).not.toHaveBeenCalled());
  });

  it('uses the tertiary variant for Add, Clear, and operator buttons', () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
    ['Add variable', 'Add constant', 'Add built-in value', 'Clear formula'].forEach((label) => {
      expect(screen.getByLabelText(label).getAttribute('data-variant')).toBe('tertiary');
    });
    ['Add +', 'Add −', 'Add ×', 'Add ÷', 'Add (', 'Add )'].forEach((label) => {
      expect(screen.getByLabelText(label).getAttribute('data-variant')).toBe('tertiary');
    });
  });

  it('renders the formula and readable surfaces with plain-text readable content', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    // Token chip + readable formula text
    expect((await screen.findAllByText('Return on Investment')).length).toBeGreaterThanOrEqual(1);
    // Formula surface + Readable formula surface
    expect(document.querySelectorAll('[data-mock="Surface"]').length).toBe(2);
    // No success text, no formula-status alert, no System formula
    expect(screen.queryByText('Formula is valid')).not.toBeInTheDocument();
    expect(screen.queryByText(/System formula/i)).not.toBeInTheDocument();
  });

  it('shows a danger Alert for an invalid formula and none for a valid one', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    await screen.findByText('Return on Investment + Net Profit Margin');
    // Valid → no alert
    expect(document.querySelector('[data-mock="Alert"]')).toBeNull();
    // Remove the operator → invalid → danger alert with the validator message
    fireEvent.click(screen.getByLabelText('Remove +'));
    expect(screen.getByText('Operands must be separated by an operator.')).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Alert"]')).not.toBeNull();
  });

  it('round-trips invalid-but-representable formulas between Advanced and Guided losslessly', async () => {
    const node = { ...indicator, formula: 'ACTIVE_DOMESTIC_CUSTOMER_COUNT )' };
    mockUpdateNode.mockResolvedValue(node);
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);

    // Opens in Guided mode with the same token sequence and a danger alert
    expect(await screen.findByText('ACTIVE_DOMESTIC_CUSTOMER_COUNT')).toBeInTheDocument();
    expect(screen.getByText(/unbalanced parentheses/)).toBeInTheDocument();

    // Guided → Advanced preserves the raw formula exactly
    fireEvent.click(within(screen.getByLabelText('Formula mode')).getByText('Advanced'));
    expect((screen.getByLabelText('Raw formula') as HTMLTextAreaElement).value).toBe(
      'ACTIVE_DOMESTIC_CUSTOMER_COUNT )',
    );

    // Advanced → Guided reconstructs the same token sequence (still invalid)
    fireEvent.click(within(screen.getByLabelText('Formula mode')).getByText('Guided'));
    expect(screen.getByText('ACTIVE_DOMESTIC_CUSTOMER_COUNT')).toBeInTheDocument();
    expect(screen.getByText(/unbalanced parentheses/)).toBeInTheDocument();

    // Guided → Advanced reproduces the same raw formula (no data loss)
    fireEvent.click(within(screen.getByLabelText('Formula mode')).getByText('Advanced'));
    expect((screen.getByLabelText('Raw formula') as HTMLTextAreaElement).value).toBe(
      'ACTIVE_DOMESTIC_CUSTOMER_COUNT )',
    );
  });

  it('keeps genuinely unsupported syntax in Advanced mode with an explanation', async () => {
    const node = { ...indicator, formula: 'roi + npm' };
    mockUpdateNode.mockResolvedValue(node);
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);

    // Advanced mode is active with the raw formula preserved
    expect((await screen.findByLabelText('Raw formula') as HTMLTextAreaElement).value).toBe('roi + npm');
    // Switching to Guided is blocked with a clear explanation and no data change
    fireEvent.click(within(screen.getByLabelText('Formula mode')).getByText('Guided'));
    expect(screen.getByText(/cannot be represented in Guided mode/)).toBeInTheDocument();
    expect((screen.getByLabelText('Raw formula') as HTMLTextAreaElement).value).toBe('roi + npm');
  });
});

describe('refined Score Configuration UI', () => {
  it('renders the score levels in a table with the copied column structure', async () => {
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    expect(screen.getByLabelText('Score levels')).toBeInTheDocument();
    expect(screen.getAllByText('Score').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Minimum result')).toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Table"]')).not.toBeNull();
    expect(document.querySelector('[data-mock="Table.ScrollContainer"]')).not.toBeNull();
    expect(document.querySelector('[data-mock="Table.Header"]')).not.toBeNull();
    expect(document.querySelector('[data-mock="Table.Body"]')).not.toBeNull();

    // All fields inside the score table use the secondary variant
    const tableFields = [...document.querySelectorAll('[data-mock="NumberField"]')].filter((nf) =>
      nf.closest('[data-mock="Table"]') !== null,
    );
    expect(tableFields.length).toBeGreaterThanOrEqual(9);
    for (const field of tableFields) {
      expect(field.getAttribute('data-variant')).toBe('secondary');
    }
    // The sample simulation field sits OUTSIDE the table and keeps the default variant
    const sampleField = screen.getByLabelText('Sample result').closest('[data-mock="NumberField"]') as HTMLElement;
    expect(sampleField.getAttribute('data-variant')).not.toBe('secondary');
  });

  it('switches the boundary column header for lower-is-better', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    expect(screen.getByText('Minimum result')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('radio-lower'));
    expect(screen.getByText('Maximum result')).toBeInTheDocument();
    expect(screen.queryByText('Minimum result')).not.toBeInTheDocument();
  });

  it('clears thresholds when the scoring direction changes (never silently retains)', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    fireEvent.change(screen.getByLabelText('Threshold for score 5'), { target: { value: '90' } });
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('radio-lower'));
    expect(screen.getByText(/thresholds were cleared/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('90')).not.toBeInTheDocument();
  });

  it('shows a danger Alert for duplicate scores and blocks submission', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    fireEvent.change(screen.getByLabelText('Score for level 2'), { target: { value: '5' } });
    expect(screen.getByText(/Scores must be unique/)).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Alert"]')).not.toBeNull();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockCreateNode).not.toHaveBeenCalled());
  });

  it('round-trips Simple → Advanced → Simple without changing rules or conditions', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    await fillBasicFields();
    fireEvent.click(screen.getByTestId('combobox-parent-aspect'));
    await fillHigherThresholds();
    expect(screen.getByText('90 or higher')).toBeInTheDocument();
    expect(screen.getByText('Below 60')).toBeInTheDocument();

    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Advanced'));
    expect(screen.getByLabelText('Assessment rules JSON')).toBeInTheDocument();
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Simple'));

    // Same table, same thresholds, same conditions restored
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.getByText('90 or higher')).toBeInTheDocument();
    expect(screen.getByText('Below 60')).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Alert"]')).toBeNull();

    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    const payload = mockCreateNode.mock.calls[0][0] as { assessmentRules: AssessmentRule[] };
    expect(payload.assessmentRules).toEqual(higherRules);
  });

  it('derives Simple rows after compatible Advanced edits', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Advanced'));
    const jsonInput = screen.getByLabelText('Assessment rules JSON') as HTMLTextAreaElement;
    const threeLevels: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 50, upperInclusive: false, score: 1 },
      { lowerBound: 50, lowerInclusive: true, upperBound: 80, upperInclusive: false, score: 4 },
      { lowerBound: 80, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 7 },
    ];
    fireEvent.change(jsonInput, { target: { value: JSON.stringify(threeLevels) } });
    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Simple'));

    // Derived: higher direction, scores 7/4/1, thresholds 80/50, correct conditions
    expect(screen.getByLabelText('Score for level 1')).toHaveValue(7);
    expect(screen.getByLabelText('Threshold for score 7')).toHaveValue(80);
    expect(screen.getByLabelText('Threshold for score 4')).toHaveValue(50);
    expect(screen.getByText('80 or higher')).toBeInTheDocument();
    expect(screen.getByText('50 to below 80')).toBeInTheDocument();
    expect(screen.getByText('Below 50')).toBeInTheDocument();
    expect(document.querySelector('[data-mock="Alert"]')).toBeNull();
  });

  it('shows the danger Alert for incompatible Advanced rules and preserves them', async () => {
    const incompatible: AssessmentRule[] = [
      { lowerBound: null, lowerInclusive: true, upperBound: 50, upperInclusive: false, score: 1 },
      { lowerBound: 60, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 2 },
    ];
    const node = { ...indicator, assessmentRules: incompatible };
    mockUpdateNode.mockResolvedValue(node);
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);
    const jsonInput = screen.getByLabelText('Assessment rules JSON') as HTMLTextAreaElement;
    expect(JSON.parse(jsonInput.value)).toEqual(incompatible);

    fireEvent.click(within(screen.getByLabelText('Score mode')).getByText('Simple'));
    expect(screen.getByText(/cannot be edited in simple mode/)).toBeInTheDocument();
    expect(screen.getByLabelText('Assessment rules JSON')).toBeInTheDocument();
    // Rules untouched
    expect(JSON.parse(jsonInput.value)).toEqual(incompatible);
  });

  it('removes the technical Advanced description', () => {
    render(<CorporateKpiForm mode="edit" initialData={indicator} onSuccess={jest.fn()} />);
    expect(screen.queryByText(/contiguous half-open ranges/)).not.toBeInTheDocument();
    expect(screen.queryByText(/first range is open below/)).not.toBeInTheDocument();
  });

  it('simulates the score at, below, and above thresholds', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    await fillHigherThresholds();
    const sample = screen.getByLabelText('Sample result');
    fireEvent.change(sample, { target: { value: '85' } });
    expect(screen.getByText('4')).toBeInTheDocument();
    fireEvent.change(sample, { target: { value: '90' } });
    expect(screen.getByText('5')).toBeInTheDocument();
    fireEvent.change(sample, { target: { value: '59' } });
    expect(screen.getByText('1')).toBeInTheDocument();
    fireEvent.change(sample, { target: { value: '60' } });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses the standard HeroUI RadioGroup with the label beside the indicator', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));

    // Standard RadioGroup + Radio composition (no custom controls)
    expect(document.querySelector('[data-mock="RadioGroup"]')).not.toBeNull();
    expect(screen.getByText('Scoring direction')).toBeInTheDocument();

    // Each option label sits beside its indicator in the same content row
    for (const label of ['Higher results receive higher scores', 'Lower results receive higher scores']) {
      const content = screen.getByText(label) as HTMLElement;
      expect(content.querySelector('[data-mock="Radio.Control"]')).not.toBeNull();
      expect(content.querySelector('[data-mock="Radio.Indicator"]')).not.toBeNull();
      // Inline row layout (the v3 default stacks them vertically)
      expect(content.className).toContain('flex-row');
    }

    // Both direction values remain selectable and drive rule generation
    fireEvent.click(screen.getByTestId('radio-lower'));
    expect(screen.getByText('Maximum result')).toBeInTheDocument();
  });

  it('places the danger Alert immediately above the Add score level button', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    fireEvent.change(screen.getByLabelText('Score for level 2'), { target: { value: '5' } });

    const alert = document.querySelector('[data-mock="Alert"]') as HTMLElement;
    const addRow = screen.getByText('Add score level').parentElement as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.parentElement).toBe(addRow.parentElement);
    expect(alert.nextElementSibling).toBe(addRow);
    // Not above the table, not below the button
    expect(alert.compareDocumentPosition(addRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not reserve an Alert when there is no error', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));
    await fillHigherThresholds();
    expect(document.querySelector('[data-mock="Alert"]')).toBeNull();
  });

  it('keeps the simulation outside a Surface and aligns Resulting score with the control row', async () => {
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId('select-type'));

    // The Sample Result NumberField is not wrapped in a Surface/card
    const sample = screen.getByLabelText('Sample result');
    expect(sample.closest('[data-mock="Surface"]')).toBeNull();

    // Resulting score shares the dedicated control row with the NumberField
    // control; the field label lives OUTSIDE that row
    const scoreSpan = screen.getByText((content, el) => el?.tagName === 'SPAN' && content.startsWith('Resulting score'));
    const row = scoreSpan.parentElement as HTMLElement;
    expect(row.querySelector('[data-mock="NumberField.Group"]')).not.toBeNull();
    expect(within(row).queryByText('Sample result')).toBeNull();

    // Simulation still reflects the submitted rules (85 → 4)
    await fillHigherThresholds();
    fireEvent.change(screen.getByLabelText('Sample result'), { target: { value: '85' } });
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

/* ── Indicator-variable binding sync (regression: activation needs bindings) ── */

describe('Corporate KPI form — variable bindings', () => {
  it('creates bindings for every formula variable on create (built-in excluded)', async () => {
    mockCreateNode.mockResolvedValue(indicator);
    const onSuccess = jest.fn();
    render(<CorporateKpiForm mode="create" onSuccess={onSuccess} />);

    fireEvent.click(screen.getByTestId('select-type')); // INDICATOR
    await fillBasicFields();
    fireEvent.click(screen.getByTestId('combobox-parent-aspect'));

    // Formula: ROI + NPM + PERIOD_MONTH_COUNT
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    fireEvent.click(screen.getByLabelText('Add +'));
    mockVariableCode = 'NPM';
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    fireEvent.click(screen.getByLabelText('Add +'));
    fireEvent.click(screen.getByTestId('combobox-built-in-values'));
    fireEvent.click(screen.getByLabelText('Add built-in value'));

    await fillHigherThresholds();
    fireEvent.change(screen.getByPlaceholderText('e.g. 0.25 (25%)'), { target: { value: '0.25' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 80'), { target: { value: '80' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(corporateKpiApi.createBinding).toHaveBeenCalledTimes(2));
    expect(corporateKpiApi.listBindings).toHaveBeenCalledWith('ind-1');
    expect(corporateKpiApi.createBinding).toHaveBeenCalledWith({
      indicatorId: 'ind-1',
      variableId: 'v1',
      displayOrder: 0,
    });
    expect(corporateKpiApi.createBinding).toHaveBeenCalledWith({
      indicatorId: 'ind-1',
      variableId: 'v2',
      displayOrder: 1,
    });
    // The built-in PERIOD_MONTH_COUNT is never bound
    expect(corporateKpiApi.deleteBinding).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('preserves existing bindings and binds only the newly referenced variable on edit', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    const node = { ...indicator, formula: 'ROI' };
    // Stateful binding store mirroring the backend: createBinding pushes a new
    // row so the post-PUT sync sees it (a static listBindings stub would
    // re-create the binding on the second sync).
    const bindingStore = [
      { id: 'b1', indicatorId: 'ind-1', variableId: 'v1', variableCode: 'ROI', variableName: 'Return on Investment', displayOrder: 0 },
    ];
    (corporateKpiApi.listBindings as jest.Mock).mockImplementation(async () => [...bindingStore]);
    (corporateKpiApi.createBinding as jest.Mock).mockImplementation(
      async (payload: { variableId: string; displayOrder: number }) => {
        const binding = {
          id: `new-${payload.variableId}`,
          indicatorId: 'ind-1',
          variableId: payload.variableId,
          variableCode: payload.variableId === 'v1' ? 'ROI' : 'NPM',
          variableName: payload.variableId === 'v1' ? 'Return on Investment' : 'Net Profit Margin',
          displayOrder: payload.displayOrder,
        };
        bindingStore.push(binding);
        return binding;
      },
    );
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);

    // Wait for the variables list to load (tag labels switch from codes to names)
    await screen.findByLabelText('Remove Return on Investment');

    // Formula: ROI + NPM
    mockVariableCode = 'NPM';
    fireEvent.click(screen.getByTestId('combobox-formula-variable'));
    fireEvent.click(screen.getByLabelText('Add +'));
    fireEvent.click(screen.getByLabelText('Add variable'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(corporateKpiApi.createBinding).toHaveBeenCalledTimes(1));
    expect(corporateKpiApi.createBinding).toHaveBeenCalledWith({
      indicatorId: 'ind-1',
      variableId: 'v2',
      displayOrder: 1,
    });
    // ROI stays bound — nothing unlinked
    expect(corporateKpiApi.deleteBinding).not.toHaveBeenCalled();
  });

  it('unlinks bindings whose variable left the formula on edit', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    const node = { ...indicator, formula: 'ROI + NPM' };
    const bindingStore = [
      { id: 'b1', indicatorId: 'ind-1', variableId: 'v1', variableCode: 'ROI', variableName: 'Return on Investment', displayOrder: 0 },
      { id: 'b2', indicatorId: 'ind-1', variableId: 'v2', variableCode: 'NPM', variableName: 'Net Profit Margin', displayOrder: 1 },
    ];
    (corporateKpiApi.listBindings as jest.Mock).mockImplementation(async () => [...bindingStore]);
    (corporateKpiApi.deleteBinding as jest.Mock).mockImplementation(async (id: string) => {
      const index = bindingStore.findIndex((binding) => binding.id === id);
      if (index >= 0) bindingStore.splice(index, 1);
    });
    render(<CorporateKpiForm mode="edit" initialData={node} onSuccess={jest.fn()} />);

    // Remove NPM and its trailing operator from the canvas → formula becomes ROI
    fireEvent.click(await screen.findByLabelText('Remove Net Profit Margin'));
    fireEvent.click(screen.getByLabelText('Remove +'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(corporateKpiApi.deleteBinding).toHaveBeenCalledWith('b2'));
    expect(corporateKpiApi.createBinding).not.toHaveBeenCalled();
  });

  it('never touches bindings when saving an Aspect', async () => {
    mockCreateNode.mockResolvedValue(aspect);
    render(<CorporateKpiForm mode="create" onSuccess={jest.fn()} />);

    await fillBasicFields();
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    expect(corporateKpiApi.listBindings).not.toHaveBeenCalled();
    expect(corporateKpiApi.createBinding).not.toHaveBeenCalled();
    expect(corporateKpiApi.deleteBinding).not.toHaveBeenCalled();
  });
});
