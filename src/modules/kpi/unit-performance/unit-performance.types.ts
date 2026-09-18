/**
 * Unit Performance module — shared types.
 *
 * Weight matrix model: `kpi_unit_performances` is the GLOBAL registry of
 * participating units; the per-indicator weights live in the Indicator × Unit
 * matrix. The legacy single `weight` field on a row is deprecated (nullable,
 * never a calculation source). Realization is the weighted actual contribution
 * and performance is weightedActual / weightedTarget × 100 — null means
 * NO_KPI_DATA (missing corporate data) or MATRIX_INCOMPLETE (config not ready);
 * never a fabricated number.
 */

export type UnitPerformanceRowStatus = 'OK' | 'NO_KPI_DATA' | 'MATRIX_INCOMPLETE' | null;
export type UnitPerformanceIndicatorStatus = 'OK' | 'NO_KPI_DATA' | 'NOT_CONFIGURED' | 'MATRIX_INCOMPLETE';

export interface UnitPerformanceRow {
  id: string;
  organizationUnitId: string;
  unitCode: string;
  unitName: string;
  /** DEPRECATED legacy global weight — nullable, never used by the calculation. */
  weight: number | null;
  /** Weighted contribution of the corporate actual result: Σ actualResult × w / 100. */
  realization: number | null;
  /** Weighted achievement percentage: weightedActual / weightedTarget × 100. */
  performance: number | null;
  status: UnitPerformanceRowStatus;
  /** Period-scoped indicator breakdown; absent only for legacy payloads. */
  indicators: UnitPerformanceIndicatorRow[];
}

export interface UnitPerformanceIndicatorRow {
  id: string;
  code: string;
  name: string;
  aspectName: string | null;
  unitWeight: number | null;
  actualValue: number | null;
  targetValue: number | null;
  contribution: number | null;
  /** Canonical indicator achievement: actualValue / targetValue × 100. */
  performance: number | null;
  calculationStatus: string | null;
  status: UnitPerformanceIndicatorStatus;
}

export interface UnitPerformanceDetail {
  id: string;
  organizationUnitId: string;
  unitCode: string;
  unitName: string;
  year: number;
  month: number | null;
  realization: number | null;
  performance: number | null;
  status: UnitPerformanceRowStatus;
  indicators: UnitPerformanceIndicatorRow[];
}

/** Adding a participant only needs the org unit — no global weight anymore. */
export interface CreateUnitPerformanceRequest {
  organizationUnitId: string;
}

// ── weight matrix (Indicator × Unit) ────────────────────────────────────

export interface UnitPerformanceWeightEntry {
  indicatorId: string;
  unitPerformanceId: string;
  /** Percentage points: 3 = 3%. */
  weight: number;
}

export interface UnitPerformanceMatrixUnit {
  /** The UnitPerformance configuration id. */
  id: string;
  organizationUnitId: string;
  unitCode: string;
  unitName: string;
}

export interface UnitPerformanceMatrixIndicator {
  /** The CorporateKpi indicator id. */
  id: string;
  code: string;
  name: string;
  aspectName: string;
}

export interface UnitPerformanceWeightMatrix {
  year: number;
  units: UnitPerformanceMatrixUnit[];
  indicators: UnitPerformanceMatrixIndicator[];
  weights: UnitPerformanceWeightEntry[];
  /** indicatorId → total of the unit weights. */
  totals: Record<string, number>;
  /** true only when every pair exists and every indicator totals exactly 100%. */
  complete: boolean;
}

export interface UpdateUnitPerformanceWeightMatrixRequest {
  weights: UnitPerformanceWeightEntry[];
}
