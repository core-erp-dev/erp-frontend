'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/auth.service';
import { userManagementService } from '@/services/user-management.service';
import type { AuthUserResponse } from '@/types/user-management';
import { AssignPositionModal } from '@/components/user-management/AssignPositionModal';
import { ChangeRoleModal } from '@/components/user-management/ChangeRoleModal';
import { Toast } from '@/components/Toast';

export default function UserManagementPage() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<AuthUserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Modal states
  const [assignModal, setAssignModal] = useState<{ open: boolean; user: AuthUserResponse | null }>({ open: false, user: null });
  const [roleModal, setRoleModal] = useState<{ open: boolean; user: AuthUserResponse | null }>({ open: false, user: null });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const user = authService.getUser();
  const isSuperAdmin = user?.role.toUpperCase() === 'ADMIN';

  const fetchUsers = useCallback(async (kw: string) => {
    setLoading(true);
    try {
      const results = await userManagementService.searchUsers(kw);
      setUsers(results);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Gagal memuat pengguna', type: 'error' });
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, []);

  // Initial load — fetch all users
  useEffect(() => {
    fetchUsers('');
  }, [fetchUsers]);

  // Debounced search on keyword change
  useEffect(() => {
    if (!initialLoaded) return;
    const timer = setTimeout(() => {
      fetchUsers(keyword.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword, fetchUsers, initialLoaded]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">
          Cari pengguna, tetapkan jabatan, dan kelola hak akses
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cari Pengguna</h2>
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari berdasarkan nama, NIP, atau email..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
          />
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <svg className="animate-spin w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      {initialLoaded && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Daftar Pengguna
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({users.length} pengguna)
              </span>
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <p className="text-gray-500">Tidak ada pengguna ditemukan</p>
              <p className="text-sm text-gray-400 mt-1">Coba kata kunci lain</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NIP</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm">
                            {(u.fullName || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{u.fullName || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{u.nip || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{u.email}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAssignModal({ open: true, user: u })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            Assign Jabatan
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => setRoleModal({ open: true, user: u })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                              </svg>
                              Change Role
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {assignModal.open && assignModal.user && (
        <AssignPositionModal
          user={assignModal.user}
          onClose={() => setAssignModal({ open: false, user: null })}
          onSuccess={(msg) => {
            setToast({ message: msg, type: 'success' });
            setAssignModal({ open: false, user: null });
          }}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
        />
      )}

      {roleModal.open && roleModal.user && (
        <ChangeRoleModal
          user={roleModal.user}
          onClose={() => setRoleModal({ open: false, user: null })}
          onSuccess={(msg) => {
            setToast({ message: msg, type: 'success' });
            setRoleModal({ open: false, user: null });
          }}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
