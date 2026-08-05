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
      toast.success('Organization unit created successfully');
      return created.id;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to create organization unit'));
      return null;
    }
  }, []);

  const submitUpdate = useCallback(async (id: string, payload: UpdateOrganizationUnitRequest): Promise<boolean> => {
    try {
      await organizationUnitApi.updateUnit(id, payload);
      toast.success('Organization unit updated successfully');
      return true;
    } catch (err) {
      toast.danger(extractErrorMessage(err, 'Failed to update organization unit'));
      return false;
    }
  }, []);

  return { treeUnits, isLoadingData, submitCreate, submitUpdate };
}
