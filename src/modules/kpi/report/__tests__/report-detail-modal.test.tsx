/**
 * ReportDetailModal tests — root review queue (2026-08-06).
 *
 * Proves: the Reviewer row shows "Company queue" for top-level root reports
 * (reviewerUserId null) instead of a broken-looking empty value; approve/reject
 * are replaced by a disabled self-review guard for reports the actor submitted.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportDetailModal } from '../report-detail-modal';
import type { KpiReportResponse } from '../report-v1.types';

jest.mock('../report-v1-api', () => ({
  reportV1Api: {
    getEvidence: jest.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
    getReportById: jest.fn(),
  },
}));

// jsdom has no URL.createObjectURL
beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:mock');
  URL.revokeObjectURL = jest.fn();
});

function rootReport(): KpiReportResponse {
  return {
    id: 'root-1', activityId: 'act-1', activityName: 'Top Root', unit: '%',
    activityTargetValue: 100, submittedByUserPositionId: 'up-1',
    submittedByUserName: 'Staff', submittedByPositionName: 'Staff Pos',
    reviewerUserId: null, reviewerUserName: null, reviewerUserPositionId: null, reviewerPositionName: null,
    reportDate: '2026-07-15', executionDescription: 'done', realizedValue: 40,
    note: null, status: 'PENDING', reviewedBy: null, reviewedAt: null,
    rejectionReason: null, evidenceOriginalFilename: 'e.jpg',
    evidenceContentType: 'image/jpeg', evidenceFileSize: 1024,
    createdAt: '2026-08-01T10:00:00', updatedAt: '2026-08-01T10:00:00',
  };
}

describe('ReportDetailModal — root review queue', () => {
  it('shows Company queue as the reviewer for a top-level root report', async () => {
    render(
      <ReportDetailModal
        isOpen
        onClose={jest.fn()}
        report={rootReport()}
        mode="REVIEW"
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );

    expect(await screen.findByText('Company queue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('disables decisions for a report the actor submitted (self-review UX guard)', async () => {
    render(
      <ReportDetailModal
        isOpen
        onClose={jest.fn()}
        report={rootReport()}
        mode="REVIEW"
        onApprove={jest.fn()}
        onReject={jest.fn()}
        disableDecisions
      />,
    );

    expect(await screen.findByText('You cannot review your own report')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
