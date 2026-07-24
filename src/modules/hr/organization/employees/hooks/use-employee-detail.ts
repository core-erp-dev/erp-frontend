'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { employeeApi } from '../services/employee-api';
import type { CoreUser } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseEmployeeDetailReturn {
  employee: CoreUser | null;
  isLoading: boolean;
  error: string | null;
  deleteEmployee: () => Promise<boolean>;
  isDeleting: boolean;
}

export function useEmployeeDetail(id: string): UseEmployeeDetailReturn {
  const [employee, setEmployee] = useState<CoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await employeeApi.getUserById(id);
        if (!cancelled) setEmployee(data);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load employee data';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const deleteEmployee = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await employeeApi.deleteUser(id);
      toast.success('Employee deleted successfully', {
        description: 'Employee is no longer active in the system.',
      });
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to delete employee'));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  return { employee, isLoading, error, deleteEmployee, isDeleting };
}
