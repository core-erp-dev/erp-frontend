'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AuthGuard } from './auth-guard';
import { Toast } from '@heroui/react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} />

        <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
          <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </div>
        </div>
      </div>

      <Toast.Provider />
    </AuthGuard>
  );
}
