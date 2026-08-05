/**
 * KPI navigation tests — verify the CANONICAL sidebar source
 * (`src/config/navigation.ts`, consumed by `src/components/layout/sidebar.tsx`).
 *
 * Structure (2026-08-06): Activities and Report are EXPANDABLE PARENTS with
 * submenus, following the existing Corporate KPI pattern (children array +
 * parent href). No child appears as a top-level menu.
 */
import { navigationConfig } from '@/config/navigation';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES } from '@/modules/kpi/constants';

const kpiItems = navigationConfig.filter((item) => item.group === 'KPI');
const topLevelKpiTitles = kpiItems.map((i) => i.title);

describe('KPI sidebar configuration (canonical navigationConfig)', () => {
  it('contains exactly 3 KPI parents', () => {
    expect(kpiItems).toHaveLength(3);
  });

  it('Activities is an expandable parent with exactly 5 submenus', () => {
    const activities = kpiItems.find((i) => i.title === 'Activities');
    expect(activities?.children?.map((c) => c.title)).toEqual([
      'All Activities', 'My Activities', 'Subordinate', 'My Request', 'Approval',
    ]);
  });

  it('Report is an expandable parent with exactly 2 submenus', () => {
    const report = kpiItems.find((i) => i.title === 'Report');
    expect(report?.children?.map((c) => c.title)).toEqual(['My Report', 'Approval']);
  });

  it('Corporate KPI keeps its 3 submenus (unchanged reference pattern)', () => {
    const corporate = kpiItems.find((i) => i.title === 'Corporate KPI');
    expect(corporate?.children?.map((c) => c.title)).toEqual(['Structure', 'Variables', 'Values']);
  });

  it('all three KPI parents use the SAME expandable mechanism (children array)', () => {
    for (const item of kpiItems) {
      expect(Array.isArray(item.children) && item.children.length > 0)
        .toBe(true);
    }
  });

  it('every Activities submenu maps to its own route', () => {
    const activities = kpiItems.find((i) => i.title === 'Activities');
    const hrefs = activities?.children?.map((c) => c.href);
    expect(hrefs).toEqual([
      KPI_ROUTES.activitiesAll,
      KPI_ROUTES.activitiesMine,
      KPI_ROUTES.activitiesSubordinate,
      KPI_ROUTES.activitiesMyRequests,
      KPI_ROUTES.approvals, // existing Activity Approval route kept as the child
    ]);
  });

  it('every Report submenu maps to its own route', () => {
    const report = kpiItems.find((i) => i.title === 'Report');
    const hrefs = report?.children?.map((c) => c.href);
    expect(hrefs).toEqual([KPI_ROUTES.reports, KPI_ROUTES.reportReviews]);
  });

  it('no submenu is duplicated as a top-level menu (no stale entries from 0a21e4d)', () => {
    expect(topLevelKpiTitles).not.toContain('My Reports');
    expect(topLevelKpiTitles).not.toContain('Report Reviews');
    expect(topLevelKpiTitles).not.toContain('Activity Approvals');
    expect(topLevelKpiTitles).not.toContain('My Activities');
    expect(topLevelKpiTitles).not.toContain('All Activities');
    expect(topLevelKpiTitles).not.toContain('Approval');
    expect(topLevelKpiTitles).not.toContain('My Report');
  });

  it('Activities > All Activities keeps the read_all|manage gate', () => {
    const activities = kpiItems.find((i) => i.title === 'Activities');
    const all = activities?.children?.find((c) => c.href === KPI_ROUTES.activitiesAll);
    expect(all?.permissions).toEqual([PERM.KPI_ACTIVITY_READ_ALL, PERM.KPI_ACTIVITY_MANAGE]);
  });

  it('Activities > Approval keeps the kpi_activity:approve gate', () => {
    const activities = kpiItems.find((i) => i.title === 'Activities');
    const approval = activities?.children?.find((c) => c.href === KPI_ROUTES.approvals);
    expect(approval?.permissions).toEqual([PERM.KPI_ACTIVITY_APPROVE]);
  });

  it('Activities > My Activities / Subordinate / My Request have no gate (responsibility-based)', () => {
    const activities = kpiItems.find((i) => i.title === 'Activities');
    for (const href of [KPI_ROUTES.activitiesMine, KPI_ROUTES.activitiesSubordinate, KPI_ROUTES.activitiesMyRequests]) {
      const child = activities?.children?.find((c) => c.href === href);
      expect(child?.permissions).toBeUndefined();
      expect(child?.capability).toBeUndefined();
      expect(child?.roles).toBeUndefined();
    }
  });

  it('Report > Approval is NOT gated by kpi_report:root_review or manage', () => {
    const report = kpiItems.find((i) => i.title === 'Report');
    const approval = report?.children?.find((c) => c.href === KPI_ROUTES.reportReviews);
    expect(approval?.permissions).toBeUndefined();
    expect(approval?.capability).toBeUndefined();
    expect(approval?.roles).toBeUndefined();
  });

  it('Report > My Report has no gate', () => {
    const report = kpiItems.find((i) => i.title === 'Report');
    const mine = report?.children?.find((c) => c.href === KPI_ROUTES.reports);
    expect(mine?.permissions).toBeUndefined();
    expect(mine?.capability).toBeUndefined();
    expect(mine?.roles).toBeUndefined();
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

  it('defines every canonical KPI route exactly once across parents and children', () => {
    const hrefs = kpiItems.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]);
    for (const route of [
      KPI_ROUTES.corporate, // appears twice by design (parent header + first child)
      KPI_ROUTES.corporateVariables, KPI_ROUTES.corporateVariableValues,
      KPI_ROUTES.activities, KPI_ROUTES.activitiesAll, KPI_ROUTES.activitiesMine,
      KPI_ROUTES.activitiesSubordinate, KPI_ROUTES.activitiesMyRequests,
      KPI_ROUTES.reports, // parent header + first child (same pattern as corporate)
      KPI_ROUTES.reportReviews,
      KPI_ROUTES.approvals,
    ]) {
      if (route === KPI_ROUTES.corporate || route === KPI_ROUTES.reports) {
        expect(hrefs.filter((h) => h === route)).toHaveLength(2);
      } else {
        expect(hrefs.filter((h) => h === route)).toHaveLength(1);
      }
    }
  });
});
