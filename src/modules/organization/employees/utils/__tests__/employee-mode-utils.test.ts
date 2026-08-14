import {
  buildPositionPayload,
  buildRolesUpdate,
  isPositionless,
} from '../employee-mode-utils';
import type { CoreUser, UserPositionInput } from '../../types';

const positionedUser = {
  positions: [
    { positionId: 'p1', isPrimary: true, isActive: true, positionName: 'A' } as CoreUser['positions'][number],
    { positionId: 'p2', isPrimary: false, isActive: true, positionName: 'B' } as CoreUser['positions'][number],
  ],
} as Pick<CoreUser, 'positions'>;

const positionlessUser = { positions: [] } as Pick<CoreUser, 'positions'>;

const pending: UserPositionInput[] = [
  { positionId: 'p1', isPrimary: true, startDate: '2026-08-01' },
  { positionId: 'p2', isPrimary: false, startDate: '2026-08-14' },
];

describe('employee-mode-utils', () => {
  describe('isPositionless', () => {
    it('is false for an employee with active positions', () => {
      expect(isPositionless(positionedUser)).toBe(false);
    });

    it('is true for an employee without positions', () => {
      expect(isPositionless(positionlessUser)).toBe(true);
    });

    it('is false for null/undefined data (create mode)', () => {
      expect(isPositionless(null)).toBe(false);
      expect(isPositionless(undefined)).toBe(false);
    });

    it('ignores inactive position history', () => {
      const historyOnly = {
        positions: [{ positionId: 'p1', isPrimary: true, isActive: false } as CoreUser['positions'][number]],
      } as Pick<CoreUser, 'positions'>;
      expect(isPositionless(historyOnly)).toBe(true);
    });
  });

  describe('buildPositionPayload', () => {
    it('positioned mode sends the pending assignments', () => {
      expect(buildPositionPayload(false, pending)).toEqual(pending);
    });

    it('positionless mode sends an empty array (deterministic, no hidden state)', () => {
      expect(buildPositionPayload(true, pending)).toEqual([]);
    });
  });

  describe('buildRolesUpdate', () => {
    it('positionless create sends the selected roles', () => {
      expect(buildRolesUpdate(true, false, [1, 2])).toEqual({ roleIds: [1, 2] });
    });

    it('positionless edit sends the selected roles', () => {
      expect(buildRolesUpdate(true, true, [2])).toEqual({ roleIds: [2] });
    });

    it('positioned edit drops stale direct roles with an empty set', () => {
      expect(buildRolesUpdate(false, true, [1])).toEqual({ roleIds: [] });
    });

    it('positioned create sends no roles update (new user has no direct roles)', () => {
      expect(buildRolesUpdate(false, false, [1])).toBeNull();
    });
  });
});
