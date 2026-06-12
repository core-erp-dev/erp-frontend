import { Sidebar } from './sidebar';
import { Header } from './header';
import { AuthGuard } from './auth-guard';
import { Toast } from '@heroui/react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
          <Header />

          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>

        </div>
      </div>
      <Toast.Provider />
    </AuthGuard>
  );
}
