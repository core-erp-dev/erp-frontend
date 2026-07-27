/**
 * KPI Report API contract tests — P3.
 * Verifies exact method/path, ApiResponse unwrapping, multipart part names,
 * and error propagation.
 */
import { api } from '@/lib/axios';
import { reportApi } from '../report-api';
import type { ApiResponse } from '@/types/api';
import type { KpiReportResponse } from '../report.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

/* ── Sample data ── */

const mockReport: KpiReportResponse = {
  id: 'rpt-1',
  activityId: 'act-1',
  activityName: 'Increase Q1 Revenue',
  unit: '%',
  activityTargetValue: 15,
  submittedByUserPositionId: 'up-1',
  submittedByUserName: 'John Manager',
  submittedByPositionName: 'VP Finance',
  reviewerUserPositionId: 'up-2',
  reviewerUserName: 'Admin Creator',
  reviewerPositionName: 'Administrator',
  reportDate: '2026-03-15',
  executionDescription: 'Completed revenue analysis.',
  realizedValue: 5.5,
  note: null,
  status: 'PENDING',
  reviewedBy: null,
  reviewedAt: null,
  rejectionReason: null,
  evidenceOriginalFilename: 'evidence.jpg',
  evidenceContentType: 'image/jpeg',
  evidenceFileSize: 102400,
  createdAt: '2026-03-15T10:00:00',
  updatedAt: '2026-03-15T10:00:00',
};

const mockBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });

/* ── submitReport ── */

describe('submitReport', () => {
  const payload = {
    activityId: 'act-1',
    reportDate: '2026-03-15',
    executionDescription: 'Completed analysis.',
    realizedValue: 5.5,
  };
  const evidenceFile = new File(['fake'], 'evidence.jpg', { type: 'image/jpeg' });

  it('calls POST /api/v1/kpi-reports with FormData', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { status: 201, message: 'OK', data: mockReport } satisfies ApiResponse<KpiReportResponse>,
    });

    const result = await reportApi.submitReport(payload, evidenceFile);

    const [url, formData, config] = mockedApi.post.mock.calls[0];
    expect(url).toBe('/api/v1/kpi-reports');

    // Verify FormData parts
    expect(formData).toBeInstanceOf(FormData);
    const reportPart = (formData as FormData).get('report');
    expect(reportPart).toBeInstanceOf(Blob);
    const evidencePart = (formData as FormData).get('evidence');
    expect(evidencePart).toBe(evidenceFile);

    // Verify NO manual Content-Type header
    expect(config?.headers?.['Content-Type']).toBeUndefined();
    expect(result).toEqual(mockReport);
  });
});

/* ── getMyReports ── */

describe('getMyReports', () => {
  it('calls GET /api/v1/kpi-reports/my and unwraps data', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockReport] } satisfies ApiResponse<KpiReportResponse[]>,
    });

    const result = await reportApi.getMyReports();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/my');
    expect(result).toEqual([mockReport]);
  });
});

/* ── getReportsToReview ── */

describe('getReportsToReview', () => {
  it('calls GET /api/v1/kpi-reports/to-review and unwraps data', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: [mockReport] } satisfies ApiResponse<KpiReportResponse[]>,
    });

    const result = await reportApi.getReportsToReview();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/to-review');
    expect(result).toEqual([mockReport]);
  });
});

/* ── getReportById ── */

describe('getReportById', () => {
  it('calls GET /api/v1/kpi-reports/{id} and unwraps data', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockReport } satisfies ApiResponse<KpiReportResponse>,
    });

    const result = await reportApi.getReportById('rpt-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/rpt-1');
    expect(result).toEqual(mockReport);
  });
});

/* ── getEvidence ── */

describe('getEvidence', () => {
  it('calls GET /api/v1/kpi-reports/{id}/evidence with responseType blob', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockBlob });

    const result = await reportApi.getEvidence('rpt-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/rpt-1/evidence', {
      responseType: 'blob',
    });
    expect(result).toBe(mockBlob);
  });
});

/* ── approveReport ── */

describe('approveReport', () => {
  it('calls PATCH /api/v1/kpi-reports/{id}/approve with no body', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockReport } satisfies ApiResponse<KpiReportResponse>,
    });

    const result = await reportApi.approveReport('rpt-1');

    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-reports/rpt-1/approve');
    expect(result).toEqual(mockReport);
  });
});

/* ── rejectReport ── */

describe('rejectReport', () => {
  it('calls PATCH /api/v1/kpi-reports/{id}/reject with rejectionReason', async () => {
    mockedApi.patch.mockResolvedValueOnce({
      data: { status: 200, message: 'OK', data: mockReport } satisfies ApiResponse<KpiReportResponse>,
    });

    const result = await reportApi.rejectReport('rpt-1', { rejectionReason: 'Needs more detail' });

    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-reports/rpt-1/reject', {
      rejectionReason: 'Needs more detail',
    });
    expect(result).toEqual(mockReport);
  });
});

/* ── Error propagation ── */

describe('error propagation', () => {
  it.each([
    ['submitReport', () => reportApi.submitReport(
      { activityId: 'x', reportDate: '2026-01-01', executionDescription: 'desc', realizedValue: 1 },
      new File(['x'], 'x.jpg', { type: 'image/jpeg' }),
    )],
    ['getMyReports', () => reportApi.getMyReports()],
    ['getReportsToReview', () => reportApi.getReportsToReview()],
    ['getReportById', () => reportApi.getReportById('bad')],
    ['getEvidence', () => reportApi.getEvidence('bad')],
    ['approveReport', () => reportApi.approveReport('bad')],
    ['rejectReport', () => reportApi.rejectReport('bad', { rejectionReason: 'bad' })],
  ])('%s throws when axios rejects', async (_name, fn) => {
    mockedApi.get.mockRejectedValue(new Error('Network error'));
    mockedApi.post.mockRejectedValue(new Error('Network error'));
    mockedApi.patch.mockRejectedValue(new Error('Network error'));

    await expect(fn()).rejects.toThrow('Network error');
  });
});
