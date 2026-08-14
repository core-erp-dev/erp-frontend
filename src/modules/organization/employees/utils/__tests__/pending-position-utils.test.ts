import {
  addPendingPosition,
  removePendingPosition,
  setPendingPrimary,
  type PendingPosition,
} from '../pending-position-utils';

const posA: PendingPosition = {
  positionId: 'a', positionName: 'Staf Unit', positionCode: 'UNIT-STAF-001',
  isPrimary: true, startDate: '2026-08-01',
};
const posB: PendingPosition = {
  positionId: 'b', positionName: 'Staf Keuangan', positionCode: 'KAU-KEU-STAF-001',
  isPrimary: false, startDate: '2026-08-14',
};

describe('pending-position-utils', () => {
  describe('addPendingPosition', () => {
    it('makes the first added position the primary', () => {
      const result = addPendingPosition([], { positionId: 'a', positionName: 'Staf Unit', positionCode: 'UNIT-STAF-001', startDate: '2026-08-01' });
      expect(result).toHaveLength(1);
      expect(result[0].isPrimary).toBe(true);
    });

    it('adds a second position as non-primary without touching the primary', () => {
      const result = addPendingPosition([posA], { positionId: 'b', positionName: 'Staf Keuangan', positionCode: 'KAU-KEU-STAF-001', startDate: '2026-08-14' });
      expect(result).toHaveLength(2);
      expect(result[0].isPrimary).toBe(true);
      expect(result[1].isPrimary).toBe(false);
    });

    it('does not duplicate an already-assigned position', () => {
      const result = addPendingPosition([posA, posB], { positionId: 'a', positionName: 'Staf Unit', positionCode: 'UNIT-STAF-001', startDate: '2026-08-01' });
      expect(result).toHaveLength(2);
    });
  });

  describe('removePendingPosition', () => {
    it('removes a non-primary position and keeps the primary', () => {
      const result = removePendingPosition([posA, posB], 'b');
      expect(result).toHaveLength(1);
      expect(result[0].positionId).toBe('a');
      expect(result[0].isPrimary).toBe(true);
    });

    it('promotes the first remaining position when the primary is removed', () => {
      const result = removePendingPosition([posA, posB], 'a');
      expect(result).toHaveLength(1);
      expect(result[0].positionId).toBe('b');
      expect(result[0].isPrimary).toBe(true);
    });

    it('returns an empty list when the last position is removed', () => {
      const result = removePendingPosition([posA], 'a');
      expect(result).toHaveLength(0);
    });
  });

  describe('setPendingPrimary', () => {
    it('switches the primary from position A to position B (exactly one primary)', () => {
      const result = setPendingPrimary([posA, posB], 'b');
      expect(result.filter((p) => p.isPrimary)).toHaveLength(1);
      expect(result.find((p) => p.positionId === 'b')?.isPrimary).toBe(true);
      expect(result.find((p) => p.positionId === 'a')?.isPrimary).toBe(false);
    });

    it('keeps a single primary when re-setting the same position', () => {
      const result = setPendingPrimary([posA, posB], 'a');
      expect(result.filter((p) => p.isPrimary)).toHaveLength(1);
      expect(result[0].isPrimary).toBe(true);
    });

    it('returns an unchanged list for an unknown position id', () => {
      const result = setPendingPrimary([posA, posB], 'zzz');
      expect(result).toEqual([posA, posB]);
    });
  });
});
