import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CorporateKpiTree } from '../corporate-kpi-tree';
import type { CorporateKpiResponse } from '../../types';

// Mock data matching CorporateKpiResponse interface
const createMockKpi = (overrides: Partial<CorporateKpiResponse> = {}): CorporateKpiResponse => ({
  id: '1',
  indicatorCode: 'CK-001',
  indicatorName: 'KPI Korporat',
  parentId: null,
  parentName: null,
  children: [],
  formulaComponent1: null,
  formulaComponent2: null,
  formulaComponent3: null,
  formulaExpression: null,
  achievementValue: 0,
  weight: 100,
  score: 0,
  result: 0,
  businessTarget: 0,
  periodYear: 2026,
  linkedTaskCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('CorporateKpiTree', () => {
  const defaultProps = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    canEdit: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders tree with root nodes', () => {
    const mockData = [createMockKpi()];

    render(<CorporateKpiTree data={mockData} {...defaultProps} />);

    expect(screen.getByText('CK-001')).toBeInTheDocument();
    expect(screen.getByText('KPI Korporat')).toBeInTheDocument();
  });

  test('renders nested children when expanded', () => {
    const childKpi = createMockKpi({
      id: '2',
      indicatorCode: 'CK-001-01',
      indicatorName: 'Child KPI',
    });
    const parentKpi = createMockKpi({
      id: '1',
      indicatorCode: 'CK-001',
      indicatorName: 'Parent KPI',
      children: [childKpi],
    });

    render(<CorporateKpiTree data={[parentKpi]} {...defaultProps} />);

    // Parent should be visible
    expect(screen.getByText('CK-001')).toBeInTheDocument();
    expect(screen.getByText('Parent KPI')).toBeInTheDocument();

    // Child should be visible (tree is expanded by default)
    expect(screen.getByText('CK-001-01')).toBeInTheDocument();
    expect(screen.getByText('Child KPI')).toBeInTheDocument();
  });

  test('hides action buttons when canEdit is false', () => {
    const mockData = [createMockKpi()];

    render(<CorporateKpiTree data={mockData} {...defaultProps} canEdit={false} />);

    // Edit and Delete buttons should not be in the document
    expect(screen.queryByLabelText(/Edit/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Hapus/)).not.toBeInTheDocument();
  });

  test('shows action buttons when canEdit is true', () => {
    const mockData = [createMockKpi()];

    render(<CorporateKpiTree data={[mockData[0]]} {...defaultProps} canEdit={true} />);

    // Edit button should be in the document
    expect(screen.getByLabelText('Edit KPI Korporat')).toBeInTheDocument();
  });

  test('disables delete button when linkedTaskCount > 0', () => {
    const mockData = [createMockKpi({ linkedTaskCount: 5 })];

    render(<CorporateKpiTree data={mockData} {...defaultProps} canEdit={true} />);

    // Delete button should be disabled
    const deleteButton = screen.getByLabelText(/Hapus/);
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
  });
});
