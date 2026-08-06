/**
 * Unit Performance module — shared types.
 *
 * Weight is stored/displayed in percentage points (30 = 30%). Realization and
 * Performance are computed backend-side from the existing Corporate KPI
 * calculation; null means NO_KPI_DATA (missing corporate data — never 0).
 */

export interface UnitPerformanceRow {
  id: string;
  organizationUnitId: string;
  unitCode: string;
  unitName: string;
  weight: number;
  /** (corporateActual / corporateTarget) × weight; null when NO_KPI_DATA. */
  realization: number | null;
  /** realization / weight × 100; null when NO_KPI_DATA. */
  performance: number | null;
  /** OK on computed rows; NO_KPI_DATA when corporate data is missing; null on mutation responses. */
  status: 'OK' | 'NO_KPI_DATA' | null;
}

export interface CreateUnitPerformanceRequest {
  organizationUnitId: string;
  weight: number;
}

export interface UpdateUnitPerformanceRequest {
  weight: number;
}
