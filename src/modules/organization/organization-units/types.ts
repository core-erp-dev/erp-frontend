export enum OrganizationUnitType {
  COMPANY = 'COMPANY',
  DIRECTORATE = 'DIRECTORATE',
  DIVISION = 'DIVISION',
  DEPARTMENT = 'DEPARTMENT',
  SECTION = 'SECTION',
  TEAM = 'TEAM',
  OTHER = 'OTHER',
}

export const UNIT_TYPE_LABEL: Record<string, string> = {
  COMPANY: 'Company',
  DIRECTORATE: 'Directorate',
  DIVISION: 'Division',
  DEPARTMENT: 'Department',
  SECTION: 'Section',
  TEAM: 'Team',
  OTHER: 'Other',
};

export const UNIT_TYPE_CHIP_COLOR: Record<string, 'default' | 'accent' | 'success' | 'warning' | 'danger'> = {
  COMPANY: 'accent',
  DIRECTORATE: 'accent',
  DIVISION: 'accent',
  DEPARTMENT: 'default',
  SECTION: 'default',
  TEAM: 'default',
  OTHER: 'default',
};

export interface OrganizationUnitResponse {
  id: string;
  parentId: string | null;
  parentName: string | null;
  unitCode: string;
  unitName: string;
  unitType: OrganizationUnitType;
  description: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  directChildrenCount: number;
  activePositionCount: number;
  children: OrganizationUnitResponse[];
}

export interface OrganizationUnitFilterParams {
  search?: string;
  type?: OrganizationUnitType;
  scope?: 'current' | 'deleted';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface OrganizationUnitTreeResponse {
  tree: OrganizationUnitResponse[];
}

export interface CreateOrganizationUnitRequest {
  unitCode: string;
  unitName: string;
  unitType: OrganizationUnitType;
  parentId?: string | null;
  description?: string;
}

export interface UpdateOrganizationUnitRequest {
  unitCode?: string;
  unitName?: string;
  unitType?: OrganizationUnitType;
  parentId?: string | null;
  description?: string;
}

export type { PaginatedResponse } from '@/types/api';
