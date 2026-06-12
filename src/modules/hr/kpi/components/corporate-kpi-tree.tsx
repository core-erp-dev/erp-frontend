'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button, Tooltip } from '@heroui/react';
import type { CorporateKpiResponse } from '../types';

interface CorporateKpiTreeProps {
  data: CorporateKpiResponse[];
  onEdit: (kpi: CorporateKpiResponse) => void;
  onDelete: (kpi: CorporateKpiResponse) => void;
  canEdit: boolean;
  level?: number;
}

function getAchievementColor(value: number): string {
  if (value < 50) return 'text-danger';
  if (value < 90) return 'text-warning';
  return 'text-success';
}

function collectAllIds(items: CorporateKpiResponse[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (item.children && item.children.length > 0) {
      ids.push(...collectAllIds(item.children));
    }
  }
  return ids;
}

const TreeNode: React.FC<{
  kpi: CorporateKpiResponse;
  level: number;
  onEdit: (kpi: CorporateKpiResponse) => void;
  onDelete: (kpi: CorporateKpiResponse) => void;
  canEdit: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}> = ({ kpi, level, onEdit, onDelete, canEdit, expandedIds, toggleExpand }) => {
  const hasChildren = kpi.children && kpi.children.length > 0;
  const isExpanded = expandedIds.has(kpi.id);

  return (
    <div>
      {/* Row */}
      <div
        className="group flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors"
        style={{ paddingLeft: `${level * 24}px` }}
      >
        {/* Tree line indicator */}
        {level > 0 && (
          <div className="flex items-center" style={{ width: '24px', flexShrink: 0 }}>
            <div className="h-full w-px bg-border/60" />
          </div>
        )}

        {/* Expand toggle */}
        <div className="flex w-8 h-9 items-center justify-center flex-shrink-0">
          {hasChildren ? (
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={() => toggleExpand(kpi.id)}
              className="h-5 w-5 min-w-5"
              aria-label={isExpanded ? 'Ciutkan' : 'Perluas'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <div className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Indicator code */}
        <span className="w-36 flex-shrink-0 truncate text-sm font-mono font-medium text-foreground px-2">
          {kpi.indicatorCode}
        </span>

        {/* Indicator name */}
        <span className="flex-1 min-w-0 truncate text-sm text-foreground px-2">
          {kpi.indicatorName}
          {hasChildren && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({kpi.children!.length})
            </span>
          )}
        </span>

        {/* Metric columns */}
        <div className="flex items-center gap-0 flex-shrink-0">
          {/* Weight */}
          <span className="w-20 text-right text-sm tabular-nums text-muted-foreground px-2">
            {kpi.weight?.toFixed(0) ?? '0'}%
          </span>

          {/* Achievement */}
          <span className={`w-20 text-right text-sm tabular-nums font-medium px-2 ${getAchievementColor(kpi.achievementValue ?? 0)}`}>
            {(kpi.achievementValue ?? 0).toFixed(2)}
          </span>

          {/* Score */}
          <span className="w-20 text-right text-sm tabular-nums text-muted-foreground px-2">
            {(kpi.score ?? 0).toFixed(2)}
          </span>

          {/* Result */}
          <span className="w-20 text-right text-sm tabular-nums text-muted-foreground px-2">
            {(kpi.result ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              onPress={() => onEdit(kpi)}
              aria-label={`Edit ${kpi.indicatorName}`}
            >
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            {kpi.linkedTaskCount > 0 ? (
              <Tooltip>
                <Button
                  isIconOnly
                  variant="tertiary"
                  size="sm"
                  isDisabled
                  aria-label={`Hapus ${kpi.indicatorName}`}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Tooltip.Content>
                  <p>Tidak dapat dihapus: masih terhubung dengan {kpi.linkedTaskCount} tugas</p>
                </Tooltip.Content>
              </Tooltip>
            ) : (
              <Button
                isIconOnly
                variant="tertiary"
                size="sm"
                onPress={() => onDelete(kpi)}
                aria-label={`Hapus ${kpi.indicatorName}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {kpi.children!.map((child) => (
            <TreeNode
              key={child.id}
              kpi={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CorporateKpiTree: React.FC<CorporateKpiTreeProps> = ({
  data,
  onEdit,
  onDelete,
  canEdit,
  level = 0,
}) => {
  // Default: all expanded
  const allIds = useMemo(() => collectAllIds(data), [data]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(allIds));

  // Update expanded when data changes (add new ids)
  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of allIds) {
        next.add(id);
      }
      return next;
    });
  }, [allIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <span className="text-sm">Tidak ada data KPI Korporat.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-border bg-muted/50 px-2">
        <div style={{ width: `${level * 24 + 32 + 8}px` }} className="flex-shrink-0" />
        <span className="w-36 flex-shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Kode
        </span>
        <span className="flex-1 min-w-0 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Indikator
        </span>
        <div className="flex items-center gap-0 flex-shrink-0">
          <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Bobot
          </span>
          <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Capaian
          </span>
          <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Skor
          </span>
          <span className="w-20 text-right px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Hasil
          </span>
        </div>
        {canEdit && (
          <div className="w-20 flex-shrink-0 px-2 py-2" />
        )}
      </div>

      {/* Tree rows */}
      {data.map((kpi) => (
        <TreeNode
          key={kpi.id}
          kpi={kpi}
          level={level}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
};
