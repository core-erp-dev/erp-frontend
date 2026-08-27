'use client';

import { useMemo } from 'react';
import type { Key } from 'react-aria-components';
import {
  Autocomplete,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  SearchField,
  Spinner,
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react';

export interface ActivityIndicatorOption {
  id: string;
  code: string;
  name: string;
}

interface ActivityIndicatorMultiSelectProps {
  indicators: ActivityIndicatorOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  variant?: 'primary' | 'secondary';
}

/** Shared HeroUI multi-select using the same Autocomplete + tags pattern as RoleMultiSelect. */
export function ActivityIndicatorMultiSelect({
  indicators,
  selectedIds,
  onChange,
  isLoading = false,
  isRequired,
  isInvalid,
  errorMessage,
  variant = 'secondary',
}: ActivityIndicatorMultiSelectProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const selectedKeys = selectedIds.map(String);

  const sortedIndicators = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return [...indicators].sort((a, b) => {
      const aSelected = selected.has(String(a.id)) ? 0 : 1;
      const bSelected = selected.has(String(b.id)) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [indicators, selectedIds]);

  const onRemoveTags = (keys: Set<Key>) => {
    const removeSet = new Set(Array.from(keys).map(String));
    onChange(selectedIds.filter((id) => !removeSet.has(String(id))));
  };

  if (isLoading) return <div className="flex items-center justify-center py-4"><Spinner size="sm" /></div>;

  return (
    <Autocomplete
      className="w-full"
      variant={variant}
      placeholder="Pilih indikator KPI Perusahaan"
      selectionMode="multiple"
      allowsEmptyCollection
      validationBehavior="aria"
      isRequired={isRequired}
      value={selectedKeys}
      onChange={(keys) => {
        const values = Array.isArray(keys) ? keys : keys != null ? [keys] : [];
        onChange(values.map(String));
      }}
      isInvalid={isInvalid}
    >
      <Label>Indikator KPI Perusahaan</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {({ defaultChildren, isPlaceholder, state }: any) => {
            if (isPlaceholder || state.selectedItems.length === 0) return defaultChildren;
            const selectedItemsKeys = state.selectedItems.map((item: { key: Key }) => item.key);
            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((key: Key) => {
                    const indicator = indicators.find((item) => String(item.id) === String(key));
                    if (!indicator) return null;
                    return (
                      <Tag key={indicator.id} id={indicator.id}>
                        {indicator.code}
                      </Tag>
                    );
                  })}
                </TagGroup.List>
              </TagGroup>
            );
          }}
        </Autocomplete.Value>
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <FieldError>{errorMessage}</FieldError>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={contains}>
          <SearchField autoFocus name="search" aria-label="Cari indikator KPI Perusahaan">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Cari indikator KPI Perusahaan" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => (
            <EmptyState>
              {indicators.length === 0
                ? 'Tidak ada data indikator KPI Perusahaan untuk tahun yang dipilih'
                : 'Indikator KPI Perusahaan tidak ditemukan'}
            </EmptyState>
          )}>
            {sortedIndicators.map((indicator) => (
              <ListBox.Item
                key={indicator.id}
                id={indicator.id}
                textValue={`${indicator.code} - ${indicator.name}`}
              >
                <div className="flex min-w-0 flex-col">
                  <span>{indicator.code}</span>
                  <span className="text-xs text-muted-foreground">{indicator.name}</span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
