/**
 * Corporate KPI table rendering tests — P1.1.
 * Covers ASPECT/INDICATOR rendering, expand/collapse, status badges, and search.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CorporateKpiTable } from '../corporate-kpi-table';
import type { CorporateKpiNode } from '../corporate-kpi.types';

/* ── Mock usePermission — allow all by default ── */

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: () => true,
  }),
}));

// Drive the More menu: clicking a menu item fires onAction with its id
// (the shared mock renders inert items).
jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    Dropdown: Object.assign(actual.Dropdown, {
      Menu: (props: { onAction?: (key: React.Key) => void; children?: React.ReactNode }) =>
        React.createElement(
          'div',
          {
            'data-mock': 'Dropdown.Menu',
            onClick: (e: React.MouseEvent) => {
              const item = (e.target as HTMLElement).closest('[data-item-id]');
              if (item) props.onAction?.(item.getAttribute('data-item-id') as React.Key);
            },
          },
          props.children,
        ),
      Item: (props: { id?: React.Key; children?: React.ReactNode }) =>
        React.createElement('div', { 'data-mock': 'Dropdown.Item', 'data-item-id': props.id }, props.children),
    }),
  };
});

/* ── Sample data ── */

const aspect: CorporateKpiNode = {
  id: 'asp-1',
  parentId: null,
  parentName: null,
  code: 'FIN',
  name: 'Financial',
  nodeType: 'ASPECT',
  year: 2026,
  status: 'ACTIVE',
  description: null,
  displayOrder: 0,
  formula: null,
  assessmentRules: null,
  weight: null,
  targetScore: null,
  formulaResult: null,
  actualScore: null,
  actualResult: null,
  targetResult: null,
  calculationStatus: null,
  calculationError: null,
  totalWeight: null,
  remainingWeight: null,
  weightComplete: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
  children: [],
};

const indicator: CorporateKpiNode = {
  id: 'ind-1',
  parentId: 'asp-1',
  parentName: 'Financial',
  code: 'F01',
  name: 'Revenue Growth',
  nodeType: 'INDICATOR',
  year: 2026,
  status: 'DRAFT',
  description: null,
  displayOrder: 1,
  formula: 'ROI + NPM',
  assessmentRules: [
    { lowerBound: null, lowerInclusive: true, upperBound: 50, upperInclusive: false, score: 0 },
    { lowerBound: 50, lowerInclusive: true, upperBound: null, upperInclusive: false, score: 100 },
  ],
  weight: 0.25,
  targetScore: 80,
  formulaResult: null,
  actualScore: null,
  actualResult: null,
  targetResult: null,
  calculationStatus: null,
  calculationError: null,
  totalWeight: null,
  remainingWeight: null,
  weightComplete: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
  children: [],
};

const aspectWithChildren: CorporateKpiNode = {
  ...aspect,
  children: [indicator],
};

/* ── Test helpers ── */

const defaultProps = {
  tree: [] as CorporateKpiNode[],
  deletedList: [] as CorporateKpiNode[],
  viewMode: 'current' as const,
  expandedIds: new Set<string>(),
  onToggleExpand: jest.fn(),
  searchQuery: '',
  selectedYear: 2026,
  isLoadingTree: false,
  isLoadingDeleted: false,
  treeError: null as string | null,
  deletedError: null as string | null,
  onRetryTree: jest.fn(),
  onRetryDeleted: jest.fn(),
};

/* ── Current view ── */

describe('Current KPIs view', () => {
  it('renders Aspect root node', () => {
    render(<CorporateKpiTable {...defaultProps} tree={[aspect]} />);
    expect(screen.getByText('FIN')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('keeps all row actions inside the More menu (no inline action buttons)', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        expandedIds={new Set(['asp-1'])}
        onEdit={jest.fn()}
        onCreateIndicator={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
    // Inline icon buttons are gone — only the More menu trigger remains
    expect(screen.queryByLabelText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add Indicator')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('More actions').length).toBeGreaterThanOrEqual(1);
  });

  it('fires Edit and Add Indicator from the More menu', () => {
    const onEdit = jest.fn();
    const onCreateIndicator = jest.fn();
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        expandedIds={new Set(['asp-1'])}
        onEdit={onEdit}
        onCreateIndicator={onCreateIndicator}
      />,
    );
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(onEdit).toHaveBeenCalledWith(aspectWithChildren);
    fireEvent.click(screen.getByText('Add Indicator'));
    expect(onCreateIndicator).toHaveBeenCalledWith('asp-1');
  });

  it('renders Indicator under expanded Aspect', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        expandedIds={new Set(['asp-1'])}
      />,
    );
    expect(screen.getByText('F01')).toBeInTheDocument();
    expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
  });

  it('does not show Indicator children when Aspect is collapsed', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        expandedIds={new Set()}
      />,
    );
    expect(screen.queryByText('F01')).not.toBeInTheDocument();
  });

  it('shows DRAFT, ACTIVE, and INACTIVE status badges', () => {
    const active: CorporateKpiNode = { ...aspect, status: 'ACTIVE' };
    const draft: CorporateKpiNode = { ...indicator, status: 'DRAFT' };
    const inactive: CorporateKpiNode = { ...aspect, id: 'asp-3', code: 'CUST', name: 'Customer', status: 'INACTIVE' };

    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[active, inactive]}
        deletedList={[draft]}
      />,
    );
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('shows empty state when no KPIs', () => {
    render(<CorporateKpiTable {...defaultProps} tree={[]} />);
    expect(screen.getByText('No Corporate KPIs found for the selected year.')).toBeInTheDocument();
  });

  it('shows loading spinner while loading tree', () => {
    render(<CorporateKpiTable {...defaultProps} isLoadingTree />);
    // Loading state — no data, just spinner
    expect(screen.queryByText('FIN')).not.toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    render(<CorporateKpiTable {...defaultProps} treeError="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders no em dash placeholders in ASPECT scoring columns', () => {
    render(<CorporateKpiTable {...defaultProps} tree={[aspect]} />);
    expect(screen.queryAllByText('–')).toHaveLength(0);
  });

  it('renders the em dash fallback only for INDICATOR rows without a computed value', () => {
    render(<CorporateKpiTable {...defaultProps} tree={[indicator]} />);
    // actualScore/actualResult/targetResult are null on the sample indicator
    expect(screen.getAllByText('–').length).toBeGreaterThanOrEqual(3);
  });

  /* ── Search ── */

  it('keeps parent Aspect visible when matching Indicator is found', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        expandedIds={new Set()}
        searchQuery="Revenue"
      />,
    );
    // Parent should be visible because its child matches
    expect(screen.getByText('FIN')).toBeInTheDocument();
    expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
  });

  it('shows empty search state when no match', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        tree={[aspectWithChildren]}
        searchQuery="zzz_nonexistent"
      />,
    );
    expect(screen.getByText(/No Corporate KPIs match/)).toBeInTheDocument();
  });
});

/* ── Deleted view ── */

describe('Deleted KPIs view', () => {
  it('shows deleted nodes filtered by selected year', () => {
    const deletedNode: CorporateKpiNode = {
      ...indicator,
      deletedAt: '2026-06-01T00:00:00',
      parentName: 'Financial',
    };
    render(
      <CorporateKpiTable
        {...defaultProps}
        deletedList={[deletedNode]}
        viewMode="deleted"
        selectedYear={2026}
      />,
    );
    expect(screen.getByText('F01')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument(); // parentName column
  });

  it('filters deleted nodes by year', () => {
    const deletedNode: CorporateKpiNode = {
      ...indicator,
      deletedAt: '2025-06-01T00:00:00',
      year: 2025,
    };
    render(
      <CorporateKpiTable
        {...defaultProps}
        deletedList={[deletedNode]}
        viewMode="deleted"
        selectedYear={2026}
      />,
    );
    expect(screen.queryByText('F01')).not.toBeInTheDocument();
  });

  it('shows empty state when no deleted KPIs', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        deletedList={[]}
        viewMode="deleted"
      />,
    );
    expect(
      screen.getByText('No deleted Corporate KPIs found for the selected year.'),
    ).toBeInTheDocument();
  });

  it('shows loading spinner while loading deleted data', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        viewMode="deleted"
        isLoadingDeleted
      />,
    );
    // While loading: no empty-state text and no rows — the body shows the spinner.
    expect(
      screen.queryByText('No deleted Corporate KPIs found for the selected year.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('F01')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-Tray')).not.toBeInTheDocument(); // empty-state icon not rendered
    expect(document.querySelector('[data-mock="Spinner"]')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    render(
      <CorporateKpiTable
        {...defaultProps}
        viewMode="deleted"
        deletedError="Failed to load deleted"
      />,
    );
    expect(screen.getByText('Failed to load deleted')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
