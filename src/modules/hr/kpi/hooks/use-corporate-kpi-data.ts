import { useState, useEffect, useCallback } from 'react';
import { toast } from '@heroui/react';

import { corporateKpiApi } from '../services/corporate-kpi-api';
import {
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
} from '../types';
import { extractErrorMessage } from '@/types/api';

interface UseCorporateKpiDataReturn {
  tree: CorporateKpiResponse[];
  flatList: CorporateKpiResponse[];
  isLoading: boolean;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  fetchTree: () => Promise<void>;
  createKpi: (data: CreateCorporateKpiRequest) => Promise<boolean>;
  updateKpi: (id: string, data: UpdateCorporateKpiRequest) => Promise<boolean>;
  deleteKpi: (id: string) => Promise<boolean>;
}

export function useCorporateKpiData(): UseCorporateKpiDataReturn {
  const [tree, setTree] = useState<CorporateKpiResponse[]>([]);
  const [flatList, setFlatList] = useState<CorporateKpiResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);

  const fetchTree = useCallback(async () => {
    try {
      setIsLoading(true);
      const [treeData, flatData] = await Promise.all([
        corporateKpiApi.getTree(selectedYear),
        corporateKpiApi.getAll(selectedYear),
      ]);
      setTree(treeData);
      setFlatList(flatData);
    } catch {
      toast.danger('Gagal memuat data KPI Corporate');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  // Auto-fetch on mount AND when selectedYear changes
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const createKpi = async (data: CreateCorporateKpiRequest): Promise<boolean> => {
    try {
      await corporateKpiApi.create(data);
      toast.success('KPI Corporate berhasil ditambahkan', {
        description: 'Indikator baru telah disimpan ke sistem.',
      });
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menambahkan KPI Corporate'));
      return false;
    }
  };

  const updateKpi = async (id: string, data: UpdateCorporateKpiRequest): Promise<boolean> => {
    try {
      await corporateKpiApi.update(id, data);
      toast.success('KPI Corporate berhasil diperbarui', {
        description: 'Perubahan indikator telah disimpan.',
      });
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal memperbarui KPI Corporate'));
      return false;
    }
  };

  const deleteKpi = async (id: string): Promise<boolean> => {
    try {
      await corporateKpiApi.remove(id);
      toast.success('KPI Corporate berhasil dihapus', {
        description: 'Indikator telah dihapus dari sistem.',
      });
      await fetchTree();
      return true;
    } catch (error) {
      toast.danger(extractErrorMessage(error, 'Gagal menghapus KPI Corporate'));
      return false;
    }
  };

  return {
    tree,
    flatList,
    isLoading,
    selectedYear,
    setSelectedYear,
    fetchTree,
    createKpi,
    updateKpi,
    deleteKpi,
  };
}
