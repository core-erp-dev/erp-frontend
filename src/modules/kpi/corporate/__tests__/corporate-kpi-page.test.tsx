/**
 * Corporate KPI page orchestration tests (structure lifecycle).
 * Covers permissions (read/manage), structure-driven year selection,
 * empty-structure state + Create Structure flow, page-level ACTIVE lifecycle,
 * current/deleted view toggle, lazy deleted fetch, and tree expansion.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KpiCorporatePage from '@/app/(main)/kpi/corporate/page';
import { corporateKpiApi } from '../corporate-kpi-api';
import { corporateKpiStructuresApi } from '../corporate-kpi-structures-api';
import type { CorporateKpiNode, CorporateKpiStructure } from '../corporate-kpi.types';

/* ── Mock dependencies ── */

jest.mock('../corporate-kpi-api');
const mockedApi = jest.mocked(corporateKpiApi);

jest.mock('../corporate-kpi-structures-api');
const mockedStructuresApi = jest.mocked(corporateKpiStructuresApi);

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/kpi/corporate',
  useSearchParams: () => new URLSearchParams(),
}));

let mockPermissions: Record<string, boolean> = {};
let mockYearValue = '2026';
let mockSourceYearValue = '2025';

jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({
    hasPerm: (perm: string) => mockPermissions[perm] ?? false,
  }),
}));

jest.mock('@heroui/react', () => {
  const actual = jest.requireActual('@heroui/react');
  const React = jest.requireActual('react');
  return {
    ...actual,
    // Select fires a fixed selection per aria-label (the shared mock is inert):
    // the target-year Select ("Year") and the copy-mode "Source Year" Select.
    Select: (() => {
      const SelectImpl = (props: {
        'aria-label'?: string;
        onSelectionChange?: (key: string | number) => void;
        children?: React.ReactNode;
      }) => {
        const label = props['aria-label'] ?? '';
        const value = label === 'Source Year' ? mockSourceYearValue : mockYearValue;
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

/* ── Sample data ── */

const currentYear = new Date().getFullYear();

const sampleStructure: CorporateKpiStructure = {
  id: 'struct-current',
  year: currentYear,
  status: 'DRAFT',
  activatedAt: null,
  activatedBy: null,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

const sampleNode: CorporateKpiNode = {
  id: 'asp-1', structureId: 'struct-current', parentId: null, parentName: null, code: 'FIN', name: 'Financial',
  nodeType: 'ASPECT', year: currentYear, description: null,
  displayOrder: 0, formula: null, assessmentRules: null, weight: null, targetScore: null,
  formulaResult: null, actualScore: null, actualResult: null, targetResult: null,
  calculationStatus: null, calculationError: null,
  totalWeight: null, remainingWeight: null, weightComplete: null,
  deletedAt: null, createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00', children: [],
};

/* ── Setup ── */

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = {};
  mockYearValue = String(currentYear);
  mockSourceYearValue = String(currentYear - 1);
  mockedApi.getTreeByYear.mockResolvedValue([]);
  mockedApi.getDeleted.mockResolvedValue([]);
  mockedApi.create.mockResolvedValue(sampleNode);
  mockedApi.update.mockResolvedValue(sampleNode);
  mockedStructuresApi.list.mockResolvedValue([sampleStructure]);
  mockedStructuresApi.create.mockResolvedValue(sampleStructure);
  mockedStructuresApi.changeStatus.mockResolvedValue({ ...sampleStructure, status: 'ACTIVE' });
});

/* ── Permissions: read ── */

describe('read permissions', () => {
  it('renders title', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByRole('heading', { name: 'Corporate KPI Structure' })).toBeInTheDocument();
  });

  it('shows access denied without read permission', () => {
    mockPermissions = {};
    render(<KpiCorporatePage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('hides the Deleted toggle without manage', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('shows the Deleted toggle with manage', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });
});

/* ── Permissions: manage ── */

describe('manage permissions', () => {
  it('read-only user sees no mutation actions', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await screen.findByText('Month');
    expect(screen.queryByText('Add Corporate KPI')).not.toBeInTheDocument();
  });

  it('manage user sees Add Corporate KPI button', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Add Corporate KPI')).toBeInTheDocument();
  });

  it('Add Corporate KPI navigates to the Add page with the selected structure', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    // Wait until the structure is loaded (the Add handler needs it for structureId)
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByText('Add Corporate KPI'));
    expect(mockPush).toHaveBeenCalledWith(`/kpi/corporate/add?structureId=${sampleStructure.id}&type=ASPECT&from=structure`);
  });
});

/* ── Structure-driven period selection ── */

describe('structure-driven period selection', () => {
  it('fetches the tree for the default structure year in MONTHLY mode', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenCalledWith(
      currentYear,
      new Date().getMonth() + 1,
    ));
  });

  it('switching to Year refetches the ANNUAL tree with year only (month omitted)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);
    await screen.findByText('DRAFT');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      currentYear,
      undefined,
    ));
  });

  it('switching back to Month refetches with the month again', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);
    await screen.findByText('DRAFT');

    fireEvent.click(screen.getByText('Year', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      currentYear, undefined,
    ));
    fireEvent.click(screen.getByText('Month', { selector: 'button' }));
    await waitFor(() => expect(mockedApi.getTreeByYear).toHaveBeenLastCalledWith(
      currentYear, new Date().getMonth() + 1,
    ));
  });
});

/* ── Structure lifecycle (page level) ── */

describe('structure lifecycle', () => {
  it('shows the structure status chip (status only)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('DRAFT')).toBeInTheDocument();
    // The year lives in the filter dropdown, not the status chip.
    expect(screen.getByRole('button', { name: 'Select year' })).toHaveTextContent(String(currentYear));
  });

  it('DRAFT structure shows the Activate action', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByRole('button', { name: /^Activate$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Deactivate$/ })).not.toBeInTheDocument();
  });

  it('ACTIVE structure shows Deactivate and no Activate', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedStructuresApi.list.mockResolvedValue([{ ...sampleStructure, status: 'ACTIVE' }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('ACTIVE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Activate$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Deactivate$/ })).toBeInTheDocument();
  });

  it('ACTIVE structure freezes Add Corporate KPI and shows the lock notice', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedStructuresApi.list.mockResolvedValue([{ ...sampleStructure, status: 'ACTIVE' }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText(/deactivate it before editing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Corporate KPI/i })).toBeDisabled();
  });

  it('confirming Activate calls changeStatus(ACTIVE) and refreshes the tree', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Activate$/ }));
    expect(await screen.findByText(/Activate Corporate KPI Structure/i)).toBeInTheDocument();
    // Two buttons match: the header trigger and the modal confirm — click the modal one.
    const buttons = screen.getAllByRole('button', { name: /^Activate$/ });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(mockedStructuresApi.changeStatus)
      .toHaveBeenCalledWith(sampleStructure.id, { status: 'ACTIVE' }));
    expect(mockedStructuresApi.list).toHaveBeenCalled();
  });
});

/* ── Empty structure state + Create Structure ── */

describe('empty structure state', () => {
  it('shows the empty state with Create Structure for manage users', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedStructuresApi.list.mockResolvedValue([]);
    render(<KpiCorporatePage />);
    // The toolbar (year/month) stays and the table renders its own empty state
    expect(await screen.findByText(`No Corporate KPI structure yet for ${currentYear}.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Structure/i })).toBeInTheDocument();
  });

  it('read-only users see the empty state without the create button', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedStructuresApi.list.mockResolvedValue([]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText(`No Corporate KPI structure yet for ${currentYear}.`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Structure/i })).not.toBeInTheDocument();
  });

  it('Create Structure flow creates and selects the new structure', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedStructuresApi.list.mockResolvedValue([]);
    render(<KpiCorporatePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Create Structure/i }));

    expect(await screen.findByText('Create Corporate KPI Structure')).toBeInTheDocument();
    // Two buttons match: the empty-state trigger and the modal confirm — click the modal one.
    const buttons = screen.getAllByRole('button', { name: /Create Structure/i });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(mockedStructuresApi.create).toHaveBeenCalledWith({ year: currentYear }));
  });

  it('Copy from year mode creates the structure with copyFromYear', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    // The current year has no structure yet; the previous year does.
    mockedStructuresApi.list.mockResolvedValue([{ ...sampleStructure, id: 'struct-prev', year: currentYear - 1 }]);
    mockedStructuresApi.create.mockResolvedValue(sampleStructure);
    render(<KpiCorporatePage />);

    // Header Create Structure button (year without a structure) opens the modal
    fireEvent.click(await screen.findByRole('button', { name: /Create Structure/i }));
    expect(await screen.findByText('Create Corporate KPI Structure')).toBeInTheDocument();

    // Switch to copy mode, pick the previous year as the source, confirm
    fireEvent.click(screen.getByRole('button', { name: /Copy from year/i }));
    fireEvent.click(screen.getByTestId('select-source-year'));

    const buttons = screen.getAllByRole('button', { name: /Create Structure/i });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(mockedStructuresApi.create).toHaveBeenCalledWith({
      year: currentYear,
      copyFromYear: currentYear - 1,
    }));
  });

  it('table shows its own empty state when the selected year has no structure', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedStructuresApi.list.mockResolvedValue([{ ...sampleStructure, id: 'struct-prev', year: currentYear - 1 }]);
    render(<KpiCorporatePage />);
    // No dashed panel — the table's empty state renders, and the toolbar stays.
    expect(await screen.findByText(`No Corporate KPI structure yet for ${currentYear}.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select year' })).toBeInTheDocument();
    expect(screen.queryByText('No Corporate KPI structure yet.')).not.toBeInTheDocument();
  });
});

/* ── View toggle ── */

describe('view toggle', () => {
  it('renders Current view as default (toggle reads "Deleted")', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });

  it('toggles to Deleted view and back', async () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    mockedApi.getTreeByYear.mockResolvedValue([sampleNode]);
    render(<KpiCorporatePage />);

    fireEvent.click(await screen.findByText('Deleted'));
    expect(await screen.findByText('Current')).toBeInTheDocument();
    expect(mockedApi.getDeleted).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Current'));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();
  });
});

/* ── Lazy deleted fetch ── */

describe('lazy deleted fetch', () => {
  it('does not call getDeleted on initial load', () => {
    mockPermissions = { 'corporate_kpi:read': true, 'corporate_kpi:manage': true };
    render(<KpiCorporatePage />);
    expect(mockedApi.getDeleted).not.toHaveBeenCalled();
  });
});

/* ── Default tree expansion ── */

describe('tree expansion', () => {
  const indicator: CorporateKpiNode = {
    ...sampleNode,
    id: 'ind-1',
    parentId: 'asp-1',
    parentName: 'Financial',
    code: 'F01',
    name: 'Revenue Growth',
    nodeType: 'INDICATOR',
    children: [],
  };

  it('expands every expandable row by default on first load', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [indicator] }]);
    render(<KpiCorporatePage />);
    expect(await screen.findByText('Revenue Growth')).toBeInTheDocument();
  });

  it('collapses a row once the user toggles it (auto-expand ends on first toggle)', async () => {
    mockPermissions = { 'corporate_kpi:read': true };
    mockedApi.getTreeByYear.mockResolvedValue([{ ...sampleNode, children: [indicator] }]);
    render(<KpiCorporatePage />);
    await screen.findByText('Revenue Growth');

    fireEvent.click(screen.getByLabelText('Collapse'));
    expect(screen.queryByText('Revenue Growth')).not.toBeInTheDocument();
  });
});
