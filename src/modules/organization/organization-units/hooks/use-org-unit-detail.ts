'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationUnitApi } from '../services/organization-unit-api';
import type { OrganizationUnitResponse } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseOrgUnitDetailReturn {
  unit: OrganizationUnitResponse | null;
  isLoading: boolean;
  error: string | null;
  deleteUnit: () => Promise<boolean>;
  isDeleting: boolean;
  restoreUnit: () => Promise<boolean>;
  isRestoring: boolean;
}

export function useOrgUnitDetail(id: string): UseOrgUnitDetailReturn {
  const [unit, setUnit] = useState<OrganizationUnitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadUnit = useCallback(async () => {
    try {
      const data = await organizationUnitApi.getUnitById(id);
      setUnit(data);
      setError(null);
    } catch {
      setError('Gagal memuat data unit organisasi');
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await organizationUnitApi.getUnitById(id);
        if (!cancelled) setUnit(data);
      } catch {
        if (!cancelled) setError('Gagal memuat data unit organisasi');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const deleteFn = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await organizationUnitApi.deleteUnit(id);
      toast.success('Unit organisasi berhasil dihapus');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menghapus unit organisasi'));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  const restoreFn = useCallback(async (): Promise<boolean> => {
    setIsRestoring(true);
    try {
      await organizationUnitApi.restoreUnit(id);
      toast.success('Unit organisasi berhasil dipulihkan');
      await loadUnit();
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memulihkan unit organisasi'));
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [id, loadUnit]);

  return { unit, isLoading, error, deleteUnit: deleteFn, isDeleting, restoreUnit: restoreFn, isRestoring };
}
