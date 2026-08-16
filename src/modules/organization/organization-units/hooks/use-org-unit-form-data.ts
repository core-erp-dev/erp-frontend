'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';
import { organizationUnitApi } from '../services/organization-unit-api';
import type { OrganizationUnitResponse, CreateOrganizationUnitRequest, UpdateOrganizationUnitRequest } from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseOrgUnitFormDataReturn {
  treeUnits: OrganizationUnitResponse[];
  isLoadingData: boolean;
  submitCreate: (payload: CreateOrganizationUnitRequest) => Promise<string | null>;
  submitUpdate: (id: string, payload: UpdateOrganizationUnitRequest) => Promise<boolean>;
}

export function useOrgUnitFormData(): UseOrgUnitFormDataReturn {
  const [treeUnits, setTreeUnits] = useState<OrganizationUnitResponse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tree = await organizationUnitApi.getUnitTree();
        setTreeUnits(tree);
      } catch {
        // fail silently
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  const submitCreate = useCallback(async (payload: CreateOrganizationUnitRequest): Promise<string | null> => {
    try {
      const created = await organizationUnitApi.createUnit(payload);
      toast.success('Unit organisasi berhasil ditambahkan');
      return created.id;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal menambah unit organisasi'));
      return null;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, payload: UpdateOrganizationUnitRequest): Promise<boolean> => {
    try {
      await organizationUnitApi.updateUnit(id, payload);
      toast.success('Unit organisasi berhasil diperbarui');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Gagal memperbarui unit organisasi'));
      return false;
    }
  }, []);

  return { treeUnits, isLoadingData, submitCreate, submitUpdate };
}
