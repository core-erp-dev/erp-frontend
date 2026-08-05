/**
 * Report V1 client contract tests (T12–T17) — 6 functions.
 * Verifies exact method/path/query: `scope` always sent, multipart parts for
 * submission, and SEPARATE approve/reject endpoints (T16/T17 — the backend has
 * no unified Report decision endpoint).
 */
import { api } from '@/lib/axios';
import { reportV1Api } from '../report-v1-api';
import type { ApiResponse } from '@/types/api';
import type { KpiReportResponse } from '../report-v1.types';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const report: KpiReportResponse = {
  id: 'rep-1', activityId: 'act-1', activityName: 'A1', unit: '%',
  activityTargetValue: 100, submittedByUserPositionId: 'up-1',
  submittedByUserName: 'A', submittedByPositionName: 'P1',
  reviewerUserId: 'u-2', reviewerUserName: 'C',
  reviewerUserPositionId: null, reviewerPositionName: null,
  reportDate: '2026-06-15', executionDescription: 'done', realizedValue: 40,
  note: null, status: 'PENDING', reviewedBy: null, reviewedAt: null,
  rejectionReason: null, evidenceOriginalFilename: 'e.jpg',
  evidenceContentType: 'image/jpeg', evidenceFileSize: 1024,
  createdAt: '', updatedAt: '',
};

const wrap = <T>(data: T): ApiResponse<T> => ({ status: 200, message: 'ok', data });

describe('reportV1Api.getReports (T13)', () => {
  it('GET /api/v1/kpi-reports with scope=mine', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([report]) });
    const result = await reportV1Api.getReports('mine');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports', { params: { scope: 'mine' } });
    expect(result).toEqual([report]);
  });

  it('GET with scope=to-review (stored reviewer)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([]) });
    await reportV1Api.getReports('to-review');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports', { params: { scope: 'to-review' } });
  });

  it('throws MissingScopeError when scope is missing', async () => {
    await expect(reportV1Api.getReports(undefined as never)).rejects.toThrow('scope is required');
  });
});

describe('reportV1Api.submitReport (T12)', () => {
  it('POST /api/v1/kpi-reports with report JSON blob + evidence file parts', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: wrap(report) });
    const file = new File(['x'], 'evidence.jpg', { type: 'image/jpeg' });
    const payload = { activityId: 'act-1', reportDate: '2026-06-15', executionDescription: 'done', realizedValue: 40 };
    await reportV1Api.submitReport(payload, file);
    const [url, body] = mockedApi.post.mock.calls[0];
    expect(url).toBe('/api/v1/kpi-reports');
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(form.get('evidence')).toBe(file);
    const reportBlob = form.get('report') as Blob;
    const reportText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(reportBlob);
    });
    expect(JSON.parse(reportText)).toEqual(payload);
  });
});

describe('reportV1Api detail/evidence (T14/T15)', () => {
  it('GET /api/v1/kpi-reports/{reportId}', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap(report) });
    const result = await reportV1Api.getReportById('rep-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/rep-1');
    expect(result.id).toBe('rep-1');
  });

  it('GET evidence as blob', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: new Blob(['x']) });
    await reportV1Api.getEvidence('rep-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/kpi-reports/rep-1/evidence', { responseType: 'blob' });
  });
});

describe('reportV1Api decisions (T16/T17 — separate endpoints)', () => {
  it('approve: PATCH /api/v1/kpi-reports/{reportId}/approve with no body', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(report) });
    await reportV1Api.approveReport('rep-1');
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-reports/rep-1/approve');
  });

  it('reject: PATCH /api/v1/kpi-reports/{reportId}/reject with rejectionReason', async () => {
    mockedApi.patch.mockResolvedValueOnce({ data: wrap(report) });
    await reportV1Api.rejectReport('rep-1', { rejectionReason: 'not valid' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/api/v1/kpi-reports/rep-1/reject', { rejectionReason: 'not valid' });
  });
});
