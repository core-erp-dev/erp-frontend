/**
 * Sidebar renderer tests — expandable Corporate KPI parent: auto-open on
 * active child, active state, permission-driven child visibility, collapse.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/sidebar';

let mockPathname = '/kpi/corporate';
let mockUser: { username: string; email: string; permissions: string[]; roles: string[] } | null = {
  username: 'admin',
  email: 'admin@erp.com',
  permissions: ['corporate_kpi:read', 'corporate_kpi:manage'],
  roles: ['ADMIN'],
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => mockPathname,
}));

jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: mockUser }),
}));

// HeroUI mock: Avatar must carry .Fallback (the shared mock maps the whole
// package and lacks the compound part).
jest.mock('@heroui/react', () => {
  const React = jest.requireActual('react');
  const NON_DOM = new Set(['size', 'variant', 'isOpen', 'isDisabled', 'onOpenChange', 'isDismissable', 'className']);
  const mk = (name: string) => {
    const Cmp = (props: Record<string, unknown>) => {
      const { children, ...rest } = props;
      const dom: Record<string, unknown> = { 'data-mock': name };
      for (const [k, v] of Object.entries(rest)) {
        if (!NON_DOM.has(k)) dom[k] = v;
      }
      return React.createElement('div', dom, children);
    };
    Cmp.displayName = name;
    return Cmp;
  };
  const Avatar = (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
    return React.createElement('div', { 'data-mock': 'Avatar', ...rest }, children);
  };
  Avatar.displayName = 'Avatar';
  Avatar.Fallback = mk('Avatar.Fallback');
  return {
    Avatar,
    Description: mk('Description'),
    Label: mk('Label'),
    toast: { success: jest.fn(), danger: jest.fn(), warning: jest.fn(), info: jest.fn() },
  };
});

beforeEach(() => {
  mockPathname = '/kpi/corporate';
  mockUser = {
    username: 'admin',
    email: 'admin@erp.com',
    permissions: ['corporate_kpi:read', 'corporate_kpi:manage'],
    roles: ['ADMIN'],
  };
});

describe('Sidebar expandable Corporate KPI', () => {
  it('auto-opens and highlights the parent when a child route is active', () => {
    mockPathname = '/kpi/corporate/variables';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /Corporate KPI/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // All three children are visible as text-only labels
    expect(screen.getByText('Structure')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();
  });

  it('marks the active child with semibold text only (no background container)', () => {
    mockPathname = '/kpi/corporate/variable-values';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Values').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    // No active background/pill — only the text weight changes
    expect(activeLink).not.toHaveClass('bg-[#EBEBEC]');
    // Parent also carries the active state
    expect(screen.getByRole('button', { name: /Values|Corporate KPI/ })).toBeInTheDocument();
  });

  it('shows CaretDown when collapsed and CaretUp when expanded', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /Corporate KPI/ });
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(parent.querySelector('[data-testid="icon-CaretDown"]')).toBeTruthy();
    expect(parent.querySelector('[data-testid="icon-CaretUp"]')).toBeNull();

    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(parent.querySelector('[data-testid="icon-CaretUp"]')).toBeTruthy();
    expect(parent.querySelector('[data-testid="icon-CaretDown"]')).toBeNull();
  });

  it('renders submenu items as text-only labels (no icons)', () => {
    mockPathname = '/kpi/corporate';
    render(<Sidebar isOpen />);
    for (const label of ['Structure', 'Variables', 'Values']) {
      const link = screen.getByText(label).closest('a');
      expect(link?.querySelector('[data-testid^="icon-"]')).toBeNull();
    }
  });

  it('renders a subtle vertical guide line beside the submenu group', () => {
    mockPathname = '/kpi/corporate';
    render(<Sidebar isOpen />);
    const guide = screen.getByTestId('submenu-guide');
    expect(guide).toHaveAttribute('aria-hidden', 'true');
    expect(guide).toHaveClass('pointer-events-none');
    expect(guide).toHaveClass('border-border');
  });

  it('collapses when the parent header is clicked and no child is active', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /Corporate KPI/ });
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();

    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Variables')).toBeInTheDocument();
  });

  it('hides the expandable entirely without corporate_kpi:read', () => {
    mockUser = { username: 'u', email: 'u@x.com', permissions: [], roles: [] };
    render(<Sidebar isOpen />);
    expect(screen.queryByRole('button', { name: /Corporate KPI/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();
  });

  it('manual collapse persists after navigating away from the active child', () => {
    mockPathname = '/kpi/corporate/variables';
    const { rerender } = render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /Corporate KPI/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // While a child route is active the parent stays open (auto-open rule)
    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');

    // Navigate away → child no longer active → manual collapse works
    mockPathname = '/kpi/activities';
    rerender(<Sidebar isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /Corporate KPI/ }));
    expect(screen.getByRole('button', { name: /Corporate KPI/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();
  });
});

describe('Sidebar expandable Activities parent', () => {
  beforeEach(() => {
    mockUser = {
      username: 'admin',
      email: 'admin@erp.com',
      permissions: ['kpi_activity:read_all', 'kpi_activity:approve', 'kpi_activity:manage'],
      roles: ['ADMIN'],
    };
  });

  it('auto-opens with all five submenus when a child route is active (direct-load)', () => {
    mockPathname = '/kpi/activities/my-requests';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Activities/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['All Activities', 'My Activities', 'Subordinate', 'My Request', 'Approval']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks the active child with semibold text and keeps the parent open', () => {
    mockPathname = '/kpi/activities/all';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('All Activities').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    expect(screen.getByRole('button', { name: /^Activities/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides gated children but keeps the parent visible (partial visibility)', () => {
    // No read_all/manage and no kpi_activity:approve → only the three
    // responsibility-based children remain; the parent itself stays.
    mockUser = { username: 'u', email: 'u@x.com', permissions: [], roles: [] };
    mockPathname = '/kpi/activities/mine';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Activities/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('My Activities')).toBeInTheDocument();
    expect(screen.getByText('Subordinate')).toBeInTheDocument();
    expect(screen.getByText('My Request')).toBeInTheDocument();
    expect(screen.queryByText('All Activities')).not.toBeInTheDocument();
    expect(screen.queryByText('Approval')).not.toBeInTheDocument();
  });

  it('renders submenu items as text-only labels (no icons), like Corporate KPI', () => {
    mockPathname = '/kpi/activities/mine'; // child route → parent open
    render(<Sidebar isOpen />);
    for (const label of ['My Activities', 'Subordinate', 'My Request']) {
      const link = screen.getByText(label).closest('a');
      expect(link?.querySelector('[data-testid^="icon-"]')).toBeNull();
    }
  });
});

describe('Sidebar expandable Report parent', () => {
  beforeEach(() => {
    mockUser = {
      username: 'u',
      email: 'u@x.com',
      permissions: [],
      roles: [],
    };
  });

  it('auto-opens with My Report and Approval when a child route is active (direct-load)', () => {
    mockPathname = '/kpi/report-reviews';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Report/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('My Report')).toBeInTheDocument();
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });

  it('is NOT gated by kpi_report:root_review — visible for a user with no report permissions', () => {
    mockPathname = '/kpi/reports';
    render(<Sidebar isOpen />);
    expect(screen.getByRole('button', { name: /^Report/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('My Report')).toBeInTheDocument();
    expect(screen.getByText('Approval')).toBeInTheDocument();
  });

  it('marks the active child and keeps the parent open on the review route', () => {
    mockPathname = '/kpi/report-reviews';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Approval').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    expect(screen.getByRole('button', { name: /^Report/ })).toHaveAttribute('aria-expanded', 'true');
  });
});

