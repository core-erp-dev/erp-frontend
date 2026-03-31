'use client';

import { usePathname } from 'next/navigation';
const titleMap: Record<string, string> = {
  '/': 'Dashboard',
};

export function Header() {
  const pathname = usePathname();
  const title = titleMap[pathname] || 'erpsystem';

  return (
    <header className="flex h-14 items-center border-b border-border bg-background px-6">
      <span className="font-semibold text-foreground">{title}</span>
    </header>
  );
}
