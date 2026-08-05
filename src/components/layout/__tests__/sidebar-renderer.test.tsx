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
    // All three children are visible
    expect(screen.getByText('Variables')).toBeInTheDocument();
    expect(screen.getByText('KPI Values')).toBeInTheDocument();
  });

  it('shows the active child with the same active styling', () => {
    mockPathname = '/kpi/corporate/variable-values';
    render(<Sidebar isOpen />);
    const activeLink = screen.getByText('KPI Values');
    expect(activeLink.closest('a')).toHaveClass('font-semibold');
    // Parent also carries the active state
    expect(screen.getByRole('button', { name: /KPI Values|Corporate KPI/ })).toBeInTheDocument();
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
