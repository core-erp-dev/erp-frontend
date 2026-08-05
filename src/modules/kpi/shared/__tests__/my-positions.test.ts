/**
 * Self-Positions client contract tests — `GET /api/v1/users/me/positions`.
 *
 * Proves: exact method + path (no query/path parameters), response-envelope
 * parsing, `positionId` = `core_positions.id` while `id` = the assignment id
 * (never swapped), the adapter maps the assignment id to `userPositionId`,
 * and NO Position is implicitly selected — all returned assignments are kept.
 */
import { api } from '@/lib/axios';
import { getMyPositions, toActingPosition, toActingPositions } from '../my-positions';
import type { ApiResponse } from '@/types/api';
import type { MyPositionResponse } from '../my-positions';

jest.mock('@/lib/axios');
const mockedApi = jest.mocked(api);

const assignment: MyPositionResponse = {
  id: 'assignment-111',        // core_user_positions.id
  userId: 'user-1',
  userName: 'Ada',
  userEmail: 'ada@test.com',
  positionId: 'position-222',  // core_positions.id — visibly different
  positionName: 'Manager',
  positionCode: 'MGR',
  startDate: '2026-01-01',
  endDate: null,
  isPrimary: true,
  isActive: true,
  assignedBy: 'user-0',
  createdAt: '2026-01-01T00:00:00',
};

const second = {
  ...assignment,
  id: 'assignment-333',
  positionId: 'position-444',
  positionName: 'Staff',
  positionCode: 'STF',
  isPrimary: false,
};

const wrap = (data: MyPositionResponse[]): ApiResponse<MyPositionResponse[]> =>
  ({ status: 200, message: 'ok', data });

describe('getMyPositions — T-me client', () => {
  it('GET /api/v1/users/me/positions with NO query or path parameters', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([assignment]) });
    const result = await getMyPositions();
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/users/me/positions');
    expect(result).toEqual([assignment]);
  });

  it('parses the standard response envelope (data array)', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: wrap([assignment, second]) });
    const result = await getMyPositions();
    expect(result).toHaveLength(2);
    expect(result[0].positionName).toBe('Manager');
  });
});

describe('toActingPosition — identity contract', () => {
  it('positionId is core_positions.id; the assignment id maps to userPositionId — never swapped', () => {
    const acting = toActingPosition(assignment);
    expect(acting.positionId).toBe('position-222');
    expect(acting.userPositionId).toBe('assignment-111');
    expect(acting.positionId).not.toBe(assignment.id);
    expect(acting.positionId).not.toBe(acting.userPositionId);
    expect(acting.isPrimary).toBe(true);
  });

  it('preserves every returned assignment — no primary/first Position is silently selected', () => {
    const acting = toActingPositions([assignment, second]);
    expect(acting).toHaveLength(2);
    expect(acting.map((p) => p.positionId)).toEqual(['position-222', 'position-444']);
    expect(acting.map((p) => p.userPositionId)).toEqual(['assignment-111', 'assignment-333']);
  });

  it('still returns the ONLY position without selecting it implicitly', () => {
    const acting = toActingPositions([assignment]);
    expect(acting).toHaveLength(1);
    expect(acting[0].positionId).toBe('position-222');
  });
});
