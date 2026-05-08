import { Header } from '@/components/layout/header';

export default function HRDashboardPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <Header title="Dashboard" />

      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-lg text-muted-foreground">
          Welcome to the HR Dashboard
        </p>
      </main>
    </div>
  );
}
