import { extractErrorMessage } from '@/types/api';

/**
 * Detail error dari backend dipetakan ke pesan yang konsisten untuk UI.
 */
export function mapVariableError(error: unknown, fallback: string): string {
  const raw = extractErrorMessage(error, '');

  if (!raw) return fallback;

  const known: Record<string, string> = {
    'Corporate KPI variable code already exists':
      'Variabel dengan kode tersebut sudah ada. Kode tetap dicadangkan termasuk pada data terhapus.',
    'Variable code must match ^[A-Z][A-Z0-9_]*$':
      'Kode harus diawali huruf kapital dan hanya boleh berisi huruf kapital, angka, serta garis bawah.',
    'Corporate KPI variable not found':
      'Variabel tidak ditemukan.',
    'Cannot delete — variable is still referenced by an active indicator':
      'Variabel masih digunakan oleh indikator aktif dan tidak dapat dihapus. Lepaskan penggunaannya terlebih dahulu.',
    'Cannot change aggregation mode — delete the annual value first':
      'Mode tidak dapat diubah selama nilai tahunan masih ada. Hapus nilai tahunan terlebih dahulu pada Nilai Variabel KPI, tab Tahun.',
    'Annual values are only allowed for variables with aggregationMode ANNUAL_REQUIRED':
      'Nilai tahunan hanya dapat digunakan untuk variabel dengan mode agregasi ANNUAL_REQUIRED.',
    'Aggregation mode is required':
      'Mode agregasi wajib dipilih.',
    'ACCESS_DENIED':
      'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  };

  for (const [key, message] of Object.entries(known)) {
    if (raw.includes(key)) return message;
  }

  return fallback;
}
