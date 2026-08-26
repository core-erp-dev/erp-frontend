'use client';

import React from 'react';
import { Button, Dropdown, Header, Label, Pagination, SearchField, Spinner, Table } from '@heroui/react';
import { Check, FunnelSimple, SlidersHorizontal, Tray, X } from '@phosphor-icons/react';
import type { Selection } from '@heroui/react';

export interface KpiTableOption {
  id: string;
  label: string;
}

export interface KpiTableFilterSection {
  id: string;
  label: string;
  options: KpiTableOption[];
}

export interface KpiTableProps {
  ariaLabel: string;
  contentAriaLabel: string;
  minWidth?: string;
  header: React.ReactNode;
  children: React.ReactNode;
  isLoading: boolean;
  error: string | null;
  emptyLabel: React.ReactNode;
  onRetry?: () => void;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

/** Table shell copied from the Pegawai table: state stays inside Table.Body. */
export function KpiTable({
  ariaLabel,
  contentAriaLabel,
  minWidth = 'min-w-[700px]',
  header,
  children,
  isLoading,
  error,
  emptyLabel,
  onRetry,
  totalItems,
  currentPage,
  totalPages,
  pageSize = 10,
  onPageChange,
}: KpiTableProps) {
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i + 1);

  return (
    <Table aria-label={ariaLabel}>
      <Table.ScrollContainer>
        <Table.Content aria-label={contentAriaLabel} className={minWidth}>
          <Table.Header>{header}</Table.Header>
          <Table.Body
            renderEmptyState={() => {
              if (isLoading) {
                return <div className="flex h-24 items-center justify-center"><Spinner size="md" /></div>;
              }
              if (error) {
                return (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-danger">
                    <span className="text-sm">{error}</span>
                    {onRetry && <Button variant="secondary" size="sm" onPress={onRetry}>Coba Lagi</Button>}
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Tray className="h-8 w-8" />
                  <span className="text-sm">{emptyLabel}</span>
                </div>
              );
            }}
          >
            {isLoading ? [] : children}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>

      {!isLoading && !error && totalItems > 0 && (
        <Table.Footer>
          <Pagination size="sm">
            <Pagination.Summary>{startItem}–{endItem} dari {totalItems} data</Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={currentPage === 1} onPress={() => onPageChange(currentPage - 1)}>
                  <Pagination.PreviousIcon />
                  Sebelumnya
                </Pagination.Previous>
              </Pagination.Item>
              {pages.map((page) => (
                <Pagination.Item key={page}>
                  <Pagination.Link isActive={page === currentPage} onPress={() => onPageChange(page)}>{page}</Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => onPageChange(currentPage + 1)}>
                  Berikutnya
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      )}
    </Table>
  );
}

interface KpiTableToolbarProps {
  leading?: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  filterOptions?: KpiTableOption[];
  filterSections?: KpiTableFilterSection[];
  filterSelectionMode?: 'single' | 'multiple';
  selectedFilterIds?: Set<string>;
  filterCount?: number;
  onFilterChange?: (selection: Selection) => void;
  sortOptions?: KpiTableOption[];
  selectedSortId?: string;
  onSortChange?: (selection: Selection) => void;
  hasActiveFilters?: boolean;
  onReset?: () => void;
}

/** Toolbar layout copied from Pegawai: controls left, search right. */
export function KpiTableToolbar({
  leading,
  searchValue,
  onSearchChange,
  searchLabel,
  filterOptions = [],
  filterSections = [],
  filterSelectionMode = 'multiple',
  selectedFilterIds = new Set<string>(),
  filterCount,
  onFilterChange,
  sortOptions = [],
  selectedSortId,
  onSortChange,
  hasActiveFilters = false,
  onReset,
}: KpiTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {leading}
        {(filterOptions.length > 0 || filterSections.length > 0) && onFilterChange && (
          <Dropdown>
            <Button variant="tertiary" aria-label="Filter">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {(filterCount ?? selectedFilterIds.size) > 0 && <><span className="mx-0.5 h-4 w-px bg-border" /><span className="text-sm font-medium text-foreground">{filterCount ?? selectedFilterIds.size}</span></>}
            </Button>
            <Dropdown.Popover className="min-w-[220px]">
              <Dropdown.Menu selectedKeys={selectedFilterIds} selectionMode={filterSelectionMode} onSelectionChange={onFilterChange}>
                {filterSections.length > 0 ? filterSections.map((section) => (
                  <Dropdown.Section key={section.id}>
                    <Header>{section.label}</Header>
                    {section.options.map((option) => (
                      <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                        <Dropdown.ItemIndicator /><Label>{option.label}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                )) : filterOptions.map((option) => (
                  <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                    <Dropdown.ItemIndicator /><Label>{option.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}

        {sortOptions.length > 0 && onSortChange && (
          <Dropdown>
            <Button variant="tertiary" aria-label="Urutkan">
              <FunnelSimple className="h-4 w-4" />
              Urutkan
              {selectedSortId && selectedSortId !== sortOptions[0]?.id && <><span className="mx-0.5 h-4 w-px bg-border" /><Check className="h-4 w-4" /></>}
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu selectedKeys={new Set(selectedSortId ? [selectedSortId] : [])} selectionMode="single" onSelectionChange={onSortChange}>
                {sortOptions.map((option) => (
                  <Dropdown.Item key={option.id} id={option.id} textValue={option.label}>
                    <Dropdown.ItemIndicator /><Label>{option.label}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}

        {hasActiveFilters && onReset && <Button isIconOnly variant="tertiary" aria-label="Hapus filter" onPress={onReset}><X className="h-4 w-4" /></Button>}
      </div>

      <SearchField name="search" value={searchValue} onChange={onSearchChange} className="w-72" aria-label={searchLabel}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Cari" />
          <SearchField.ClearButton aria-label="Hapus pencarian" />
        </SearchField.Group>
      </SearchField>
    </div>
  );
}
