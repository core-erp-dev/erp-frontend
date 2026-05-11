import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Selection } from '@heroui/react';
import { AxiosError } from 'axios';

import type {
  PositionTree,
  PositionRequest,
  PositionUpdateRequest,
} from '../types';
import type { FlatPosition } from '../../shared/utils/flatten-positions';
import { organizationApi } from '../services/organization-api';
import { employeeApi } from '../../employees/services/employee-api';
import { flattenPositionTree, buildTableItems, toPositionTree } from '../../shared/utils';
import type { CoreUser } from '../../employees/types';

interface UseHierarchyDataReturn {
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;

  // Position data
  positions: PositionTree[];
  flatPositions: FlatPosition[];
  filteredPositions: FlatPosition[];
  tableItems: ReturnType<typeof buildTableItems>;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Tree expansion
  expandedKeys: Selection;
  setExpandedKeys: (keys: Selection) => void;

  // Form modal
  isFormModalOpen: boolean;
  selectedPosition: PositionTree | null;
  parentPositionId: number | null;
  handleAddRootPosition: () => void;
  handleAddSubordinate: (parentId: number) => void;
  handleEdit: (pos: FlatPosition) => void;
  handleFormModalClose: () => void;
  handleFormSubmit: (data: PositionRequest | PositionUpdateRequest) => Promise<void>;

  // Assign modal
  isAssignModalOpen: boolean;
  assignPositionId: number | null;
  allUsers: CoreUser[];
  isAssigning: boolean;
  handleAssignUser: (pos: FlatPosition) => void;
  handleAssignModalClose: () => void;
  handleAssignSubmit: (data: {
    userId: string;
    positionId: number;
    startDate: string;
    isPrimary: boolean;
  }) => Promise<void>;

  // Delete
  handleDelete: (pos: FlatPosition) => Promise<void>;

  // Refresh
  fetchPositions: (showRefresh?: boolean) => Promise<void>;
}

export function useHierarchyData(): UseHierarchyDataReturn {
  const [positions, setPositions] = useState<PositionTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set());

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionTree | null>(null);
  const [parentPositionId, setParentPositionId] = useState<number | null>(null);

  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPositionId, setAssignPositionId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<CoreUser[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // ── Data fetching ─────────────────────────────────────────
  const fetchPositions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await organizationApi.fetchPositionTree();
      setPositions(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Gagal memuat hierarki jabatan';
      toast.error(errorMessage, {
        description: 'Silakan coba lagi nanti.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    employeeApi.getUsers().then(setAllUsers).catch(() => {});
  }, [fetchPositions]);

  // ── Derived data ──────────────────────────────────────────
  const flatPositions = useMemo(
    () => flattenPositionTree(positions),
    [positions],
  );

  const filteredPositions = useMemo(() => {
    if (!searchTerm.trim()) return flatPositions;
    const term = searchTerm.toLowerCase();
    return flatPositions.filter(
      (p) =>
        p.positionName.toLowerCase().includes(term) ||
        p.positionCode.toLowerCase().includes(term),
    );
  }, [flatPositions, searchTerm]);

  const tableItems = useMemo(
    () => buildTableItems(filteredPositions),
    [filteredPositions],
  );

  // ── Form modal handlers ───────────────────────────────────
  const handleAddRootPosition = () => {
    setSelectedPosition(null);
    setParentPositionId(null);
    setIsFormModalOpen(true);
  };

  const handleAddSubordinate = (parentId: number) => {
    setSelectedPosition(null);
    setParentPositionId(parentId);
    setIsFormModalOpen(true);
  };

  const handleEdit = (pos: FlatPosition) => {
    setSelectedPosition(toPositionTree(pos));
    setParentPositionId(null);
    setIsFormModalOpen(true);
  };

  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedPosition(null);
    setParentPositionId(null);
  };

  const handleFormSubmit = async (
    data: PositionRequest | PositionUpdateRequest,
  ) => {
    try {
      if (selectedPosition) {
        const updateData = data as PositionUpdateRequest;
        await organizationApi.updatePosition(selectedPosition.id, updateData);
        toast.success('Jabatan berhasil diperbarui', {
          description: `"${updateData.positionName || selectedPosition.positionName}" telah diperbarui.`,
        });
      } else {
        const createData = data as PositionRequest;
        await organizationApi.createPosition(createData);
        toast.success('Jabatan berhasil dibuat', {
          description: `"${createData.positionName}" telah ditambahkan ke hierarki.`,
        });
      }
      fetchPositions(true);
    } catch (error) {
      let errorTitle = selectedPosition
        ? 'Gagal memperbarui jabatan'
        : 'Gagal membuat jabatan';
      let errorDescription = 'Silakan periksa input Anda dan coba lagi.';

      if (error instanceof AxiosError && error.response) {
        const detail = error.response.data?.detail || '';
        const status = error.response.status;

        if (status === 400) {
          if (
            detail.toLowerCase().includes('circular') ||
            detail.toLowerCase().includes('reference')
          ) {
            errorTitle = 'Referensi Sirkular Terdeteksi';
            errorDescription =
              'Induk yang dipilih akan membuat referensi sirkular dalam hierarki.';
          } else {
            errorDescription = detail || errorDescription;
          }
        } else if (status === 409) {
          errorTitle = 'Kode Jabatan Duplikat';
          errorDescription =
            'Jabatan dengan kode ini sudah ada. Silakan gunakan kode yang unik.';
        }
      }

      toast.error(errorTitle, { description: errorDescription });
      throw error;
    }
  };

  // ── Delete handler ────────────────────────────────────────
  const handleDelete = async (pos: FlatPosition) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus jabatan "${pos.positionName}"?\n\nTindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;

    try {
      await organizationApi.deletePosition(pos.id);
      toast.success('Jabatan berhasil dihapus', {
        description: `"${pos.positionName}" telah dihapus.`,
      });
      fetchPositions(true);
    } catch (error) {
      let errorTitle = 'Gagal menghapus jabatan';
      let errorDescription = 'Silakan coba lagi nanti.';

      if (error instanceof AxiosError && error.response) {
        const detail = error.response.data?.detail || '';
        const status = error.response.status;

        if (status === 400) {
          if (detail.toLowerCase().includes('orphan')) {
            errorTitle = 'Tidak Dapat Menghapus: Memiliki Bawahan';
            errorDescription =
              'Jabatan ini memiliki jabatan bawahan. Silakan hapus atau pindahkan terlebih dahulu.';
          } else if (
            detail.toLowerCase().includes('user') ||
            detail.toLowerCase().includes('assign')
          ) {
            errorTitle = 'Tidak Dapat Menghapus: Memiliki Karyawan';
            errorDescription =
              'Jabatan ini memiliki karyawan yang ditugaskan. Silakan pindahkan terlebih dahulu.';
          } else if (
            detail.toLowerCase().includes('circular') ||
            detail.toLowerCase().includes('reference')
          ) {
            errorTitle = 'Referensi Sirkular Terdeteksi';
            errorDescription =
              'Operasi ini akan membuat referensi sirkular dalam hierarki.';
          } else {
            errorDescription = detail || errorDescription;
          }
        }
      }

      toast.error(errorTitle, { description: errorDescription });
    }
  };

  // ── Assign user handlers ──────────────────────────────────
  const handleAssignUser = (pos: FlatPosition) => {
    setAssignPositionId(pos.id);
    setIsAssignModalOpen(true);
  };

  const handleAssignModalClose = () => {
    setIsAssignModalOpen(false);
    setAssignPositionId(null);
  };

  const handleAssignSubmit = async (data: {
    userId: string;
    positionId: number;
    startDate: string;
    isPrimary: boolean;
  }) => {
    try {
      setIsAssigning(true);
      await employeeApi.assignUserToPosition(data);
      toast.success('Karyawan berhasil ditugaskan', {
        description: 'Penugasan jabatan telah disimpan.',
      });
      setIsAssignModalOpen(false);
      setAssignPositionId(null);
      fetchPositions(true);
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal menugaskan karyawan ke jabatan';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    // Loading states
    isLoading,
    isRefreshing,

    // Position data
    positions,
    flatPositions,
    filteredPositions,
    tableItems,

    // Search
    searchTerm,
    setSearchTerm,

    // Tree expansion
    expandedKeys,
    setExpandedKeys,

    // Form modal
    isFormModalOpen,
    selectedPosition,
    parentPositionId,
    handleAddRootPosition,
    handleAddSubordinate,
    handleEdit,
    handleFormModalClose,
    handleFormSubmit,

    // Assign modal
    isAssignModalOpen,
    assignPositionId,
    allUsers,
    isAssigning,
    handleAssignUser,
    handleAssignModalClose,
    handleAssignSubmit,

    // Delete
    handleDelete,

    // Refresh
    fetchPositions,
  };
}
