'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { sidebarConfig } from '@/config/sidebar';
import { cn } from '@/lib/utils';
import { LayoutDashboard, MoreVertical, User, Settings, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: LayoutDashboard,
};

const getIcon = (icon: string | React.FC<{ className?: string }>): React.ReactNode => {
  if (typeof icon === 'string') {
    const IconComponent = iconMap[icon] || LayoutDashboard;
    return <IconComponent className="h-5 w-5" />;
  }
  const IconComponent = icon;
  return <IconComponent className="h-5 w-5" />;
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="font-bold text-foreground">erpsystem</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {sidebarConfig.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {getIcon(item.icon)}
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-1 flex-col items-start">
                <span className="font-medium text-foreground">User</span>
                <span className="text-xs text-muted-foreground">user@example.com</span>
              </div>
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-45 rounded-xl border border-border bg-popover p-1 shadow-md"
              side="right"
              align="end"
              sideOffset={4}
            >
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-none hover:bg-accent">
                <User className="h-4 w-4" />
                Account
              </DropdownMenu.Item>
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-none hover:bg-accent">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-none hover:bg-accent"
                onSelect={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </aside>
  );
}
