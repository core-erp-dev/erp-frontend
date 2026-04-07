'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; email: string; role: string } | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const isAdmin = user && (user.role.toUpperCase() === 'ADMIN' || user.role.toUpperCase() === 'HR');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Selamat datang, {user?.username ?? 'User'}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <div className="col-span-full bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-2">ERP System</h2>
          <p className="text-white/80 max-w-2xl">
            Sistem manajemen sumber daya perusahaan terintegrasi. 
            {isAdmin 
              ? ' Anda memiliki akses ke User Management untuk mengelola pengguna, jabatan, dan hak akses.'
              : ' Saat ini belum ada modul yang tersedia untuk role Anda. Hubungi administrator untuk informasi lebih lanjut.'
            }
          </p>
        </div>

        {isAdmin && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V17a6.003 6.003 0 017.212-5.883 6.006 6.006 0 014.002 4.813" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">User Management</h3>
                  <p className="text-sm text-gray-500">Kelola pengguna & role</p>
                </div>
              </div>
              <a
                href="/dashboard/user-management"
                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Buka
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
