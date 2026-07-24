/** Corporate KPI — DTOs matching backend contract. */

export interface CorporateKpiNode {
  id: string;
  parentId: string | null;
  parentName: string | null;
  code: string;
  name: string;
  nodeType: KpiNodeType;
  year: number;
  unit: string | null;
  targetValue: number | null;
  status: KpiStatus;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  children: CorporateKpiNode[];
}

export type KpiNodeType = 'ASPECT' | 'INDICATOR';
export type KpiStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

/* ── Request DTOs ── */

export interface CreateKpiRequest {
  code: string;
  name: string;
  nodeType: KpiNodeType;
  year: number;
  parentId: string | null;
  unit: string | null;
  targetValue: number | null;
  description: string | null;
}

export interface UpdateKpiRequest {
  code: string;
  name: string;
  parentId: string | null;
  unit: string | null;
  targetValue: number | null;
  description: string | null;
  // Note: nodeType and year are immutable — NOT sent in update.
}
