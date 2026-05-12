'use client';

import Link from 'next/link';
import { Card } from '@heroui/react';
import { Users } from 'lucide-react';
import { AuthGuard } from '@/components/layout/auth-guard';

const modules = [
  {
    title: 'Sumber Daya Manusia',
    description: 'Kelola karyawan, hierarki organisasi, dan operasional HR.',
    href: '/hr',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
];

export default function ModuleSelectorPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-foreground">erpsystem</h1>
          <p className="mt-2 text-muted-foreground">
            Pilih modul untuk memulai
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group">
                <Card className="w-72 cursor-pointer p-6 transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${mod.bgColor}`}
                  >
                    <Icon className={`h-6 w-6 ${mod.color}`} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {mod.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
