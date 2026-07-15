'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationApi } from '../services/organization-api';
import { findInTree } from '@/modules/hr/organization/shared/utils/find-in-tree';
import type { PositionTree } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UsePositionDetailReturn {
  position: PositionTree | null;
  isLoading: boolean;
  error: string | null;
  deletePosition: () => Promise<boolean>;
  isDeleting: boolean;
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

  const deleteFn = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await organizationApi.deletePosition(id);
      toast.success('Jabatan berhasil dihapus');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus jabatan'));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  return { position, isLoading, error, deletePosition: deleteFn, isDeleting };
}
