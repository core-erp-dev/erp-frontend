/**
 * Unit Performance module — shared types.
 *
 * Weight matrix model: `kpi_unit_performances` is the GLOBAL registry of
 * participating units; the per-indicator weights live in the Indicator × Unit
 * matrix. The legacy single `weight` field on a row is deprecated (nullable,
 * never a calculation source). Realization and performance are weighted
 * CONTRIBUTIONS attributed from the corporate KPI evaluation — null means
 * NO_KPI_DATA (missing corporate data) or MATRIX_INCOMPLETE (config not ready);
 * never a fabricated number.
 */

export type UnitPerformanceRowStatus = 'OK' | 'NO_KPI_DATA' | 'MATRIX_INCOMPLETE' | null;

export interface UnitPerformanceRow {
  id: string;
  organizationUnitId: string;
  unitCode: string;
  unitName: string;
  /** DEPRECATED legacy global weight — nullable, never used by the calculation. */
  weight: number | null;
  /** Weighted contribution of the corporate actual result: Σ actualResult × w / 100. */
  realization: number | null;
  /** Weighted contribution percentage: Σ achievement × w / 100. */
  performance: number | null;
  status: UnitPerformanceRowStatus;
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
  calculationStatus: string | null;
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
