'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

export interface KpiTableStateConfig {
  sortOptions: readonly string[];
  defaultSort: string;
  defaultDirection?: 'asc' | 'desc';
  filterOptions?: readonly string[];
}

export function useKpiTableState(config: KpiTableStateConfig) {
  const urlSearch = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('popstate', onStoreChange);
      return () => window.removeEventListener('popstate', onStoreChange);
    },
    () => window.location.search,
    () => '',
  );
  const pathname = typeof window === 'undefined' ? '' : window.location.pathname;
  const searchParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const filters = useMemo(() => {
    const sortBy = config.sortOptions.includes(searchParams.get('sortBy') ?? '')
      ? searchParams.get('sortBy')!
      : config.defaultSort;
    const direction = searchParams.get('sortDirection') === 'desc' ? 'desc' : (config.defaultDirection ?? 'asc');
    const pageValue = Number(searchParams.get('page'));
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const filter = searchParams.get('status') ?? '';
    return { search: searchParams.get('search') ?? '', filter: config.filterOptions?.includes(filter) ? filter : '', sortBy, direction, page, size: 10 };
  }, [config, searchParams]);

  const updateUrl = useCallback((patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.filter) params.set('status', next.filter);
    if (next.sortBy !== config.defaultSort || next.direction !== (config.defaultDirection ?? 'asc')) {
      params.set('sortBy', next.sortBy);
      params.set('sortDirection', next.direction);
    }
    if (next.page > 1) params.set('page', String(next.page));
    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);
    window.dispatchEvent(new Event('popstate'));
    setIsQueryLoading(true);
  }, [config, filters, pathname]);

  const setSearch = useCallback((search: string) => updateUrl({ search, page: 1 }), [updateUrl]);
  const setFilter = useCallback((filter: string) => updateUrl({ filter, page: 1 }), [updateUrl]);
  const setSort = useCallback((sortBy: string, direction: 'asc' | 'desc') => updateUrl({ sortBy, direction, page: 1 }), [updateUrl]);
  const setPage = useCallback((page: number) => updateUrl({ page }), [updateUrl]);
  const reset = useCallback(() => updateUrl({ search: '', filter: '', sortBy: config.defaultSort, direction: config.defaultDirection ?? 'asc', page: 1 }), [config, updateUrl]);

  // The URL is the acknowledgement that the new query is active. Rows remain
  // hidden while Next applies it, matching the Pegawai transition behavior.
  useEffect(() => {
    // URL navigation is the external acknowledgement for the transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsQueryLoading(false);
  }, [searchParams]);

  return { filters, isQueryLoading, setSearch, setFilter, setSort, setPage, reset };
}

export function paginateKpiItems<T>(items: T[], page: number, size = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return { items: items.slice((safePage - 1) * size, safePage * size), totalItems: items.length, totalPages, page: safePage };
}
