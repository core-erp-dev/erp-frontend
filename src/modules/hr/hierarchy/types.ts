// Position hierarchy types based on Employee Management API

export interface AssignedUser {
  id: string;
  fullName: string;
  email: string;
  nip: string;
}

export interface Position {
  id: number;
  positionCode: string;
  positionName: string;
  parentId: number | null;
  parentName: string | null;
  positionLevel: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  children: PositionTree[];
  assignedUsers?: AssignedUser[];
}

export interface PositionTree extends Omit<Position, 'children'> {
  children: PositionTree[];
}

export interface PositionRequest {
  positionCode: string;
  positionName: string;
  parentId?: number | null;
  positionLevel?: number;
}

export interface PositionUpdateRequest {
  positionCode?: string;
  positionName?: string;
  positionLevel?: number;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  title: string;
  status: number;
  detail: string;
  timestamp: string;
}

export interface PositionTreeResponse {
  tree: PositionTree[];
}
