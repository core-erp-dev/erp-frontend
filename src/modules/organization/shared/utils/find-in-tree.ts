import type { PositionTree } from '@/modules/organization/positions/types';

/** Find a position node by ID in a position tree (recursive). */
export function findInTree(tree: PositionTree[], id: string): PositionTree | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length > 0) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
