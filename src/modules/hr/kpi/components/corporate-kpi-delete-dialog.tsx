'use client';

import React from 'react';
import {
  Modal,
  Button,
} from '@heroui/react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { CorporateKpiResponse } from '../types';

interface CorporateKpiDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  kpi: CorporateKpiResponse | null;
  isDeleting?: boolean;
}

export const CorporateKpiDeleteDialog: React.FC<CorporateKpiDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  kpi,
  isDeleting = false,
}) => {
  if (!kpi) return null;

  const hasLinkedTasks = kpi.linkedTaskCount > 0;
  const hasChildren = kpi.children && kpi.children.length > 0;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-2 px-2">
                {hasLinkedTasks ? (
                  <XCircle className="h-5 w-5 text-danger" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
                <Modal.Heading>
                  {hasLinkedTasks ? 'Tidak Dapat Dihapus' : 'Konfirmasi Hapus KPI'}
                </Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="p-2">
              {hasLinkedTasks ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    KPI <strong className="text-foreground">{kpi.indicatorCode} — {kpi.indicatorName}</strong> tidak
                    dapat dihapus karena masih terhubung dengan{' '}
                    <strong className="text-foreground">{kpi.linkedTaskCount} tugas</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hapus atau pindahkan tugas terkait terlebih dahulu sebelum menghapus KPI ini.
                  </p>
                </>
              ) : hasChildren ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Apakah Anda yakin ingin menghapus KPI{' '}
                    <strong className="text-foreground">{kpi.indicatorCode} — {kpi.indicatorName}</strong>?
                  </p>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    KPI ini memiliki <strong>{kpi.children!.length} anak KPI</strong> yang akan menjadi root (tanpa
                    induk) setelah penghapusan.
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Apakah Anda yakin ingin menghapus KPI{' '}
                    <strong className="text-foreground">{kpi.indicatorCode} — {kpi.indicatorName}</strong>?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={onClose} isDisabled={isDeleting}>
                {hasLinkedTasks ? 'Tutup' : 'Batal'}
              </Button>
              {!hasLinkedTasks && (
                <Button
                  variant="danger"
                  onPress={onConfirm}
                  isDisabled={isDeleting}
                  isPending={isDeleting}
                >
                  {isDeleting ? 'Menghapus...' : 'Hapus KPI'}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
