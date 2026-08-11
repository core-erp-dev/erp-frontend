/**
 * Shared dashboard test fixtures — realistic backend-shaped payloads for page
 * and component tests.
 */
import type { KpiDashboardResponse, KpiIndicatorWarning } from './kpi-dashboard.types';

export function indicator(overrides: Partial<KpiIndicatorWarning>): KpiIndicatorWarning {
  return {
    id: 'ind-1',
    code: 'IND_01_01',
    name: 'Return on Equity',
    aspectId: 'asp-1',
    aspectName: 'Keuangan',
    actualScore: 2,
    targetScore: 5,
    actualResult: 0.11,
    targetResult: 0.275,
    achievement: 40,
    warningLevel: 'RED',
    evaluationStatus: 'OK',
    reasonCode: null,
    ...overrides,
  };
}

export function buildDashboardResponse(
  overrides?: Partial<KpiDashboardResponse>,
): KpiDashboardResponse {
  return {
    indicators: [
      indicator({ code: 'IND_01_01', name: 'ROE', warningLevel: 'RED', actualScore: 2, achievement: 40 }),
      indicator({
        id: 'ind-2', code: 'IND_02_02', name: 'Ratio Diklat', aspectName: 'SDM',
        actualScore: null, targetScore: 5, actualResult: null, targetResult: 0.2,
        achievement: null, warningLevel: null, evaluationStatus: 'NOT_EVALUATED',
        reasonCode: 'ANNUAL_REQUIRED_FOR_RANGE',
      }),
      indicator({
        id: 'ind-3', code: 'IND_03_01', name: 'Cakupan Layanan', aspectName: 'Layanan',
        actualScore: 3, targetScore: 4, actualResult: 0.15, targetResult: 0.2,
        achievement: 75, warningLevel: 'YELLOW',
      }),
      indicator({
        id: 'ind-4', code: 'IND_04_05', name: 'Akurasi Meter', aspectName: 'Teknis',
        actualScore: 5, targetScore: 4, actualResult: 0.325, targetResult: 0.26,
        achievement: 125, warningLevel: 'GREEN',
      }),
      indicator({
        id: 'ind-5', code: 'IND_03_02', name: 'Tekanan Layanan', aspectName: 'Layanan',
        actualScore: null, targetScore: 5, actualResult: null, targetResult: 0.25,
        achievement: null, warningLevel: null, evaluationStatus: 'MISSING_VALUE',
        reasonCode: 'MISSING_VALUE',
      }),
    ],
    unitPerformance: [
      {
        id: 'up-1', organizationUnitId: 'org-1', unitCode: 'U01', unitName: 'Unit Distribusi',
        weight: 50, realization: 12.5, performance: 25, status: 'OK',
      },
      {
        id: 'up-2', organizationUnitId: 'org-2', unitCode: 'U02', unitName: 'Unit Pelayanan',
        weight: 100, realization: 62.5, performance: 62.5, status: 'OK',
      },
    ],
    summary: {
      redCount: 1, yellowCount: 1, greenCount: 1, notEvaluatedCount: 2,
      totalIndicatorCount: 5, evaluatedIndicatorCount: 3,
      totalActualScore: 10, totalTargetScore: 14,
      totalActualResult: 0.585, totalTargetResult: 0.935,
      status: 'OK',
    },
    ...overrides,
  };
}
