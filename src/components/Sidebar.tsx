'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';

interface NavItem {
  label: string;
  href: string;
  matchPrefix?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const USER_MGMT_ICON = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V17a6.003 6.003 0 017.212-5.883 6.006 6.006 0 014.002 4.813M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07m0 0a5.97 5.97 0 00-4.214-2.94M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const DASHBOARD_ICON = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

function getNavItems(role: string): NavItem[] {
  const items: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: DASHBOARD_ICON,
    },
  ];

  const upperRole = role.toUpperCase();
  if (upperRole === 'ADMIN' || upperRole === 'HR') {
    items.push({
      label: 'User Management',
      href: '/dashboard/user-management',
      matchPrefix: '/dashboard/user-management',
      icon: USER_MGMT_ICON,
    });
  }

  return items;
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserName(user.username);
      setUserRole(user.role);
      setNavItems(getNavItems(user.role));
    }
  }, []);

  const isActive = (item: NavItem) =>
    item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;

  const handleLogout = () => {
    authService.logout();
  };

  const w = collapsed ? 72 : 256;

  return (
    <>
      <aside
        style={{ width: w }}
        className="fixed top-3 left-3 bottom-3 z-40 flex flex-col bg-linear-to-b from-teal-700 to-teal-800 text-white shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden"
      >
        {/* Logo / Toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-3 px-4 pt-5 pb-3 hover:opacity-80 transition cursor-pointer shrink-0 overflow-hidden"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </span>
          {!collapsed && (
            <span className="text-base font-bold leading-tight whitespace-nowrap">
              ERP System
            </span>
          )}
        </button>

        {/* User info */}
        {!collapsed ? (
          <div className="px-5 pb-4 border-b border-white/10">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[11px] text-white/50 truncate">
              {userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>
          </div>
        ) : (
          <div className="flex justify-center pb-3 border-b border-white/10">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-xs font-bold uppercase">
              {userName.charAt(0)}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`shrink-0 ${active ? 'text-teal-700' : 'text-white/50'}`}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2.5 pb-4">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center gap-3 w-full rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition ${
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
            }`}
          >
            <svg className="w-5 h-5 text-white/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {!collapsed && <span className="truncate">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div style={{ width: w + 24 }} className="shrink-0 transition-all duration-300" aria-hidden />

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Keluar</h3>
                <p className="text-sm text-gray-500">Apakah Anda yakin ingin keluar?</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
