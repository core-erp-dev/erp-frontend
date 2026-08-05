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
}

export function useOrgUnitDetail(id: string): UseOrgUnitDetailReturn {
  const [unit, setUnit] = useState<OrganizationUnitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await organizationUnitApi.getUnitById(id);
        if (!cancelled) setUnit(data);
      } catch {
        if (!cancelled) setError('Failed to load organization unit data');
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
      toast.success('Organization unit deleted successfully');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to delete organization unit'));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  return { unit, isLoading, error, deleteUnit: deleteFn, isDeleting };
}
