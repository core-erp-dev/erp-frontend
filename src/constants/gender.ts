/**
 * Gender codes and labels — single source of truth.
 * Values must match core_users.gender column in backend.
 *
 * @see erp-backend/src/main/resources/db/migration/V1__init_schema.sql (core_users.gender VARCHAR(1))
 */
export const GENDER = {
  MALE: 'L' as const,
  FEMALE: 'P' as const,
} as const;

export type GenderCode = (typeof GENDER)[keyof typeof GENDER];

export const GENDER_LABEL: Record<GenderCode, string> = {
  [GENDER.MALE]: 'Laki-laki',
  [GENDER.FEMALE]: 'Perempuan',
};

/** Get display label for a gender code, or fallback (default: '-') */
export function getGenderLabel(code: string | null | undefined, fallback = '-'): string {
  if (!code) return fallback;
  return GENDER_LABEL[code as GenderCode] ?? fallback;
}
