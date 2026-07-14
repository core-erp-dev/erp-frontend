'use client';

import React from 'react';
import { Modal, Button, Surface, Badge } from '@heroui/react';
import {
  KpiTaskChangeRequestResponse,
  CHANGE_REQUEST_TYPE_LABELS,
  CHANGE_REQUEST_STATUS_LABELS,
} from '../types';
import type { TaskChangeRequestStatus, TaskChangeRequestType } from '../types';
import { formatTaskPeriod } from '../utils';

interface TaskChangeRequestDetailModalProps {
  isOpen: boolean;
  request: KpiTaskChangeRequestResponse | null;
  onClose: () => void;
}

function safeParseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDateTime(d: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID');
}

/**
 * Render CREATE proposed data in a human-readable format.
 */
function CreateDataDisplay({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-sm text-muted-foreground">-</span>;

  const taskName = data.taskName as string | undefined;
  const unit = data.unit as string | undefined;
  const target = data.target as number | undefined;
  const periodYear = data.periodYear as number | undefined;
  const periodMonth = data.periodMonth as number | undefined;

  return (
    <div className="space-y-2 rounded-xl bg-surface-secondary p-4 text-sm">
      {taskName && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nama Tugas</span>
          <span className="font-medium text-foreground">{taskName}</span>
        </div>
      )}
      {unit && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Satuan</span>
          <span className="text-muted-foreground">{unit}</span>
        </div>
      )}
      {target !== undefined && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Target</span>
          <span className="font-medium text-foreground">
            {target.toLocaleString('id-ID')} {unit || ''}
          </span>
        </div>
      )}
      {periodMonth !== undefined && periodYear !== undefined && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Periode</span>
          <span className="font-medium text-foreground">
            {formatTaskPeriod(periodMonth as number, periodYear as number)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Render UPDATE comparison: before/after readable fields.
 */
function UpdateDataDisplay({
  previous,
  proposed,
}: {
  previous: Record<string, unknown> | null;
  proposed: Record<string, unknown> | null;
}) {
  if (!previous && !proposed) return <span className="text-sm text-muted-foreground">-</span>;

  const fields = [
    { key: 'taskName', label: 'Nama Tugas' },
    { key: 'unit', label: 'Satuan' },
    { key: 'target', label: 'Target', format: (v: unknown) => typeof v === 'number' ? v.toLocaleString('id-ID') : String(v ?? '-') },
  ];

  // Period display
  const prevPeriod = (previous?.periodYear != null && previous?.periodMonth != null)
    ? formatTaskPeriod(previous.periodMonth as number, previous.periodYear as number)
    : null;
  const propPeriod = (proposed?.periodYear != null && proposed?.periodMonth != null)
    ? formatTaskPeriod(proposed.periodMonth as number, proposed.periodYear as number)
    : null;

  return (
    <div className="space-y-2 rounded-xl bg-surface-secondary p-4 text-sm">
      {fields.map(({ key, label, format: fmt }) => {
        const prevVal = previous?.[key];
        const propVal = proposed?.[key];
        if (prevVal === undefined && propVal === undefined) return null;

        return (
          <div key={key} className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground">
              {fmt ? fmt(prevVal) : String(prevVal ?? '-')}
              {' '}&rarr;{' '}
              <span className="font-medium">{fmt ? fmt(propVal) : String(propVal ?? '-')}</span>
            </span>
          </div>
        );
      })}
      {(prevPeriod || propPeriod) && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Periode</span>
          <span className="text-foreground">
            {prevPeriod || '-'}{' '}&rarr;{' '}
            <span className="font-medium">{propPeriod || '-'}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function JsonDisplay({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-sm text-muted-foreground">-</span>;
  return (
    <div className="rounded-xl bg-surface-secondary p-3 font-mono text-xs text-foreground max-h-60 overflow-y-auto whitespace-pre-wrap">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground">{k}:</span>
          <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')}</span>
        </div>
      ))}
    </div>
  );
}

export const TaskChangeRequestDetailModal: React.FC<TaskChangeRequestDetailModalProps> = ({
  isOpen, request, onClose,
}) => {
  if (!request) return null;

  const previous = safeParseJson(request.previousData);
  const proposed = safeParseJson(request.proposedData);

  // Extract employee/KPI info from proposed data for CREATE
  const proposedEmployee = proposed?.['assignedUserName'] as string | undefined;
  const proposedPosition = proposed?.['assignedPositionName'] as string | undefined;
  const proposedKpi = proposed?.['corporateKpiName'] as string | undefined;

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable onOpenChange={(o) => { if (!o) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.Header className="items-center text-center">
              <Modal.Heading>Detail Permintaan</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Surface className="flex flex-col gap-4 rounded-3xl p-6">
                {/* Header info */}
                <div className="flex items-center gap-3">
                  <Badge
                    variant={request.requestType === 'CREATE' ? 'primary' : request.requestType === 'DELETE' ? 'soft' : 'secondary'}
                    size="sm"
                  >
                    {CHANGE_REQUEST_TYPE_LABELS[request.requestType as TaskChangeRequestType] ?? request.requestType}
                  </Badge>
                  <Badge
                    variant={request.status === 'PENDING' ? 'soft' : request.status === 'APPROVED' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    {CHANGE_REQUEST_STATUS_LABELS[request.status as TaskChangeRequestStatus] ?? request.status}
                  </Badge>
                </div>

                {/* Requester info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diminta Oleh:</span>
                    <span className="font-medium text-foreground">{request.requestedByName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Posisi Pemohon:</span>
                    <span className="text-muted-foreground">{request.requestedByUserPositionName || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tanggal Pengajuan:</span>
                    <span className="text-muted-foreground">{formatDateTime(request.requestedAt)}</span>
                  </div>
                </div>

                {/* Reviewer info if reviewed */}
                {request.reviewedById && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Direview Oleh:</span>
                      <span className="font-medium text-foreground">{request.reviewedByName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Posisi Reviewer:</span>
                      <span className="text-muted-foreground">{request.reviewedByUserPositionName || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tanggal Review:</span>
                      <span className="text-muted-foreground">{formatDateTime(request.reviewedAt ?? '')}</span>
                    </div>
                    {request.reviewNote && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Catatan:</span>
                        <p className="mt-1 rounded-lg bg-surface-secondary p-2 text-xs">{request.reviewNote}</p>
                      </div>
                    )}
                    {request.rejectReason && (
                      <div className="text-sm">
                        <span className="text-danger">Alasan Penolakan:</span>
                        <p className="mt-1 rounded-lg bg-danger/5 p-2 text-xs text-danger">{request.rejectReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Data comparison */}
                <div className="border-t border-border pt-3 space-y-3">
                  {request.requestType === 'CREATE' && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Tugas Baru</h3>
                      {(proposedEmployee || proposedPosition) && (
                        <div className="space-y-2 rounded-xl bg-surface-secondary p-4 text-sm mb-2">
                          {proposedEmployee && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pegawai</span>
                              <span className="font-medium text-foreground">{proposedEmployee}</span>
                            </div>
                          )}
                          {proposedPosition && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Jabatan</span>
                              <span className="text-muted-foreground">{proposedPosition}</span>
                            </div>
                          )}
                          {proposedKpi && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">KPI Korporat</span>
                              <span className="text-muted-foreground">{proposedKpi}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <CreateDataDisplay data={proposed} />
                    </div>
                  )}

                  {request.requestType === 'UPDATE' && (
                    <>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perbandingan Perubahan</h3>
                        <UpdateDataDisplay previous={previous} proposed={proposed} />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Sebelumnya (RAW)</h3>
                        <JsonDisplay data={previous} />
                      </div>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Perubahan (RAW)</h3>
                        <JsonDisplay data={proposed} />
                      </div>
                    </>
                  )}

                  {request.requestType === 'DELETE' && (
                    <>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Tugas</h3>
                        <JsonDisplay data={previous} />
                      </div>
                      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                        <p className="text-xs font-medium text-warning">Alasan Pembatalan</p>
                        <p className="mt-1 text-sm text-foreground">
                          {(proposed as Record<string, unknown>)?.reason as string || (proposed as Record<string, unknown>)?.cancellation_reason as string || '-'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Surface>
            </Modal.Body>
            <Modal.Footer>
              <Button className="w-full" variant="secondary" slot="close" onPress={onClose}>Tutup</Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
