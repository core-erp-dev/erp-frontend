/**
 * KPI sidebar structure and permission visibility tests.
 */
import { kpiSidebar } from '@/modules/hr/kpi/sidebar';
import { PERM } from '@/constants/permissions';
import { KPI_ROUTES, KPI_ANY_PERMISSION } from '@/modules/hr/kpi/constants';

describe('KPI sidebar configuration', () => {
  it('contains exactly 5 KPI sidebar items', () => {
    expect(kpiSidebar).toHaveLength(5);
  });

  it('all items belong to hr module and KPI group', () => {
    for (const item of kpiSidebar) {
      expect(item.module).toBe('hr');
      expect(item.group).toBe('KPI');
    }
  });

  it('Overview is labeled "Overview" not "Dashboard KPI"', () => {
    const overview = kpiSidebar.find((i) => i.href === KPI_ROUTES.overview);
    expect(overview).toBeDefined();
    expect(overview!.title).toBe('Overview');
  });

  it('has correct item titles', () => {
    const titles = kpiSidebar.map((i) => i.title);
    expect(titles).toEqual([
      'Overview',
      'Corporate KPI',
      'Activities',
      'Reports',
      'Approvals',
    ]);
  });

  it('has correct href paths', () => {
    const hrefs = kpiSidebar.map((i) => i.href);
    expect(hrefs).toEqual([
      '/hr/kpi',
      '/hr/kpi/corporate',
      '/hr/kpi/activities',
      '/hr/kpi/reports',
      '/hr/kpi/approvals',
    ]);
  });

  it('every item has a valid Phosphor icon', () => {
    for (const item of kpiSidebar) {
      expect(item.icon).toBeDefined();
      expect(item.icon).not.toBeNull();
    }
  });

  it('every item has at least one permission', () => {
    for (const item of kpiSidebar) {
      expect(item.permissions).toBeDefined();
      expect(item.permissions!.length).toBeGreaterThan(0);
    }
  });
});

describe('KPI permission visibility rules', () => {
  it('Overview is visible with any KPI permission', () => {
    const overview = kpiSidebar.find((i) => i.href === KPI_ROUTES.overview)!;
    // Overview should contain all 12 KPI permissions
    expect(overview.permissions).toHaveLength(12);
    expect(overview.permissions).toEqual(expect.arrayContaining(KPI_ANY_PERMISSION));
  });

  it('Corporate KPI requires corporate_kpi:read', () => {
    const corporate = kpiSidebar.find((i) => i.href === KPI_ROUTES.corporate)!;
    expect(corporate.permissions).toEqual([PERM.CORPORATE_KPI_READ]);
  });

  it('Activities is visible with read or request permission only (not approve)', () => {
    const activities = kpiSidebar.find((i) => i.href === KPI_ROUTES.activities)!;
    expect(activities.permissions).toHaveLength(2);
    expect(activities.permissions).toEqual([PERM.KPI_ACTIVITY_READ, PERM.KPI_ACTIVITY_REQUEST]);
    expect(activities.permissions).not.toContain(PERM.KPI_ACTIVITY_APPROVE);
  });

  it('Reports is visible with any report permission', () => {
    const reports = kpiSidebar.find((i) => i.href === KPI_ROUTES.reports)!;
    expect(reports.permissions).toEqual(
      expect.arrayContaining([PERM.KPI_REPORT_READ, PERM.KPI_REPORT_SUBMIT, PERM.KPI_REPORT_REVIEW]),
    );
  });

  it('Approvals requires kpi_activity:approve only', () => {
    const approvals = kpiSidebar.find((i) => i.href === KPI_ROUTES.approvals)!;
    expect(approvals.permissions).toEqual([PERM.KPI_ACTIVITY_APPROVE]);
    expect(approvals.permissions).toHaveLength(1);
  });

  it('no sidebar item uses role-based filtering', () => {
    for (const item of kpiSidebar) {
      expect(item.roles).toBeUndefined();
    }
  });
});

describe('KPI permission constants', () => {
  it('all 12 KPI permissions are defined in PERM', () => {
    const kpiPerms = [
      PERM.CORPORATE_KPI_READ,
      PERM.CORPORATE_KPI_CREATE,
      PERM.CORPORATE_KPI_UPDATE,
      PERM.CORPORATE_KPI_DELETE,
      PERM.CORPORATE_KPI_RESTORE,
      PERM.CORPORATE_KPI_READ_DELETED,
      PERM.KPI_ACTIVITY_READ,
      PERM.KPI_ACTIVITY_REQUEST,
      PERM.KPI_ACTIVITY_APPROVE,
      PERM.KPI_REPORT_READ,
      PERM.KPI_REPORT_SUBMIT,
      PERM.KPI_REPORT_REVIEW,
    ];
    expect(kpiPerms).toHaveLength(12);
    for (const p of kpiPerms) {
      expect(typeof p).toBe('string');
      expect(p).toBeTruthy();
    }
  });

  it('KPI permission values match backend contracts', () => {
    expect(PERM.CORPORATE_KPI_READ).toBe('corporate_kpi:read');
    expect(PERM.CORPORATE_KPI_CREATE).toBe('corporate_kpi:create');
    expect(PERM.CORPORATE_KPI_UPDATE).toBe('corporate_kpi:update');
    expect(PERM.CORPORATE_KPI_DELETE).toBe('corporate_kpi:delete');
    expect(PERM.CORPORATE_KPI_RESTORE).toBe('corporate_kpi:restore');
    expect(PERM.CORPORATE_KPI_READ_DELETED).toBe('corporate_kpi:read_deleted');

    expect(PERM.KPI_ACTIVITY_READ).toBe('kpi_activity:read');
    expect(PERM.KPI_ACTIVITY_REQUEST).toBe('kpi_activity:request');
    expect(PERM.KPI_ACTIVITY_APPROVE).toBe('kpi_activity:approve');

    expect(PERM.KPI_REPORT_READ).toBe('kpi_report:read');
    expect(PERM.KPI_REPORT_SUBMIT).toBe('kpi_report:submit');
    expect(PERM.KPI_REPORT_REVIEW).toBe('kpi_report:review');
  });

  it('existing non-KPI permissions are unchanged', () => {
    expect(PERM.USER_READ).toBe('user:read');
    expect(PERM.POSITION_READ).toBe('position:read');
    expect(PERM.ROLE_READ).toBe('role:read');
    expect(PERM.PERMISSION_READ).toBe('permission:read');
  });
});

describe('KPI route constants', () => {
  it('all 5 KPI routes are defined', () => {
    expect(KPI_ROUTES.overview).toBe('/hr/kpi');
    expect(KPI_ROUTES.corporate).toBe('/hr/kpi/corporate');
    expect(KPI_ROUTES.activities).toBe('/hr/kpi/activities');
    expect(KPI_ROUTES.reports).toBe('/hr/kpi/reports');
    expect(KPI_ROUTES.approvals).toBe('/hr/kpi/approvals');
  });

  it('all routes are under /hr/kpi/', () => {
    for (const route of Object.values(KPI_ROUTES)) {
      expect(route).toMatch(/^\/hr\/kpi/);
    }
  });
});

describe('KPI sidebar and existing sidebar coexistence', () => {
  it('KPI sidebar does not contain legacy terminology', () => {
    const titles = kpiSidebar.map((i) => i.title).join(' ');
    expect(titles).not.toMatch(/KpiTask|Task KPI|Kinerja Tim|Kinerja Individu|Admin KPI|Dashboard KPI/i);
  });

  it('KPI sidebar does not contain Organization items', () => {
    const hrefs = kpiSidebar.map((i) => i.href);
    expect(hrefs).not.toContain('/hr/organization/employees');
    expect(hrefs).not.toContain('/hr/organization/positions');
  });

  it('KPI sidebar does not contain Settings items', () => {
    const hrefs = kpiSidebar.map((i) => i.href);
    expect(hrefs).not.toContain('/hr/settings');
    expect(hrefs).not.toContain('/hr/settings/roles');
  });
});
