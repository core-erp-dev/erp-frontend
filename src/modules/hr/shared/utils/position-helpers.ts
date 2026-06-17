/**
 * Shared helper functions for position-related operations.
 * Extracted from hierarchy-view to enable reuse and testability.
 */
import type { FlatPosition } from './flatten-positions';
import type { PositionTree } from '../../positions/types';

/** Row types for the hierarchy table rendering. */
export interface EmployeeRow {
  key: string;
  id: string;
  type: 'employee';
  fullName: string;
  nip: string;
  email: string;
}

export interface PositionRow {
  key: string;
  id: string;
  type: 'position';
  position: FlatPosition;
  children: EmployeeRow[];
}

/** Converts a flat list of positions into table-renderable rows with nested employee rows. */
export const buildTableItems = (positions: FlatPosition[]): PositionRow[] =>
  positions.map((pos) => {
    const children: EmployeeRow[] =
      pos.assignedUsers.length > 0
        ? pos.assignedUsers.map((user) => ({
            key: `emp-${pos.id}-${user.id}`,
            id: user.id,
            type: 'employee' as const,
            fullName: user.fullName,
            nip: user.nip,
            email: user.email,
          }))
        : [
            {
              key: `empty-${pos.id}`,
              id: `empty-${pos.id}`,
              type: 'employee' as const,
              fullName: '',
              nip: '',
              email: '',
            },
          ];

    return {
      key: `pos-${pos.id}`,
      id: pos.id,
      type: 'position' as const,
      position: pos,
      children,
    };
  });

/** Returns a semantic chip color based on position hierarchy level. */
export const getLevelColor = (
  level: number,
): 'accent' | 'default' | 'success' | 'warning' | 'danger' => {
  switch (level) {
    case 1:
      return 'accent';
    case 2:
      return 'default';
    case 3:
      return 'success';
    case 4:
      return 'warning';
    default:
      return 'danger';
  }
};

/** Extracts initials from a full name (max 2 characters). */
export const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Converts a FlatPosition back into a PositionTree shape (for modal interactions). */
export const toPositionTree = (pos: FlatPosition): PositionTree => ({
  id: pos.id,
  positionCode: pos.positionCode,
  positionName: pos.positionName,
  description: null,
  parentId: pos.parentId,
  parentName: pos.parentName,
  positionLevel: pos.positionLevel,
  isActive: pos.isActive,
  deletedAt: null,
  assignedUsers: pos.assignedUsers,
  children: [],
});
