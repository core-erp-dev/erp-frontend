/**
 * Pure helpers for the pending position-assignment list in the
 * Add/Edit Employee form. Kept outside the component so the primary-position
 * rules (exactly one primary, promote-first on removal, no duplicates) are
 * unit-testable without rendering the form.
 */

export interface PendingPosition {
  positionId: string;
  positionName: string;
  positionCode: string;
  isPrimary: boolean;
  startDate: string;
}

/** Add a position to the list. The first added position becomes the primary. */
export function addPendingPosition(
  list: PendingPosition[],
  next: Omit<PendingPosition, 'isPrimary'>,
): PendingPosition[] {
  if (list.some((p) => p.positionId === next.positionId)) return list;
  return [...list, { ...next, isPrimary: list.length === 0 }];
}

/**
 * Remove a position. When the removed position was the primary, the first
 * remaining position is promoted to primary so the list never ends up
 * without exactly one primary (as long as it is non-empty).
 */
export function removePendingPosition(
  list: PendingPosition[],
  positionId: string,
): PendingPosition[] {
  const next = list.filter((p) => p.positionId !== positionId);
  if (next.length > 0 && !next.some((p) => p.isPrimary)) {
    next[0] = { ...next[0], isPrimary: true };
  }
  return next;
}

/** Set the given position as the single primary of the list. */
export function setPendingPrimary(
  list: PendingPosition[],
  positionId: string,
): PendingPosition[] {
  if (!list.some((p) => p.positionId === positionId)) return list;
  return list.map((p) => ({ ...p, isPrimary: p.positionId === positionId }));
}
