'use client';

/**
 * Shared multi-select Role picker used by both:
 * - Create/Edit Position (position-form.tsx);
 * - Create/Edit Employee positionless mode (employee-form.tsx).
 *
 * Extracted verbatim from the Position form so both screens share the exact
 * same component, state handling, filtering, chips, and empty state.
 * Built on HeroUI `Autocomplete` (multiple) + `TagGroup` chips + `SearchField`.
 */

import { useMemo } from 'react';
import type { Key } from 'react-aria-components';
import {
  Autocomplete,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
  useFilter,
} from '@heroui/react';
import type { RoleResponse } from '@/modules/organization/employees/types';

interface RoleMultiSelectProps {
  roles: RoleResponse[];
  /** Selected role ids (numbers). */
  value: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

export function RoleMultiSelect({
  roles,
  value,
  onChange,
  label = 'Role',
  placeholder = 'Cari Role',
  isRequired,
  isDisabled,
  isInvalid,
  errorMessage,
}: RoleMultiSelectProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const selectedKeys = value.map(String);

  // Selected roles first, then unselected
  const sortedRoles = useMemo(() => {
    const selectedIds = new Set(value);
    return [...roles].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 0 : 1;
      const bSelected = selectedIds.has(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [roles, value]);

  const onRemoveTags = (keys: Set<Key>) => {
    const removeSet = new Set(Array.from(keys).map(Number));
    onChange(value.filter((id) => !removeSet.has(id)));
  };

  return (
    <Autocomplete
      className="w-full"
      placeholder={placeholder}
      selectionMode="multiple"
      isRequired={isRequired}
      value={selectedKeys}
      onChange={(keys) => {
        const arr = Array.isArray(keys) ? keys : keys != null ? [keys] : [];
        onChange(arr.map(Number));
      }}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {({ defaultChildren, isPlaceholder, state }: any) => {
            if (isPlaceholder || state.selectedItems.length === 0) {
              return defaultChildren;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selectedItemsKeys = state.selectedItems.map((item: any) => item.key);
            return (
              <TagGroup size="sm" onRemove={onRemoveTags}>
                <TagGroup.List>
                  {selectedItemsKeys.map((key: Key) => {
                    const role = roles.find((r) => String(r.id) === String(key));
                    if (!role) return null;
                    return (
                      <Tag key={role.id} id={String(role.id)}>
                        {role.roleCode}
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
          <SearchField autoFocus name="search" aria-label="Cari Role">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Cari role..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <EmptyState>Role tidak ditemukan</EmptyState>}>
            {sortedRoles.map((role) => (
              <ListBox.Item key={role.id} id={String(role.id)} textValue={role.roleCode}>
                <div className="flex flex-col">
                  <span>{role.roleCode}</span>
                  {role.description && (
                    <span className="text-xs text-muted-foreground">{role.description}</span>
                  )}
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
