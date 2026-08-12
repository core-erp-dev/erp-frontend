'use client';

import React from 'react';
import { Button } from '@heroui/react';
import { Trash } from '@phosphor-icons/react';
import type { UnitPerformanceMatrixUnit } from './unit-performance.types';

interface UnitPerformanceParticipantsProps {
  units: UnitPerformanceMatrixUnit[];
  canManage: boolean;
  isMutating: boolean;
  onDelete: (unit: UnitPerformanceMatrixUnit) => void;
}

/**
 * The GLOBAL registry of participating units. Adding a unit makes it a new
 * column of the weight matrix; removing it takes its weights out of every
 * indicator (the matrix becomes incomplete until rebalanced).
 */
export const UnitPerformanceParticipants: React.FC<UnitPerformanceParticipantsProps> = ({
  units,
  canManage,
  isMutating,
  onDelete,
}) => (
  <div className="flex flex-wrap gap-2">
    {units.length === 0 ? (
      <p className="text-sm text-muted-foreground">Belum ada unit peserta.</p>
    ) : (
      units.map((unit) => (
        <div
          key={unit.id}
          className="flex items-center gap-2 rounded-full bg-surface-secondary py-1 pl-3 pr-1 text-sm"
        >
          <span className="font-medium text-foreground">{unit.unitName}</span>
          <span className="text-xs text-muted-foreground">{unit.unitCode}</span>
          {canManage && (
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              className="h-6 w-6"
              isDisabled={isMutating}
              onPress={() => onDelete(unit)}
              aria-label={`Remove ${unit.unitName}`}
            >
              <Trash className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))
    )}
  </div>
);
