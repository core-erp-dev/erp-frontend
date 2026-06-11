import { useState } from 'react';

import {
  CorporateKpiResponse,
  CreateCorporateKpiRequest,
  UpdateCorporateKpiRequest,
} from '../types';

interface CorporateKpiFormData {
  indicatorCode: string;
  indicatorName: string;
  parentId: string | null;
  weight: number;
  businessTarget: number;
  periodYear: number;
}

interface CorporateKpiFormErrors {
  indicatorCode?: string;
  indicatorName?: string;
  weight?: string;
  businessTarget?: string;
  periodYear?: string;
}

interface UseCorporateKpiFormReturn {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: CorporateKpiFormData;
  errors: CorporateKpiFormErrors;
  isSubmitting: boolean;
  editingId: string | null;
  openCreate: (parentId?: string) => void;
  openEdit: (kpi: CorporateKpiResponse) => void;
  close: () => void;
  setField: (field: keyof CorporateKpiFormData, value: string | number | null) => void;
  validate: () => boolean;
  submit: (
    createKpi: (data: CreateCorporateKpiRequest) => Promise<boolean>,
    updateKpi: (id: string, data: UpdateCorporateKpiRequest) => Promise<boolean>,
  ) => Promise<boolean>;
}

const defaultFormData: CorporateKpiFormData = {
  indicatorCode: '',
  indicatorName: '',
  parentId: null,
  weight: 0,
  businessTarget: 0,
  periodYear: 2026,
};

export function useCorporateKpiForm(): UseCorporateKpiFormReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<CorporateKpiFormData>(defaultFormData);
  const [errors, setErrors] = useState<CorporateKpiFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = (parentId?: string) => {
    setMode('create');
    setFormData({
      ...defaultFormData,
      parentId: parentId || null,
    });
    setErrors({});
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (kpi: CorporateKpiResponse) => {
    setMode('edit');
    setFormData({
      indicatorCode: kpi.indicatorCode,
      indicatorName: kpi.indicatorName,
      parentId: kpi.parentId,
      weight: kpi.weight,
      businessTarget: kpi.businessTarget,
      periodYear: kpi.periodYear,
    });
    setErrors({});
    setEditingId(kpi.id);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setFormData(defaultFormData);
    setErrors({});
    setEditingId(null);
  };

  const setField = (field: keyof CorporateKpiFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field being edited
    if (errors[field as keyof CorporateKpiFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: CorporateKpiFormErrors = {};

    if (!formData.indicatorCode.trim()) {
      newErrors.indicatorCode = 'Kode indikator wajib diisi';
    }
    if (!formData.indicatorName.trim()) {
      newErrors.indicatorName = 'Nama indikator wajib diisi';
    }
    if (formData.weight < 0 || formData.weight > 100) {
      newErrors.weight = 'Bobot harus antara 0-100';
    }
    if (formData.businessTarget < 0) {
      newErrors.businessTarget = 'Target bisnis tidak boleh negatif';
    }
    if (formData.periodYear < 2020 || formData.periodYear > 2030) {
      newErrors.periodYear = 'Tahun periode tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (
    createKpi: (data: CreateCorporateKpiRequest) => Promise<boolean>,
    updateKpi: (id: string, data: UpdateCorporateKpiRequest) => Promise<boolean>,
  ): Promise<boolean> => {
    if (!validate()) {
      return false;
    }

    setIsSubmitting(true);
    try {
      let success: boolean;

      if (mode === 'create') {
        success = await createKpi({
          indicatorCode: formData.indicatorCode,
          indicatorName: formData.indicatorName,
          parentId: formData.parentId,
          weight: formData.weight,
          businessTarget: formData.businessTarget,
          periodYear: formData.periodYear,
        });
      } else {
        if (!editingId) return false;
        success = await updateKpi(editingId, {
          indicatorCode: formData.indicatorCode,
          indicatorName: formData.indicatorName,
          parentId: formData.parentId,
          weight: formData.weight,
          businessTarget: formData.businessTarget,
        });
      }

      if (success) {
        close();
      }
      return success;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    mode,
    formData,
    errors,
    isSubmitting,
    editingId,
    openCreate,
    openEdit,
    close,
    setField,
    validate,
    submit,
  };
}
