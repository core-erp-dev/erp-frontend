"use client";

import { Button } from "@heroui/react";
import { Bell, MagnifyingGlass, SidebarSimple } from "@phosphor-icons/react";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-16 items-center bg-[#f5f5f5] px-6">
      {/* Left: Sidebar toggle */}
      <Button
        variant="ghost"
        size="md"
        isIconOnly
        onPress={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <SidebarSimple className="h-5 w-5" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Search + Notification */}
      <div className="flex items-center gap-2">
        <Button
          variant="tertiary"
          size="md"
          isIconOnly
          aria-label="Search"
        >
          <MagnifyingGlass className="h-5 w-5" />
        </Button>
        <Button
          variant="tertiary"
          size="md"
          isIconOnly
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
