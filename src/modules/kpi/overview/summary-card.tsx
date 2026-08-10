'use client';

import React from 'react';
import Link from 'next/link';
import { Surface } from '@heroui/react';
import { CaretRight } from '@phosphor-icons/react';

interface SummaryCardProps {
  href: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  value: number;
  caption: string | null;
  error?: string | null;
}

/**
 * Clickable dashboard summary card — compact, full grid-cell, whole-card
 * navigation to the related page. The value is a plain count; the caption
 * carries the qualitative summary (e.g. avg progress / per-status breakdown).
 */
export function SummaryCard({ href, icon: Icon, title, value, caption, error }: SummaryCardProps) {
  return (
    <Link href={href} className="group block">
      <Surface className="flex h-full flex-col gap-3 rounded-3xl p-5 transition-colors group-hover:bg-default-50">
        <div className="flex items-center justify-between">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-default-100 text-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <CaretRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="text-3xl font-semibold text-foreground">{value}</span>
        </div>

        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : caption ? (
          <p className="text-sm text-muted-foreground">{caption}</p>
        ) : null}
      </Surface>
    </Link>
  );
}
