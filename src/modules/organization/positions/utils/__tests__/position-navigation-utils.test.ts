import { resolveCreateReturn, resolveEditReturn } from '../position-navigation-utils';

describe('position-navigation-utils', () => {
  describe('resolveCreateReturn', () => {
    it('back() when originating from the list (from=list)', () => {
      expect(resolveCreateReturn('list')).toBe('back');
    });

    it('back() when originating from detail (from=detail)', () => {
      expect(resolveCreateReturn('detail')).toBe('back');
    });

    it('replace to list on deep link / unknown origin', () => {
      expect(resolveCreateReturn(null)).toEqual({ replace: '/organization/positions' });
      expect(resolveCreateReturn('x')).toEqual({ replace: '/organization/positions' });
    });
  });

  describe('resolveEditReturn', () => {
    it('back() when originating from detail (from=detail)', () => {
      expect(resolveEditReturn('detail', 'pos-1')).toBe('back');
    });

    it('replace to detail on deep link / unknown origin', () => {
      expect(resolveEditReturn(null, 'pos-1')).toEqual({ replace: '/organization/positions/pos-1' });
      expect(resolveEditReturn('list', 'pos-1')).toEqual({ replace: '/organization/positions/pos-1' });
    });
  });
});
