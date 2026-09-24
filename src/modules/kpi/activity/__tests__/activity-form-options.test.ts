import { activityV1Api } from '../activity-v1-api';
import { loadActivityFormKpiOptions } from '../activity-form-options';

jest.mock('../activity-v1-api', () => ({
  activityV1Api: {
    getSubmissionOptions: jest.fn(),
  },
}));

const mockedActivityApi = jest.mocked(activityV1Api);

describe('loadActivityFormKpiOptions', () => {
  it('uses the activity submission options endpoint before a year is selected', async () => {
    mockedActivityApi.getSubmissionOptions.mockResolvedValueOnce({
      periodYears: [2026],
      indicators: [],
    });

    await expect(loadActivityFormKpiOptions()).resolves.toEqual({
      periodYears: [2026],
      indicators: [],
    });
    expect(mockedActivityApi.getSubmissionOptions).toHaveBeenCalledWith(undefined);
  });

  it('loads indicator references without calling Corporate KPI structure APIs', async () => {
    mockedActivityApi.getSubmissionOptions.mockResolvedValueOnce({
      periodYears: [2026],
      indicators: [{ id: 'ind-1', code: 'CK-01', name: 'Revenue' }],
    });

    await expect(loadActivityFormKpiOptions(2026)).resolves.toEqual({
      periodYears: [2026],
      indicators: [{ id: 'ind-1', code: 'CK-01', name: 'Revenue' }],
    });
    expect(mockedActivityApi.getSubmissionOptions).toHaveBeenCalledWith(2026);
  });
});
