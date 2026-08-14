"use client";

import { Button } from "@heroui/react";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/icons/SidebarSimple";

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
        <SidebarSimpleIcon className="h-5 w-5" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />
    </header>
  );
}
