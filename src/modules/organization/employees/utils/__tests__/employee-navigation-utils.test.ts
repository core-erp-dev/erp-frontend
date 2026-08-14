import { resolveEditReturn } from '../employee-navigation-utils';

describe('employee-navigation-utils', () => {
  describe('resolveEditReturn', () => {
    it('returns back when the Edit page was opened from the Detail page', () => {
      expect(resolveEditReturn('detail', 'abc-123')).toBe('back');
    });

    it('returns replace-to-Detail for a deep link (no from param)', () => {
      expect(resolveEditReturn(null, 'abc-123')).toEqual({
        replace: '/organization/employees/abc-123',
      });
    });

    it('returns replace-to-Detail for an unknown/foreign origin marker', () => {
      expect(resolveEditReturn('list', 'abc-123')).toEqual({
        replace: '/organization/employees/abc-123',
      });
      expect(resolveEditReturn('create', 'abc-123')).toEqual({
        replace: '/organization/employees/abc-123',
      });
    });
  });
});
