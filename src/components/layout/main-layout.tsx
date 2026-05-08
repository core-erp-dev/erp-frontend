import { Sidebar } from './sidebar';
import { AuthGuard } from './auth-guard';
import { Toaster } from '@/components/ui/sonner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">

          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

        </div>
      </div>
      <Toaster />
    </AuthGuard>
  );
}
