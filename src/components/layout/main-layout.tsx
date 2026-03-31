import { Sidebar } from './sidebar';
import { Header } from './header';
import { AuthGuard } from './auth-guard';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
