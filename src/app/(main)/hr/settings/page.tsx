'use client';

import { useRouter } from 'next/navigation';
import { Lock } from '@phosphor-icons/react';
import { Button } from '@heroui/react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          System configuration and access management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="ghost"
          aria-label="Access Control & Roles"
          onPress={() => router.push('/hr/settings/roles')}
          className="flex flex-row items-center gap-4 rounded-xl border border-border p-5 text-left transition-colors hover:border-[#006FEE] h-auto"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Lock className="h-6 w-6 text-[#006FEE]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Access Control & Roles</div>
            <div className="text-xs text-gray-500">Manage roles and permissions</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
