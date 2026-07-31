'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi } from '../services/organization-api';
import { findInTree } from '@/modules/organization/shared/utils/find-in-tree';
import type { PositionTree } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UsePositionDetailReturn {
  position: PositionTree | null;
  isLoading: boolean;
  error: string | null;
  deletePosition: () => Promise<boolean>;
  isDeleting: boolean;
  refresh: () => Promise<void>;
}

export function usePositionDetail(id: string): UsePositionDetailReturn {
  const [position, setPosition] = useState<PositionTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tree = await organizationApi.fetchPositionTree();
        const found = findInTree(tree, id);
        if (!cancelled) {
          if (!found) setError('Position not found');
          else setPosition(found);
        }
      } catch {
        if (!cancelled) setError('Failed to load position data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Silent refetch (no full-page spinner) — used after assign/remove mutations
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const tree = await organizationApi.fetchPositionTree();
      const found = findInTree(tree, id);
      if (!found) setError('Position not found');
      else setPosition(found);
    } catch {
      setError('Failed to load position data');
    }
  }, [id]);

  const deleteFn = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await organizationApi.deletePosition(id);
      toast.success('Position deleted successfully');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to delete position'));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  return { position, isLoading, error, deletePosition: deleteFn, isDeleting, refresh };
}
