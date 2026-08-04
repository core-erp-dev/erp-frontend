/**
 * KPI navigation tests — verify the CANONICAL sidebar source
 * (`src/config/navigation.ts`, consumed by `src/components/layout/sidebar.tsx`).
 *
 * The stale `src/modules/kpi/sidebar.ts` duplicate was deleted (zero
 * production callers); these tests assert the single source of truth.
 */
import { navigationConfig } from '@/config/navigation';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES } from '@/modules/kpi/constants';

const kpiItems = navigationConfig.filter((item) => item.group === 'KPI');

describe('KPI sidebar configuration (canonical navigationConfig)', () => {
  it('contains exactly 4 KPI items', () => {
    expect(kpiItems).toHaveLength(4);
  });

  it('contains separate Activities and Activity Approvals entries', () => {
    const activities = kpiItems.find((i) => i.href === KPI_ROUTES.activities);
    const approvals = kpiItems.find((i) => i.href === KPI_ROUTES.approvals);
    expect(activities?.title).toBe('Activities');
    expect(approvals?.title).toBe('Activity Approvals');
    // Separate pages — never the same href, never a tab of each other.
    expect(KPI_ROUTES.activities).not.toBe(KPI_ROUTES.approvals);
  });

  it('Activities is discoverable by any authenticated user (no permission gate)', () => {
    const activities = kpiItems.find((i) => i.href === KPI_ROUTES.activities);
    expect(activities?.permissions).toBeUndefined();
    expect(activities?.capability).toBeUndefined();
    expect(activities?.roles).toBeUndefined();
  });

  it('Activity Approvals requires exactly kpi_activity:approve', () => {
    const approvals = kpiItems.find((i) => i.href === KPI_ROUTES.approvals);
    expect(approvals?.permissions).toEqual([PERM.KPI_ACTIVITY_APPROVE]);
  });

  it('Activity Approvals is not gated by kpi_activity:manage', () => {
    const approvals = kpiItems.find((i) => i.href === KPI_ROUTES.approvals);
    expect(approvals?.permissions).not.toContain(PERM.KPI_ACTIVITY_MANAGE);
  });

  it('Reports is discoverable by any authenticated user (no gate; manage is not required)', () => {
    const reports = kpiItems.find((i) => i.href === KPI_ROUTES.reports);
    expect(reports?.permissions).toBeUndefined();
    expect(reports?.capability).toBeUndefined();
    expect(reports?.roles).toBeUndefined();
  });

  it('Corporate KPI keeps the existing corporate_kpi:read gate', () => {
    const corporate = kpiItems.find((i) => i.href === KPI_ROUTES.corporate);
    expect(corporate?.permissions).toEqual([PERM.CORPORATE_KPI_READ]);
  });

  it('Dashboard points to / and sits outside the KPI group', () => {
    const dashboard = navigationConfig.find((i) => i.title === 'Dashboard');
    expect(dashboard?.href).toBe('/');
    expect(dashboard?.group).toBeUndefined();
    expect(kpiItems.some((i) => i.title === 'Dashboard')).toBe(false);
  });

  it('defines every canonical KPI route exactly once', () => {
    const hrefs = kpiItems.map((i) => i.href);
    for (const route of [KPI_ROUTES.corporate, KPI_ROUTES.activities, KPI_ROUTES.approvals, KPI_ROUTES.reports]) {
      expect(hrefs.filter((h) => h === route)).toHaveLength(1);
    }
  });
});

/* ── Expandable Corporate KPI parent ── */

describe('expandable Corporate KPI parent', () => {
  const corporate = kpiItems.find((i) => i.href === KPI_ROUTES.corporate);

  it('is a parent with exactly three children', () => {
    expect(corporate?.children).toHaveLength(3);
    const titles = corporate?.children?.map((c) => c.title);
    expect(titles).toEqual(['Corporate KPI', 'Input Variables', 'Monthly Variable Values']);
  });

  it('children route to the three corporate pages', () => {
    const hrefs = corporate?.children?.map((c) => c.href);
    expect(hrefs).toContain(KPI_ROUTES.corporate);
    expect(hrefs).toContain(KPI_ROUTES.corporateVariables);
    expect(hrefs).toContain(KPI_ROUTES.corporateVariableValues);
  });

  it('parent and all children are gated by corporate_kpi:read', () => {
    expect(corporate?.permissions).toEqual([PERM.CORPORATE_KPI_READ]);
    for (const child of corporate?.children ?? []) {
      expect(child.permissions).toEqual([PERM.CORPORATE_KPI_READ]);
    }
  });

  it('defines corporate sub-routes uniquely across the whole config', () => {
    const allHrefs = navigationConfig.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]);
    // /kpi/corporate appears twice by design (parent header + first child link);
    // the other two sub-routes exactly once each.
    expect(allHrefs.filter((h) => h === KPI_ROUTES.corporate)).toHaveLength(2);
    expect(allHrefs.filter((h) => h === KPI_ROUTES.corporateVariables)).toHaveLength(1);
    expect(allHrefs.filter((h) => h === KPI_ROUTES.corporateVariableValues)).toHaveLength(1);
  });
});
