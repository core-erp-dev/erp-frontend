'use client';

import { useCallback, useEffect, useState } from 'react';
import { Chip, Label, ListBox, Select } from '@heroui/react';
import type { ActingPosition } from './acting-position';
import { extractPositionsError, getMyPositions, toActingPositions } from './my-positions';

/**
 * `useMyPositions` — loads the authenticated user's active Positions
 * (`GET /api/v1/users/me/positions`, authentication-only).
 *
 * Never selects a Position implicitly: `positions` is returned as-is (primary
 * first per the backend), and the caller must require an explicit choice.
 * A loading failure is recoverable via `refetch` and must never hide ordinary
 * Activity reads — the caller decides where to surface `error`.
 */
export function useMyPositions(enabled = true) {
  const [positions, setPositions] = useState<ActingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getMyPositions();
      setPositions(toActingPositions(items));
    } catch (err: unknown) {
      setError(extractPositionsError(err));
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  return { positions, isLoading, error, refetch };
}
export interface ActingPositionSelectorProps {
  positions: ActingPosition[];
  /** Selected `core_positions.id` (null until the user explicitly chooses). */
  value: string | null;
  onChange: (positionId: string) => void;
  disabled?: boolean;
  /** Compact header label. */
  label?: string;
}

/**
 * Explicit acting-Position selector.
 *
 * Rules enforced here:
 *   - all active Positions are listed (never filtered to primary/first);
 *   - the primary Position is clearly identified with a "Primary" chip;
 *   - NO Position is pre-selected — `value` starts null and the user must
 *     explicitly choose before any Position-dependent action;
 *   - the selected value is `positionId` (`core_positions.id`) — the
 *     assignment `id` is never exposed as the acting-Position identity.
 */
export function ActingPositionSelector({
  positions,
  value,
  onChange,
  disabled,
  label = 'Posisi Aktif',
}: ActingPositionSelectorProps) {
  return (
    <Select
      variant="primary"
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null && key !== undefined) onChange(String(key));
      }}
      placeholder={positions.length === 0 ? 'Tidak ada posisi aktif' : 'Pilih posisi aktif...'}
      isDisabled={disabled || positions.length === 0}
      aria-label={label}
    >
      <Label>{label}</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover>
        <ListBox>
          {positions.map((pos) => (
            <ListBox.Item key={pos.positionId} id={pos.positionId} textValue={pos.positionName}>
              <span className="flex items-center gap-2 text-sm text-foreground">
                {pos.positionName}
                {pos.isPrimary && (
                  <Chip size="sm" variant="soft" className="pointer-events-none">Utama</Chip>
                )}
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

