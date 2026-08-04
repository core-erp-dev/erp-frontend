/** Corporate KPI Variables — DTOs matching the backend contract. */

export interface Variable {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVariableRequest {
  code: string;
  name: string;
  unit: string | null;
  description: string | null;
}

/** Update carries NO code field — the code is immutable (backend contract). */
export interface UpdateVariableRequest {
  name: string;
  unit: string | null;
  description: string | null;
}
