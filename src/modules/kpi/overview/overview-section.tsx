'use client';

import React from 'react';
import { Surface } from '@heroui/react';
import Link from 'next/link';

/* ── Card sub-component for metric chips ── */

interface MetricChipProps {
  label: string;
  value: string | number;
}

function MetricChip({ label, value }: MetricChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-default-100 px-3 py-1 text-sm">
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

/* ── Section wrapper ── */

interface OverviewSectionProps {
  title: string;
  children: React.ReactNode;
  footerLink?: { href: string; label: string };
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function OverviewSection({
  title,
  children,
  footerLink,
  error,
  isEmpty,
  emptyMessage,
}: OverviewSectionProps) {
  return (
    <Surface className="flex flex-col gap-4 rounded-3xl p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>

      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyMessage ?? 'No data found.'}</p>
      ) : (
        <div>{children}</div>
      )}

      {footerLink && (
        <Link
          href={footerLink.href}
          className="text-sm font-medium text-primary hover:underline"
        >
          {footerLink.label}
        </Link>
      )}
    </Surface>
  );
}

/* ── Metric row component for sub-sections (e.g. My/Managed/Owned) ── */

interface MetricBlockProps {
  label: string;
  metrics: { label: string; value: string | number }[];
}

export function MetricBlock({ label, metrics }: MetricBlockProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-[8rem] text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {metrics.length > 0 ? (
          metrics.map((m) => <MetricChip key={m.label} label={m.label} value={m.value} />)
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
