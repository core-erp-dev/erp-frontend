'use client';

import { Button, Dropdown, Label, Spinner } from '@heroui/react';
import type { CorporateKpiNode } from '@/modules/kpi/corporate/corporate-kpi.types';

interface ActivityIndicatorMultiSelectProps {
  indicators: CorporateKpiNode[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
}

/** Shared HeroUI multi-select used by Activity create/update/request forms. */
export function ActivityIndicatorMultiSelect({
  indicators, selectedIds, onChange, isLoading = false,
}: ActivityIndicatorMultiSelectProps) {
  if (isLoading) return <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>;

  const selectedLabels = indicators.filter((indicator) => selectedIds.includes(indicator.id)).map((indicator) => indicator.code);
  return (
    <div className="flex flex-col gap-1">
      <Label>Indikator KPI Perusahaan</Label>
      <Dropdown>
        <Button variant="secondary" className="justify-between" aria-label="Pilih indikator KPI Perusahaan">
          <span className="truncate text-left">{selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Pilih satu atau beberapa indikator...'}</span>
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu
            selectedKeys={new Set(selectedIds)}
            selectionMode="multiple"
            onSelectionChange={(keys) => onChange(Array.from(keys as Set<React.Key>).map(String))}
          >
            {indicators.map((indicator) => (
              <Dropdown.Item key={indicator.id} id={indicator.id} textValue={`${indicator.code} - ${indicator.name}`}>
                <Dropdown.ItemIndicator />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{indicator.code}</span>
                  <span className="truncate text-xs text-muted-foreground">{indicator.name}</span>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
