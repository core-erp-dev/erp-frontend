'use client';

import { useState, useEffect } from 'react';
import { organizationApi } from '../services/organization-api';
import { findInTree } from '@/modules/hr/organization/shared/utils/find-in-tree';
import type { PositionTree } from '../types';

interface UsePositionDetailReturn {
  position: PositionTree | null;
  isLoading: boolean;
  error: string | null;
}

export function usePositionDetail(id: string): UsePositionDetailReturn {
  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!cancelled) {
          if (!found) setError('Jabatan tidak ditemukan');
          else setPosition(found);
        }
      } catch {
        if (!cancelled) setError('Gagal memuat data jabatan');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { position, isLoading, error };
}
