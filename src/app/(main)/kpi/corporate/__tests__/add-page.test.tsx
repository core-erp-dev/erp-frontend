/**
 * Add Corporate KPI page tests — manage guard, heading, query-param
 * preselects (type/parentId), and navigation after a successful save.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddCorporateKpiPage from '@/app/(main)/kpi/corporate/add/page';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { corporateKpiStructuresApi } from '@/modules/kpi/corporate/corporate-kpi-structures-api';
import { variablesApi } from '@/modules/kpi/corporate/variables/variables-api';
import type { CorporateKpiNode, CorporateKpiStructure } from '@/modules/kpi/corporate/corporate-kpi.types';

jest.mock('@/modules/kpi/corporate/use-corporate-kpi-data');
jest.mock('@/modules/kpi/corporate/corporate-kpi-structures-api');
jest.mock('@/modules/kpi/corporate/variables/variables-api');

const mockCreateNode = jest.fn().mockResolvedValue(null);
const mockFetchTree = jest.fn().mockResolvedValue(undefined);

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: () => mockHasManage }),
}));

let mockHasManage = true;

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace, refresh: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    ComboBox: (() => {
      const ComboBoxImpl = (props: { 'aria-label'?: string; onSelectionChange?: (key: unknown) => void }) =>
        React.createElement(
          'button',
          {
            'data-testid': `combobox-${(props['aria-label'] ?? '').toLowerCase().replace(/\s+/g, '-')}`,
            type: 'button',
            onClick: () => props.onSelectionChange?.('asp-1'),
          },
          props['aria-label'] ?? 'ComboBox',
        );
      ComboBoxImpl.InputGroup = actual.ComboBox.InputGroup;
      ComboBoxImpl.Trigger = actual.ComboBox.Trigger;
      ComboBoxImpl.Value = actual.ComboBox.Value;
      ComboBoxImpl.Popover = actual.ComboBox.Popover;
      return ComboBoxImpl;
    })(),
    Select: (props: { 'aria-label'?: string; onSelectionChange?: (key: string | number) => void }) => {
      const label = props['aria-label'] ?? '';
      const value = label === 'Type' ? 'INDICATOR' : label === 'Structure' ? 'struct-2026' : '2026';
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

const sampleStructure: CorporateKpiStructure = {
  id: 'struct-2026',
  year: 2026,
  status: 'DRAFT',
  activatedAt: null,
  activatedBy: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const aspect: CorporateKpiNode = {
  id: 'asp-1', structureId: 'struct-2026', parentId: null, parentName: null, code: 'FIN', name: 'Financial',
  nodeType: 'ASPECT', year: 2026, description: null,
  displayOrder: 0, formula: null, assessmentRules: null, weight: null, targetScore: null,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHasManage = true;
  mockSearchParams = new URLSearchParams();
  (useCorporateKpiData as jest.Mock).mockReturnValue({
    tree: [aspect], fetchTree: mockFetchTree, createNode: mockCreateNode, updateNode: jest.fn(), isMutating: false,
  });
  (corporateKpiStructuresApi.list as jest.Mock).mockResolvedValue([sampleStructure]);
  (corporateKpiStructuresApi.getById as jest.Mock).mockResolvedValue(sampleStructure);
  (variablesApi.list as jest.Mock).mockResolvedValue([
    { id: 'v1', code: 'ROI', name: 'Return on Investment', unit: '%', aggregationMode: 'SUM' },
  ]);
});

describe('Add Corporate KPI page', () => {
  it('shows access denied without manage permission', () => {
    mockHasManage = false;
    render(<AddCorporateKpiPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders the Add heading with the form sections', async () => {
    render(<AddCorporateKpiPage />);
    expect(await screen.findByRole('heading', { name: 'Add Corporate KPI' })).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  it('preselects Indicator type and parent from the query params', async () => {
    mockSearchParams = new URLSearchParams('type=INDICATOR&parentId=asp-1');
    render(<AddCorporateKpiPage />);
    // Indicator-only sections render immediately
    expect(await screen.findByText('Formula Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('combobox-parent-aspect')).toBeInTheDocument();
  });

  it('creates an Aspect and navigates back to the Structure page', async () => {
    mockCreateNode.mockResolvedValue(aspect);
    render(<AddCorporateKpiPage />);
    await screen.findByRole('heading', { name: 'Add Corporate KPI' });

    fireEvent.click(screen.getByTestId('select-structure')); // structure: struct-2026
    fireEvent.change(screen.getByPlaceholderText('e.g. FIN'), { target: { value: 'FIN' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Financial'), { target: { value: 'Financial' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockCreateNode).toHaveBeenCalledTimes(1));
    const payload = mockCreateNode.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.nodeType).toBe('ASPECT');
    expect(payload.structureId).toBe('struct-2026');
    expect(payload.formula).toBeNull();
    expect(payload.assessmentRules).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/kpi/corporate/asp-1');
  });
});
