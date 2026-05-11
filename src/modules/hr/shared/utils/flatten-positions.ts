/**
 * Flattens a nested PositionTree into a flat array.
 * Used by both hierarchy-view and assign-user-modal.
 */
import type { PositionTree, AssignedUser } from '../../hierarchy/types';

export interface FlatPosition {
  id: number;
  positionCode: string;
  positionName: string;
  positionLevel: number;
  parentId: number | null;
  parentName: string | null;
  isActive: boolean;
  assignedUsers: AssignedUser[];
}

/**
 * Recursively flattens a PositionTree into a flat array of FlatPosition objects.
 * @param tree - The nested position tree to flatten
 * @param parentName - The parent position name (null for root nodes)
 */
export const flattenPositionTree = (
  tree: PositionTree[],
  parentName: string | null = null,
): FlatPosition[] =>
  tree.flatMap((pos) => {
    const { children, ...rest } = pos;
    const flat: FlatPosition = {
      ...rest,
      parentName,
      assignedUsers: rest.assignedUsers ?? [],
    };
    const childPositions = children
      ? flattenPositionTree(children, pos.positionName)
      : [];
    return [flat, ...childPositions];
  });
