'use client';

import { Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { House } from '@phosphor-icons/react';

export default function HRDashboardPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>HR</BreadcrumbsItem>
      </Breadcrumbs>

      <div className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground">
          Selamat datang di Dasbor HR
        </p>
      </div>

      <div className="mt-6">
        {/* Konten dasbor akan ditampilkan di sini */}
      </div>
    </div>
  );
}
