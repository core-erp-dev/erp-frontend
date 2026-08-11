/**
 * KPI Dashboard (PMS) — shared types mirroring the backend contract
 * `GET /api/v1/kpi-dashboard?year=&fromMonth=&toMonth=` exactly.
 *
 * The frontend never recomputes evaluation, classification, counts, totals or
 * unit performance — it only formats and filters what the backend sends.
 */

import type { UnitPerformanceRow } from '@/modules/kpi/unit-performance/unit-performance.types';

/** Traffic-light classification — ONLY present on OK indicators. */
export type KpiWarningLevel = 'RED' | 'YELLOW' | 'GREEN';

/** Mirror of the backend evaluation status vocabulary. */
export type KpiEvaluationStatus =
  | 'OK'
  | 'NOT_EVALUATED'
  | 'MISSING_VALUE'
  | 'DIVISION_BY_ZERO'
  | 'NOT_CONFIGURED'
  | 'INVALID_FORMULA';

export interface KpiIndicatorWarning {
  id: string;
  code: string;
  name: string;
  aspectId: string;
  aspectName: string;
  /** Score 1–5 from the existing assessment rules; null when not evaluated. */
  actualScore: number | null;
  targetScore: number | null;
  actualResult: number | null;
  targetResult: number | null;
  /** actualScore / targetScore × 100 (scale 4); OK indicators with targetScore > 0 only. */
  achievement: number | null;
  /** RED | YELLOW | GREEN — null for every non-OK indicator. */
  warningLevel: KpiWarningLevel | null;
  evaluationStatus: KpiEvaluationStatus;
  /** null when OK; ANNUAL_REQUIRED_FOR_RANGE or the failing status otherwise. */
  reasonCode: string | null;
}

/** Four summary totals + status-card counts — backend-computed, shown as-is. */
export interface KpiDashboardSummary {
  redCount: number;
  yellowCount: number;
  greenCount: number;
  notEvaluatedCount: number;
  totalIndicatorCount: number;
  evaluatedIndicatorCount: number;
  /** null = NO_KPI_DATA (never 0). */
  totalActualScore: number | null;
  totalTargetScore: number | null;
  totalActualResult: number | null;
  totalTargetResult: number | null;
  /** OK | NO_KPI_DATA. */
  status: 'OK' | 'NO_KPI_DATA';
}

export interface KpiDashboardResponse {
  /** Every indicator of the period in canonical tree order (all statuses). */
  indicators: KpiIndicatorWarning[];
  /** Same DTO as GET /unit-performances. */
  unitPerformance: UnitPerformanceRow[];
  summary: KpiDashboardSummary;
}

export interface DashboardPeriod {
  year: number;
  /** Both null = annual evaluation. */
  fromMonth: number | null;
  toMonth: number | null;
}

/** User-facing reason vocabulary for the "Tidak Dievaluasi" tab. */
export const REASON_LABELS: Record<string, string> = {
  ANNUAL_REQUIRED_FOR_RANGE: 'Membutuhkan data tahunan — tidak dievaluasi pada rentang parsial',
  MISSING_VALUE: 'Data nilai periode tidak tersedia',
  DIVISION_BY_ZERO: 'Perhitungan gagal — pembagian dengan nol',
  NOT_CONFIGURED: 'Indikator belum dikonfigurasi lengkap',
  INVALID_FORMULA: 'Formula indikator tidak valid',
};

export function reasonLabel(reasonCode: string | null): string | null {
  if (reasonCode == null) return null;
  return REASON_LABELS[reasonCode] ?? reasonCode;
}
