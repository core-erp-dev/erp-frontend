'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, FieldError, Form, Label, Modal, TextArea, TextField } from '@heroui/react';
import { Warning, X } from '@phosphor-icons/react';

const schema = z.object({ reason: z.string().trim().min(1, 'Alasan penolakan wajib diisi.').max(1000, 'Alasan penolakan maksimal 1.000 karakter.') });
type FormValues = z.infer<typeof schema>;

interface KpiRejectionDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}

export function KpiRejectionDialog({ isOpen, title, description, onClose, onSubmit }: KpiRejectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });
  useEffect(() => { if (isOpen) form.reset({ reason: '' }); }, [form, isOpen]);
  const close = () => { if (!isSubmitting) { form.reset({ reason: '' }); onClose(); } };
  const submit = async (values: FormValues) => {
    setIsSubmitting(true);
    try { if (await onSubmit(values.reason.trim())) { form.reset({ reason: '' }); onClose(); } }
    finally { setIsSubmitting(false); }
  };
  return <Modal.Backdrop isOpen={isOpen} isDismissable={!isSubmitting} onOpenChange={(open) => { if (!open) close(); }}><Modal.Container scroll="outside"><Modal.Dialog className="sm:max-w-[600px]" aria-label={title}><Modal.Header className="relative flex items-center justify-center"><Modal.Icon className="bg-danger-soft text-danger-soft-foreground"><Warning className="size-5" /></Modal.Icon><Modal.Heading className="text-center">{title}</Modal.Heading><Modal.CloseTrigger className="absolute right-0" /></Modal.Header><Modal.Body className="p-6"><Form id="kpi-rejection-form" validationBehavior="aria" onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">{description}</p><Controller control={form.control} name="reason" render={({ field, fieldState }) => <TextField isRequired className="w-full" value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} isInvalid={fieldState.invalid} isDisabled={isSubmitting}><Label>Alasan Penolakan</Label><TextArea variant="secondary" placeholder="Jelaskan alasan penolakan" rows={3} /><FieldError>{fieldState.error?.message}</FieldError></TextField>} /></Form></Modal.Body><Modal.Footer className="flex justify-end gap-2"><Button variant="secondary" onPress={close} isDisabled={isSubmitting}><X className="h-4 w-4" />Batal</Button><Button variant="danger" type="submit" form="kpi-rejection-form" isDisabled={isSubmitting} isPending={isSubmitting}>Tolak</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
