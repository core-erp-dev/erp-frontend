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
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // All three children are visible as text-only labels
    expect(screen.getByText('Struktur')).toBeInTheDocument();
    expect(screen.getByText('Variabel')).toBeInTheDocument();
    expect(screen.getByText('Nilai Variabel')).toBeInTheDocument();
  });

  it('marks the active child with semibold text only (no background container)', () => {
    mockPathname = '/kpi/corporate/variable-values';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Nilai Variabel').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    // No active background/pill — only the text weight changes
    expect(activeLink).not.toHaveClass('bg-[#EBEBEC]');
    // Parent also carries the active state
    expect(screen.getByRole('button', { name: /Nilai Variabel|KPI Perusahaan/ })).toBeInTheDocument();
  });

  it('shows CaretDown when collapsed and CaretUp when expanded', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
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
    for (const label of ['Struktur', 'Variabel', 'Nilai Variabel']) {
      const link = screen.getByText(label).closest('a');
      expect(link?.querySelector('[data-testid^="icon-"]')).toBeNull();
    }
  });

  it('renders a subtle vertical guide line beside the submenu group', () => {
    mockPathname = '/kpi/corporate';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    const guide = parent
      .closest('li')!
      .querySelector('[data-testid="submenu-guide"]');
    expect(guide).not.toBeNull();
    expect(guide).toHaveAttribute('aria-hidden', 'true');
    expect(guide).toHaveClass('pointer-events-none');
    expect(guide).toHaveClass('border-border');
  });

  it('collapses when the parent header is clicked and no child is active', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    const collapse = parent
      .closest('li')!
      .querySelector('[data-testid="submenu-collapse"]');
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(collapse).toHaveClass('grid-rows-[0fr]');

    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(collapse).toHaveClass('grid-rows-[1fr]');
    expect(screen.getByText('Variabel')).toBeInTheDocument();
  });

  it('hides the expandable entirely without corporate_kpi:read', () => {
    mockUser = { username: 'u', email: 'u@x.com', permissions: [], roles: [] };
    render(<Sidebar isOpen />);
    expect(screen.queryByRole('button', { name: /KPI Perusahaan/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Variabel')).not.toBeInTheDocument();
  });

  it('manual collapse persists after navigating away from the active child', () => {
    mockPathname = '/kpi/corporate/variables';
    const { rerender } = render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // While a child route is active the parent stays open (auto-open rule)
    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');

    // Navigate away → child no longer active → manual collapse works
    mockPathname = '/kpi/activities';
    rerender(<Sidebar isOpen />);
    fireEvent.click(screen.getByRole('button', { name: /KPI Perusahaan/ }));
    expect(screen.getByRole('button', { name: /KPI Perusahaan/ })).toHaveAttribute('aria-expanded', 'false');
    const collapse = screen
      .getByRole('button', { name: /KPI Perusahaan/ })
      .closest('li')!
      .querySelector('[data-testid="submenu-collapse"]');
    expect(collapse).toHaveClass('grid-rows-[0fr]');
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
    const parent = screen.getByRole('button', { name: /^Aktivitas/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Semua Aktivitas', 'Aktivitas Saya', 'Aktivitas Bawahan', 'Pengajuan Saya', 'Persetujuan']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks the active child with semibold text and keeps the parent open', () => {
    mockPathname = '/kpi/activities/all';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Semua Aktivitas').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    expect(screen.getByRole('button', { name: /^Aktivitas/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides gated children but keeps the parent visible (partial visibility)', () => {
    // No read_all/manage and no kpi_activity:approve → only the three
    // responsibility-based children remain; the parent itself stays.
    mockUser = { username: 'u', email: 'u@x.com', permissions: [], roles: [] };
    mockPathname = '/kpi/activities/mine';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Aktivitas/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Aktivitas Saya')).toBeInTheDocument();
    expect(screen.getByText('Aktivitas Bawahan')).toBeInTheDocument();
    expect(screen.getByText('Pengajuan Saya')).toBeInTheDocument();
    expect(screen.queryByText('Semua Aktivitas')).not.toBeInTheDocument();
    expect(screen.queryByText('Persetujuan')).not.toBeInTheDocument();
  });

  it('renders submenu items as text-only labels (no icons), like Corporate KPI', () => {
    mockPathname = '/kpi/activities/mine'; // child route → parent open
    render(<Sidebar isOpen />);
    for (const label of ['Aktivitas Saya', 'Aktivitas Bawahan', 'Pengajuan Saya']) {
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
    const parent = screen.getByRole('button', { name: /^Laporan/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Laporan Saya')).toBeInTheDocument();
    expect(screen.getByText('Persetujuan Laporan')).toBeInTheDocument();
  });

  it('is NOT gated by kpi_report:root_review — visible for a user with no report permissions', () => {
    mockPathname = '/kpi/reports';
    render(<Sidebar isOpen />);
    expect(screen.getByRole('button', { name: /^Laporan/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Laporan Saya')).toBeInTheDocument();
    expect(screen.getByText('Persetujuan Laporan')).toBeInTheDocument();
  });

  it('marks the active child and keeps the parent open on the review route', () => {
    mockPathname = '/kpi/report-reviews';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Persetujuan Laporan').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    expect(screen.getByRole('button', { name: /^Laporan/ })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Sidebar hover & active semantics (per menu type)', () => {
  it('top-level menu (Dasbor) keeps the normal hover container style', () => {
    mockUser = {
      username: 'admin',
      email: 'admin@erp.com',
      permissions: ['corporate_kpi:read', 'unit_performance:read'],
      roles: ['ADMIN'],
    };
    mockPathname = '/kpi/corporate/variables';
    render(<Sidebar isOpen />);
    const dasbor = screen.getByRole('link', { name: /^Dasbor$/ });
    expect(dasbor).toHaveClass('hover:bg-[#EBEBEC]');
    expect(dasbor).toHaveClass('hover:text-foreground');
  });

  it('top-level menu (Pengaturan) keeps the normal hover container style', () => {
    mockPathname = '/kpi/corporate';
    render(<Sidebar isOpen />);
    const settings = screen.getByRole('link', { name: /^Pengaturan$/ });
    expect(settings).toHaveClass('hover:bg-[#EBEBEC]');
  });

  it('parent expandable keeps the normal hover container style (not bold-only)', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    expect(parent).toHaveClass('hover:bg-[#EBEBEC]');
    expect(parent).toHaveClass('hover:text-foreground');
  });

  it('parent gets the normal active style when a descendant route is active', () => {
    mockPathname = '/kpi/corporate/variables';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /KPI Perusahaan/ });
    expect(parent).toHaveClass('bg-[#EBEBEC]');
    expect(parent).toHaveClass('font-semibold');
    expect(parent).toHaveClass('text-foreground');
  });

  it('parent opened manually WITHOUT an active descendant is NOT marked active', () => {
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Aktivitas/ });
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    expect(parent).not.toHaveClass('bg-[#EBEBEC]');

    fireEvent.click(parent);
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    // Opening the menu alone never activates it — no descendant route matches.
    expect(parent).not.toHaveClass('bg-[#EBEBEC]');
    expect(parent).not.toHaveClass('font-semibold');
  });

  it('submenu children never carry a hover background', () => {
    // No KPI child is active here, so every child carries its plain hover
    // classes (collapsed submenus stay mounted for the animation).
    mockPathname = '/kpi/activities';
    render(<Sidebar isOpen />);
    for (const label of ['Struktur', 'Variabel', 'Nilai Variabel']) {
      const link = screen.getByText(label).closest('a');
      expect(link).not.toHaveClass('hover:bg-[#EBEBEC]');
      expect(link).toHaveClass('hover:font-semibold');
    }
  });

  it('submenu child is bold-only when active (no container background)', () => {
    mockPathname = '/kpi/activities/mine';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('Aktivitas Saya').closest('a');
    expect(activeLink).toHaveClass('font-semibold');
    expect(activeLink).not.toHaveClass('bg-[#EBEBEC]');
  });

  it('parent Aktivitas uses the normal active style while Aktivitas Saya is the route', () => {
    mockPathname = '/kpi/activities/mine';
    render(<Sidebar isOpen />);
    const parent = screen.getByRole('button', { name: /^Aktivitas/ });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(parent).toHaveClass('bg-[#EBEBEC]');
    expect(parent).toHaveClass('font-semibold');
    const activeChild = screen.getByText('Aktivitas Saya').closest('a');
    expect(activeChild).toHaveClass('font-semibold');
    expect(activeChild).not.toHaveClass('bg-[#EBEBEC]');
  });
});

