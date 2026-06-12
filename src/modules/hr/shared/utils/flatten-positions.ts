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

export interface FlatPositionWithDepth {
  position: PositionTree;
  depth: number;
}

export const flattenPositionsByDepth = (
  positions: PositionTree[],
  depth = 0,
): FlatPositionWithDepth[] => {
  const result: FlatPositionWithDepth[] = [];
  positions.forEach((pos) => {
    result.push({ position: pos, depth });
    if (pos.children && pos.children.length > 0) {
      result.push(...flattenPositionsByDepth(pos.children, depth + 1));
    }
  });
  return result;
};

export const findPositionInTree = (
  positions: PositionTree[],
  id: number,
): PositionTree | undefined => {
  for (const pos of positions) {
    if (pos.id === id) return pos;
    if (pos.children && pos.children.length > 0) {
      const found = findPositionInTree(pos.children, id);
      if (found) return found;
    }
  }
  return undefined;
};
