'use client';

import { useRouter } from 'next/navigation';
import { House } from '@phosphor-icons/react';
import {
  Breadcrumbs,
  BreadcrumbsItem,
  Description,
  Label,
  ListBox,
} from '@heroui/react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem>Settings</BreadcrumbsItem>
      </Breadcrumbs>

      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      <ListBox
        aria-label="Settings options"
        selectionMode="none"
        onAction={(key) => {
          if (key === 'roles') {
            router.push('/settings/roles');
          }
        }}
        className="p-0"
      >
        <ListBox.Item id="roles" textValue="Access Control & Roles">
          <div className="flex flex-col gap-0.5">
            <Label>Access Control & Roles</Label>
            <Description>Manage roles and permissions</Description>
          </div>
        </ListBox.Item>
      </ListBox>
    </div>
  );
}
