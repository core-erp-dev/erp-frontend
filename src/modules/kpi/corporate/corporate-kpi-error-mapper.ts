import { extractErrorMessage } from '@/types/api';

/**
 * Corporate KPI mutation error mapper.
 * Maps known backend error details to user-facing Indonesian messages.
 */
export function mapKpiError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    /* ── Yearly structure lifecycle ── */
    'Corporate KPI structure already exists for this year':
      'Struktur KPI Perusahaan untuk tahun ini sudah ada.',
    'Corporate KPI structure still has KPI nodes':
      'Struktur ini tidak dapat dihapus karena masih memiliki node KPI.',
    'Corporate KPI structure has no indicators':
      'Struktur ini tidak dapat diaktifkan karena belum memiliki indikator.',
    'Total weight must be exactly 100% before activating the structure':
      'Total bobot indikator harus tepat 100% sebelum struktur diaktifkan.',
    'Cannot activate the Corporate KPI structure — indicator':
      'Struktur tidak dapat diaktifkan karena ada indikator yang belum lengkap.',
    'Corporate KPI structure must be ACTIVE':
      'Struktur KPI Perusahaan harus berstatus ACTIVE sebelum indikator dapat digunakan Aktivitas.',
    'Corporate KPI structure is ACTIVE — deactivate it before changing its configuration':
      'Struktur berstatus ACTIVE — nonaktifkan sebelum mengubah konfigurasi KPI.',
    'Corporate KPI structure not found':
      'Struktur KPI Perusahaan tidak ditemukan.',
    'Corporate KPI structure is not deleted':
      'Struktur KPI Perusahaan ini tidak sedang dihapus.',
    'Cannot restore — the year structure is deleted':
      'Pulihkan struktur tahun sebelum memulihkan KPI di dalamnya.',
    'No Corporate KPI structure found for the source year':
      'Tahun sumber tidak memiliki struktur KPI Perusahaan untuk disalin.',
    'Source year must differ from the target year':
      'Tahun sumber harus berbeda dari tahun tujuan.',
    'Corporate KPI code already exists in this year':
      'KPI Perusahaan dengan kode ini sudah ada pada struktur yang dipilih.',
    'Corporate KPI not found':
      'KPI Perusahaan tidak ditemukan.',
    'An INDICATOR must have an ASPECT parent':
      'Aspect induk yang dipilih tidak valid.',
    'An ASPECT must not have a unit or target value':
      'Aspect tidak boleh memiliki unit atau nilai target.',
    'ASPECT must not have a parent':
      'Aspect harus menjadi node akar dan tidak boleh memiliki induk.',
    'Parent and child must belong to the same Corporate KPI structure':
      'Indikator dan Aspect induknya harus berada pada struktur tahun yang sama.',
    'An ASPECT must not have formula, assessment rules, weight, or target score':
      'Aspect tidak boleh memiliki konfigurasi penilaian.',
    'Total weight would exceed 100%':
      'Total bobot indikator akan melebihi 100%.',
    'Formula references a variable that is not bound to the indicator':
      'Formula merujuk variabel yang belum terikat ke indikator — simpan indikator untuk mengikatnya otomatis.',
    'Cannot delete — KPI node still has active children':
      'Hapus semua indikator anak sebelum menghapus Aspect ini.',
    'Cannot restore — parent KPI is deleted':
      'Pulihkan Aspect induk sebelum memulihkan indikator ini.',
    'ACCESS_DENIED':
      'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  // Unknown technical errors: use a safe generic fallback instead of passing raw content
  return fallback;
}
