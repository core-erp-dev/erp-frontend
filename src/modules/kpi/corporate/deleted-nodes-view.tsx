'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Input, Spinner, Table } from '@heroui/react';
import { ArrowCounterClockwise, ArrowsClockwise, MagnifyingGlass } from '@phosphor-icons/react';
import type { CorporateKpiNode, Paginated } from './corporate-kpi.types';

interface Props {
  deletedList: Paginated<CorporateKpiNode>;
  isLoading: boolean;
  isMutating: boolean;
  onRefresh: (params?: { page?: number; size?: number; search?: string }) => Promise<void>;
  onRestore: (nodeId: string) => Promise<unknown>;
}

/** Recycle bin — deleted nodes with per-node restore (version-bearing). */
export function DeletedNodesView({ deletedList, isLoading, isMutating, onRefresh, onRestore }: Props) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    void onRefresh({ page: 1, size: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    void onRefresh({ page: 1, size: 10, search: search.trim() || undefined });
  }, [search, onRefresh]);

  if (isLoading && deletedList.content.length === 0) {
    return <div className="flex justify-center py-8"><Spinner aria-label="Loading deleted nodes" /></div>;
  }
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          variant="secondary"
          aria-label="Search deleted nodes"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" onPress={handleSearch} isDisabled={isLoading}>
          <MagnifyingGlass className="h-4 w-4" />
        </Button>
        <Button variant="tertiary" isIconOnly aria-label="Refresh" onPress={() => onRefresh()} isDisabled={isLoading}>
          <ArrowsClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {deletedList.content.length === 0 && <Alert status="accent">No deleted nodes.</Alert>}
      {deletedList.content.length > 0 && (
        <>
          <Table aria-label="Deleted nodes">
            <Table.Header>
              <Table.Column>Code</Table.Column>
              <Table.Column>Name</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column>Year</Table.Column>
              <Table.Column>Deleted at</Table.Column>
              <Table.Column>Actions</Table.Column>
            </Table.Header>
            <Table.Body>
              {deletedList.content.map((node) => (
                <Table.Row key={node.id}>
                  <Table.Cell><span className="font-mono text-sm">{node.code}</span></Table.Cell>
                  <Table.Cell>{node.name}</Table.Cell>
                  <Table.Cell>{node.nodeType}</Table.Cell>
                  <Table.Cell>{node.year}</Table.Cell>
                  <Table.Cell><span className="text-xs">{node.deletedAt ? new Date(node.deletedAt).toLocaleString() : '—'}</span></Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => onRestore(node.id)}
                      isPending={isMutating}
                    >
                      <ArrowCounterClockwise className="h-4 w-4" /> Restore
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="tertiary" size="sm" isDisabled={deletedList.first || isLoading}
              onPress={() => onRefresh({ page: deletedList.pageNumber - 1, size: 10, search: search.trim() || undefined })}
            >
              Prev
            </Button>
            <span>Page {deletedList.pageNumber} of {Math.max(deletedList.totalPages, 1)}</span>
            <Button
              variant="tertiary" size="sm" isDisabled={deletedList.last || isLoading}
              onPress={() => onRefresh({ page: deletedList.pageNumber + 1, size: 10, search: search.trim() || undefined })}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
