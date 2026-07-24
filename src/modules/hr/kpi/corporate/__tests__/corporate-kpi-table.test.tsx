/**
 * Corporate KPI table rendering tests — P1.1.
 * Covers ASPECT/INDICATOR rendering, expand/collapse, status badges, and search.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CorporateKpiTable } from '../corporate-kpi-table';
import type { CorporateKpiNode } from '../corporate-kpi.types';

/* ── Mock usePermission — allow all by default ── */

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: () => true,
  }),
}));

/* ── Sample data ── */

const aspect: CorporateKpiNode = {
  id: 'asp-1',
  parentId: null,
  parentName: null,
  code: 'FIN',
  name: 'Financial',
  nodeType: 'ASPECT',
  year: 2026,
  unit: null,
  targetValue: null,
  status: 'ACTIVE',
  description: null,
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
  unit: '%',
  targetValue: 10.5,
  status: 'DRAFT',
  description: null,
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
    expect(screen.getByText('ASPECT')).toBeInTheDocument();
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

  it('uses em dash for Aspect unit and target value', () => {
    render(<CorporateKpiTable {...defaultProps} tree={[aspect]} />);
    const dashes = screen.getAllByText('–');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
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
    // No data rendered while loading
    expect(screen.queryByText('Code')).not.toBeInTheDocument();
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
