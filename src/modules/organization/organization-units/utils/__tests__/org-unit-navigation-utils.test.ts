import { resolveCreateReturn, resolveEditReturn } from '../org-unit-navigation-utils';

describe('org-unit-navigation-utils', () => {
  describe('resolveCreateReturn', () => {
    it('backs when opened from the list (?from=list)', () => {
      expect(resolveCreateReturn('list')).toBe('back');
    });

    it('backs when opened from a Detail page (?from=detail)', () => {
      expect(resolveCreateReturn('detail')).toBe('back');
    });

    it('replaces to the list for deep links / refresh', () => {
      expect(resolveCreateReturn(null)).toEqual({ replace: '/organization/organization-units' });
      expect(resolveCreateReturn('parentId-x')).toEqual({ replace: '/organization/organization-units' });
    });
  });

  describe('resolveEditReturn', () => {
    it('backs when the Edit page was opened from Detail (?from=detail)', () => {
      expect(resolveEditReturn('detail', 'u1')).toBe('back');
    });

    it('replaces to the Detail page for deep links / refresh', () => {
      expect(resolveEditReturn(null, 'u1')).toEqual({ replace: '/organization/organization-units/u1' });
      expect(resolveEditReturn('list', 'u1')).toEqual({ replace: '/organization/organization-units/u1' });
    });
  });
});
