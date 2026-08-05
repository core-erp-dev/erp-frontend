/**
 * ReportTable tests — centralized root-review queue (2026-08-06).
 *
 * Proves: hierarchy-assigned reports keep their reviewer in the My Reports
 * column; top-level root reports (reviewerUserId null) show "Company queue";
 * T18 reassignment is rendered only for hierarchy-assigned reports — never for
 * top-level roots.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportTable } from '../report-table';
import type { KpiReportResponse } from '../report-v1.types';

function report(id: string, reviewerUserId: string | null, reviewerUserName: string | null): KpiReportResponse {
  return {
    id, activityId: 'act-1', activityName: `Activity ${id}`, unit: '%',
    activityTargetValue: 100, submittedByUserPositionId: 'up-1',
    submittedByUserName: 'Staff', submittedByPositionName: 'Staff Pos',
    reviewerUserId, reviewerUserName, reviewerUserPositionId: null, reviewerPositionName: null,
    reportDate: '2026-07-15', executionDescription: 'done', realizedValue: 40,
    note: null, status: 'PENDING', reviewedBy: null, reviewedAt: null,
    rejectionReason: null, evidenceOriginalFilename: 'e.jpg',
    evidenceContentType: 'image/jpeg', evidenceFileSize: 1024,
    createdAt: '2026-08-01T10:00:00', updatedAt: '2026-08-01T10:00:00',
  };
}

const onViewDetail = jest.fn();
const onReassignReviewer = jest.fn();

describe('ReportTable — root review queue presentation', () => {
  it('shows the hierarchy reviewer for assigned reports and Company queue for top-level roots', () => {
    render(
      <ReportTable
        items={[
          report('assigned', 'u-reviewer', 'Parent Reviewer'),
          report('root', null, null),
        ]}
        isLoading={false}
        error={null}
        mode="MY"
        onViewDetail={onViewDetail}
      />,
    );

    expect(screen.getByText('Parent Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Company queue')).toBeInTheDocument();
  });

  it('renders the reassign action only for hierarchy-assigned reports in TO_REVIEW mode', () => {
    render(
      <ReportTable
        items={[
          report('assigned', 'u-reviewer', 'Parent Reviewer'),
          report('root', null, null),
        ]}
        isLoading={false}
        error={null}
        mode="TO_REVIEW"
        onViewDetail={onViewDetail}
        onReassignReviewer={onReassignReviewer}
      />,
    );

    const reassignButtons = screen.getAllByRole('button', { name: 'Reassign reviewer' });
    // Exactly one — the top-level root report must not be reassignable
    expect(reassignButtons).toHaveLength(1);
  });
});
