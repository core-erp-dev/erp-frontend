"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  TextField,
  Input,
  Label,
  Autocomplete,
  SearchField,
  ListBox,
  EmptyState,
  useFilter,
  DatePicker,
  DateField,
  Calendar,
  Switch,
  Description,
  FieldError,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { CoreUser } from "../types";
import { PositionTree } from "@/modules/hr/hierarchy/types";

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    userId: string;
    positionId: number;
    startDate: string;
    isPrimary: boolean;
  }) => void;
  userId?: string | null;
  positionId?: number | null;
  users: CoreUser[];
  positions: PositionTree[];
  isSubmitting?: boolean;
}

interface FormData {
  userId: string | null;
  positionId: number | null;
  startDate: string;
  isPrimary: boolean;
}

export const AssignUserModal: React.FC<AssignUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  positionId,
  users,
  positions,
  isSubmitting = false,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { contains } = useFilter({ sensitivity: "base" });

  const [formData, setFormData] = useState<FormData>({
    userId: null,
    positionId: null,
    startDate: new Date().toISOString().split("T")[0],
    isPrimary: true,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        userId: userId ?? null,
        positionId: positionId ?? null,
        startDate: new Date().toISOString().split("T")[0],
        isPrimary: true,
      });
      setErrors({});
    }
  }, [isOpen, userId, positionId]);

  const flattenPositions = (
    positions: PositionTree[],
    depth = 0,
  ): { position: PositionTree; depth: number }[] => {
    const result: { position: PositionTree; depth: number }[] = [];
    positions.forEach((pos) => {
      result.push({ position: pos, depth });
      if (pos.children && pos.children.length > 0) {
        result.push(...flattenPositions(pos.children, depth + 1));
      }
    });
    return result;
  };

  const flatPositions = flattenPositions(positions);
  const activeUsers = users.filter((u) => u.isActive);

  const getSelectedUserName = () => {
    if (!formData.userId) return "Karyawan tidak ditemukan";
    const user = activeUsers.find((u) => u.id === formData.userId);
    return user
      ? `${user.fullName} (${user.nip || "Tanpa NIP"})`
      : "Karyawan tidak ditemukan";
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId) {
      newErrors.userId = "Data karyawan tidak valid";
    }
    if (!formData.positionId) {
      newErrors.positionId = "Pilih jabatan terlebih dahulu";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Tanggal mulai wajib diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSuccess({
        userId: formData.userId!,
        positionId: formData.positionId!,
        startDate: formData.startDate,
        isPrimary: formData.isPrimary,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = isSubmitting || submitting;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-120">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading className="px-2">Atur Jabatan Karyawan</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-2">
              <form
                id="assign-user-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                <TextField
                  isDisabled
                  validationBehavior="aria"
                  className="w-full"
                  name="userName"
                  isInvalid={!!errors.userId}
                >
                  <Label>Karyawan</Label>
                  <Input value={getSelectedUserName()} />
                  {errors.userId && <FieldError>{errors.userId}</FieldError>}
                </TextField>

                <Autocomplete
                  isRequired
                  validationBehavior="aria"
                  className="w-full"
                  placeholder="Cari dan pilih jabatan..."
                  selectionMode="single"
                  selectedKey={
                    formData.positionId ? formData.positionId.toString() : null
                  }
                  onSelectionChange={(key) => {
                    setFormData({
                      ...formData,
                      positionId: key ? Number(key) : null,
                    });
                    setErrors((prev) => ({ ...prev, positionId: "" }));
                  }}
                  isInvalid={!!errors.positionId}
                  isDisabled={isLoading}
                >
                  <Label>Jabatan</Label>
                  <Autocomplete.Trigger>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover>
                    <Autocomplete.Filter filter={contains}>
                      <SearchField autoFocus name="search" variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder="Cari jabatan..." />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        renderEmptyState={() => (
                          <EmptyState>Jabatan tidak ditemukan</EmptyState>
                        )}
                      >
                        {flatPositions.map(({ position }) => (
                          <ListBox.Item
                            key={position.id.toString()}
                            id={position.id.toString()}
                            textValue={position.positionName}
                          >
                            {/* Render polos, tidak menjorok dan tanpa kode */}
                            {position.positionName}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                  {errors.positionId && (
                    <FieldError>{errors.positionId}</FieldError>
                  )}
                </Autocomplete>

                <DatePicker
                  isRequired
                  validationBehavior="aria"
                  className="w-full"
                  name="startDate"
                  isInvalid={!!errors.startDate}
                  isDisabled={isLoading}
                  value={
                    formData.startDate ? parseDate(formData.startDate) : null
                  }
                  onChange={(date) => {
                    setFormData({
                      ...formData,
                      startDate: date ? date.toString() : "",
                    });
                    setErrors((prev) => ({ ...prev, startDate: "" }));
                  }}
                >
                  <Label>Tanggal Mulai</Label>
                  <DateField.Group fullWidth>
                    <DateField.Input>
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  {errors.startDate && (
                    <FieldError>{errors.startDate}</FieldError>
                  )}
                  <DatePicker.Popover>
                    <Calendar aria-label="Pilih tanggal mulai">
                      <Calendar.Header>
                        <Calendar.YearPickerTrigger>
                          <Calendar.YearPickerTriggerHeading />
                          <Calendar.YearPickerTriggerIndicator />
                        </Calendar.YearPickerTrigger>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => (
                            <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                          )}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>
                          {(date) => <Calendar.Cell date={date} />}
                        </Calendar.GridBody>
                      </Calendar.Grid>
                      <Calendar.YearPickerGrid>
                        <Calendar.YearPickerGridBody>
                          {({ year }) => (
                            <Calendar.YearPickerCell year={year} />
                          )}
                        </Calendar.YearPickerGridBody>
                      </Calendar.YearPickerGrid>
                    </Calendar>
                  </DatePicker.Popover>
                </DatePicker>

                {/* Switch di sebelah Kanan, Teks di Kiri */}
                <Switch
                  isSelected={formData.isPrimary}
                  onChange={(isSelected) =>
                    setFormData({ ...formData, isPrimary: isSelected })
                  }
                  isDisabled={isLoading}
                  className="mt-2 w-full justify-between"
                >
                  <Switch.Content>
                    <Label className="text-sm font-medium">
                      Jadikan Jabatan Utama
                    </Label>
                    <Description className="text-xs text-muted-foreground block mt-0.5">
                      Jabatan utama sebelumnya akan otomatis ditutup.
                    </Description>
                  </Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </form>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={onClose}
                isDisabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="assign-user-form"
                variant="primary"
                isDisabled={isLoading}
                isPending={isLoading}
              >
                {isLoading ? "Menyimpan..." : "Simpan Jabatan"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
