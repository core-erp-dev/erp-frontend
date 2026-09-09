'use client';

import { House } from '@phosphor-icons/react';
import { Breadcrumbs, BreadcrumbsItem } from '@heroui/react';

import { ProfilePasswordForm } from '@/modules/settings/components/profile-password-form';

export default function ProfileSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Breadcrumbs>
        <BreadcrumbsItem href="/">
          <House className="h-4 w-4" />
        </BreadcrumbsItem>
        <BreadcrumbsItem href="/settings">Settings</BreadcrumbsItem>
        <BreadcrumbsItem>Profil</BreadcrumbsItem>
      </Breadcrumbs>

      <h1 className="text-xl font-semibold text-foreground">Profil</h1>
      <ProfilePasswordForm />
    </div>
  );
}
