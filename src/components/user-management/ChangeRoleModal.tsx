'use client';

import { useState } from 'react';
import { userManagementService } from '@/services/user-management.service';
import type { AuthUserResponse } from '@/types/user-management';

interface ChangeRoleModalProps {
  user: AuthUserResponse;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ROLES = [
  { id: 1, code: 'ADMIN', label: 'Admin' },
  { id: 2, code: 'HR', label: 'HR Admin' },
  { id: 3, code: 'USER_APPROVER', label: 'User Approver' },
  { id: 4, code: 'USER_STAFF', label: 'User Staff' },
];

export function ChangeRoleModal({ user, onClose, onSuccess, onError }: ChangeRoleModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [coreUserId, setCoreUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId || !coreUserId.trim()) return;

    setLoading(true);
    try {
      const result = await userManagementService.updateUserRole(coreUserId.trim(), selectedRoleId);
      const roleName = ROLES.find(r => r.id === result.roleId)?.label || result.roleCode;
      onSuccess(`Role ${user.fullName || user.email} berhasil diubah ke ${roleName}`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal mengubah role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ubah Role</h3>
              <p className="text-sm text-gray-500 mt-0.5">Ubah hak akses pengguna</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.fullName || '-'}</p>
              <p className="text-xs text-gray-500">{user.nip || '-'} &middot; {user.email}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="mb-4">
            <label htmlFor="coreUserId" className="block text-sm font-medium text-gray-700 mb-1.5">
              Core User ID (UUID)
            </label>
            <input
              id="coreUserId"
              type="text"
              value={coreUserId}
              onChange={(e) => setCoreUserId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              placeholder="UUID pengguna di core_users"
            />
            <p className="text-xs text-gray-400 mt-1">
              ID pengguna di tabel core_users (UUID). Assign jabatan terlebih dahulu jika belum ada.
            </p>
          </div>

          <div className="mb-5">
            <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700 mb-1.5">
              Role Baru
            </label>
            <select
              id="roleSelect"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value ? parseInt(e.target.value) : '')}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition bg-white"
            >
              <option value="">Pilih role...</option>
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoleId || !coreUserId.trim()}
              className="flex-1 py-2.5 px-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-teal-400 transition font-medium text-sm flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Memproses...' : 'Ubah Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
