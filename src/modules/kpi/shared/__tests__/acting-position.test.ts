/**
 * Acting-Position identity tests — `actingPositionId` is a core_positions.id
 * (never a user-position-assignment id), and the payload helper must never
 * guess the primary/first position.
 */
import { buildActingPositionPayload, type ActingPosition } from '../acting-position';

const sample: ActingPosition = {
  positionId: 'pos-123',        // core_positions.id — THE identity
  positionName: 'Manager HR',
  userPositionId: 'up-456',     // core_user_positions.id — different namespace
  userId: 'user-789',
  isPrimary: false,
};

describe('acting-position payload', () => {
  it('returns the core_positions.id for a selected position', () => {
    expect(buildActingPositionPayload(sample)).toBe('pos-123');
  });

  it('never returns the user-position-assignment id', () => {
    expect(buildActingPositionPayload(sample)).not.toBe('up-456');
  });

  it('returns undefined when no position is selected (no implicit default)', () => {
    expect(buildActingPositionPayload(null)).toBeUndefined();
  });

  it('distinguishes positionId from userPositionId fields', () => {
    expect(sample.positionId).not.toBe(sample.userPositionId);
  });
});
