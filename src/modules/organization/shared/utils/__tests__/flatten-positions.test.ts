/**
 * flattenPositionTree / flattenPositionsByDepth / findPositionInTree —
 * contract tests: an empty array stays empty (the boundary layer normalizes
 * undefined/missing trees to []), a populated tree flattens recursively, and
 * the depth variant annotates each node with its depth.
 */
import {
  flattenPositionTree,
  flattenPositionsByDepth,
  findPositionInTree,
} from '../flatten-positions';
import type { PositionTree } from '../../positions/types';

const node = (id: string, name: string, children: PositionTree[] = [], level = 1): PositionTree => ({
  id,
  positionCode: `C-${id}`,
  positionName: name,
  description: null,
  parentId: null,
  parentName: null,
  positionLevel: level,
  organizationUnit: null,
  unitName: null,
  isActive: true,
  deletedAt: null,
  children,
});

describe('flattenPositionTree', () => {
  it('returns an empty array for an empty tree', () => {
    expect(flattenPositionTree([])).toEqual([]);
  });

  it('flattens a flat tree into one entry per position', () => {
    const tree = [node('a', 'Direktur'), node('b', 'Staf Unit')];
    const flat = flattenPositionTree(tree);
    expect(flat).toHaveLength(2);
    expect(flat[0]).toMatchObject({ id: 'a', positionName: 'Direktur', parentName: null });
    expect(flat[1]).toMatchObject({ id: 'b', positionName: 'Staf Unit', parentName: null });
    expect(flat[0].assignedUsers).toEqual([]);
  });

  it('recursively flattens nested children with the parent name attached', () => {
    const tree = [node('a', 'Direksi', [node('b', 'Keuangan', [node('c', 'Staf Unit')], 2)], 1)];
    const flat = flattenPositionTree(tree);
    expect(flat.map((p) => p.positionName)).toEqual(['Direksi', 'Keuangan', 'Staf Unit']);
    expect(flat[1].parentName).toBe('Direksi');
    expect(flat[2].parentName).toBe('Keuangan');
  });
});

describe('flattenPositionsByDepth', () => {
  it('returns an empty array for an empty tree', () => {
    expect(flattenPositionsByDepth([])).toEqual([]);
  });

  it('annotates nested positions with their depth', () => {
    const tree = [node('a', 'Direksi', [node('b', 'Keuangan', [node('c', 'Staf Unit')], 2)], 1)];
    const flat = flattenPositionsByDepth(tree);
    expect(flat.map(({ position, depth }) => [position.positionName, depth])).toEqual([
      ['Direksi', 0],
      ['Keuangan', 1],
      ['Staf Unit', 2],
    ]);
  });
});

describe('findPositionInTree', () => {
  it('finds a deeply nested position by id', () => {
    const tree = [node('a', 'Direksi', [node('b', 'Keuangan', [node('c', 'Staf Unit')], 2)], 1)];
    expect(findPositionInTree(tree, 'c')?.positionName).toBe('Staf Unit');
  });

  it('returns undefined when the id does not exist', () => {
    expect(findPositionInTree([node('a', 'Direksi')], 'zzz')).toBeUndefined();
  });
});
