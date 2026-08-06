/**
 * Edit Corporate KPI page tests — manage guard, loading/error states,
 * data population, and navigation after a successful update.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditCorporateKpiPage from '@/app/(main)/kpi/corporate/[id]/edit/page';
import { useCorporateKpiData } from '@/modules/kpi/corporate/use-corporate-kpi-data';
import { variablesApi } from '@/modules/kpi/corporate/variables/variables-api';
import { corporateKpiApi } from '@/modules/kpi/corporate/corporate-kpi-api';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

jest.mock('@/modules/kpi/corporate/use-corporate-kpi-data');
jest.mock('@/modules/kpi/corporate/variables/variables-api');
jest.mock('@/modules/kpi/corporate/corporate-kpi-api', () => ({
  corporateKpiApi: {
    getById: jest.fn(),
    listBindings: jest.fn(),
    createBinding: jest.fn(),
    deleteBinding: jest.fn(),
  },
  extractKpiError: jest.fn(() => 'Failed to load Corporate KPIs.'),
}));

const mockedApi = jest.mocked(corporateKpiApi);
const mockUpdateNode = jest.fn().mockResolvedValue(null);
const mockFetchTree = jest.fn().mockResolvedValue(undefined);

const mockPush = jest.fn();

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: () => mockHasManage }),
}));

let mockHasManage = true;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  useParams: () => ({ id: 'ind-1' }),
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    Select: (props: { 'aria-label'?: string; onSelectionChange?: (key: string | number) => void }) => {
      const label = props['aria-label'] ?? '';
      return React.createElement(
        'button',
        {
          'data-testid': `select-${label.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'button',
          onClick: () => props.onSelectionChange?.('asp-1'),
        },
        label,
      );
    },
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

const indicator: CorporateKpiNode = {
  id: 'ind-1', parentId: 'asp-1', parentName: 'Financial', code: 'F01', name: 'Revenue Growth',
  nodeType: 'INDICATOR', year: 2026, status: 'DRAFT', description: null,
  displayOrder: 0, formula: 'ROI + NPM', assessmentRules: [
    { lowerBound: null, lowerInclusive: true, upperBound: 60, upperInclusive: false, score: 1 },
    { lowerBound: 60, lowerInclusive: true, upperBound: 70, upperInclusive: false, score: 2 },
    { lowerBound: 70, lowerInclusive: true, upperBound: 80, upperInclusive: false, score: 3 },
    { lowerBound: 80, lowerInclusive: true, upperBound: 90, upperInclusive: false, score: 4 },
    { lowerBound: 90, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 5 },
  ], weight: 0.25, targetScore: 80,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHasManage = true;
  (useCorporateKpiData as jest.Mock).mockReturnValue({
    tree: [{ ...indicator, nodeType: 'ASPECT', code: 'FIN', name: 'Financial', children: [] }],
    fetchTree: mockFetchTree,
    createNode: jest.fn(),
    updateNode: mockUpdateNode,
    isMutating: false,
  });
  (variablesApi.list as jest.Mock).mockResolvedValue([
    { id: 'v1', code: 'ROI', name: 'Return on Investment', unit: '%', aggregationMode: 'SUM' },
    { id: 'v2', code: 'NPM', name: 'Net Profit Margin', unit: '%', aggregationMode: 'SUM' },
  ]);
  mockedApi.getById.mockResolvedValue(indicator);
  mockedApi.listBindings.mockResolvedValue([]);
  mockedApi.createBinding.mockResolvedValue({} as never);
  mockedApi.deleteBinding.mockResolvedValue(undefined);
});

describe('Edit Corporate KPI page', () => {
  it('shows access denied without manage permission', () => {
    mockHasManage = false;
    render(<EditCorporateKpiPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('loads the node and populates the edit form', async () => {
    render(<EditCorporateKpiPage />);
    expect(await screen.findByRole('heading', { name: 'Edit Corporate KPI' })).toBeInTheDocument();
    expect(mockedApi.getById).toHaveBeenCalledWith('ind-1');
    expect(screen.getByDisplayValue('F01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revenue Growth')).toBeInTheDocument();
    expect(await screen.findByText('Return on Investment + Net Profit Margin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument(); // prefilled score threshold
  });

  it('shows an error alert when the node cannot be loaded', async () => {
    mockedApi.getById.mockRejectedValue(new Error('Corporate KPI not found'));
    render(<EditCorporateKpiPage />);
    expect(await screen.findByText(/Failed to load Corporate KPIs/)).toBeInTheDocument();
  });

  it('updates the node and navigates back to the Structure page', async () => {
    mockUpdateNode.mockResolvedValue(indicator);
    render(<EditCorporateKpiPage />);
    await screen.findByRole('heading', { name: 'Edit Corporate KPI' });
    await screen.findByText('Return on Investment + Net Profit Margin');

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    expect(mockUpdateNode.mock.calls[0][0]).toBe('ind-1');
    const payload = mockUpdateNode.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.formula).toBe('ROI + NPM');
    expect(mockPush).toHaveBeenCalledWith('/kpi/corporate');
  });
});
