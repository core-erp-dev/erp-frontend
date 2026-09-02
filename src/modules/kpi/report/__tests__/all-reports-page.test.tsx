import React from 'react';
import { render, screen } from '@testing-library/react';
import KpiAllReportsPage from '@/app/(main)/kpi/reports/all/page';

const fetchAll = jest.fn();
let canManage = false;

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/use-permission', () => ({
  usePermission: () => ({ hasPerm: (permission: string) => canManage && permission === 'kpi_report:manage' }),
}));
jest.mock('@/modules/kpi/report/use-report-data', () => ({
  useReportData: () => ({
    allReports: [],
    allPagination: null,
    isLoadingAll: false,
    allError: null,
    fetchAllReports: fetchAll,
  }),
}));
jest.mock('@/modules/kpi/report/report-table', () => ({
  ReportTable: () => null,
}));
jest.mock('@/modules/kpi/admin/reassign-reviewer-dialog', () => ({
  ReassignReviewerDialog: () => null,
}));

describe('All Reports page (/kpi/reports/all)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/kpi/reports/all');
    canManage = false;
    fetchAll.mockClear();
  });

  it('keeps the permission guard', () => {
    render(<KpiAllReportsPage />);
    expect(screen.getByText('Akses ditolak')).toBeInTheDocument();
    expect(fetchAll).not.toHaveBeenCalled();
  });

  it('fetches scope=all with the local report date', () => {
    canManage = true;
    render(<KpiAllReportsPage />);
    const today = new Date();
    const todayIso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    expect(fetchAll).toHaveBeenCalledWith(expect.objectContaining({ reportDate: todayIso }));
    expect(screen.getByRole('heading', { name: 'Semua Laporan' })).toBeInTheDocument();
  });
});
