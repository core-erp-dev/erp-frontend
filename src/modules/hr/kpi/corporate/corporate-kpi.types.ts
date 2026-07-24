/**
 * Corporate KPI — read-only DTOs matching backend response contract.
 * Only types required by P1.1 (read-only slice).
 */

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
