'use client';

import { Breadcrumbs, BreadcrumbsItem } from '@heroui/react';
import { House } from '@phosphor-icons/react';
import { HierarchyView as HierarchyPage } from '@/modules/hr/hierarchy/components/hierarchy-view';

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/hr">HR</BreadcrumbsItem>
        <BreadcrumbsItem>Struktur Jabatan</BreadcrumbsItem>
      </Breadcrumbs>

      <HierarchyPage />
    </div>
  );
}
