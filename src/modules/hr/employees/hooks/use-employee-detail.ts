'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '../services/employee-api';
import type { CoreUser } from '../types';

interface UseEmployeeDetailReturn {
  employee: CoreUser | null;
  isLoading: boolean;
  error: string | null;
}

export function useEmployeeDetail(id: string): UseEmployeeDetailReturn {
  const [employee, setEmployee] = useState<CoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          const msg = err instanceof Error ? err.message : 'Gagal memuat data karyawan';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { employee, isLoading, error };
}
