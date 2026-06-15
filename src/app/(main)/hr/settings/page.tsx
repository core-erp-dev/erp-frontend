'use client';

import { useRouter } from 'next/navigation';
import { Lock } from '@phosphor-icons/react';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Konfigurasi sistem dan manajemen akses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => router.push('/hr/settings/roles')}
          className="flex flex-row items-center gap-4 rounded-xl border border-border p-5 text-left transition-colors hover:border-[#006FEE]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Lock className="h-6 w-6 text-[#006FEE]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Hak Akses & Role</div>
            <div className="text-xs text-gray-500">Kelola role dan permission</div>
          </div>
        </button>
      </div>
    </div>
  );
}
