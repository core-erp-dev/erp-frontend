"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Separator } from "@heroui/react";
import { SquaresFour, Gear as Settings } from "@phosphor-icons/react";
import { navigationConfig } from "@/config/navigation";
import type { SidebarItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: SquaresFour,
  settings: Settings,
};

const getIcon = (
  icon: string | React.FC<{ className?: string }>,
  className?: string,
): React.ReactNode => {
  if (typeof icon === "string") {
    const IconComponent = iconMap[icon] || SquaresFour;
    return <IconComponent className={cn("h-5 w-5", className)} />;
  }
  const IconComponent = icon;
  return <IconComponent className={cn("h-5 w-5", className)} />;
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const filteredItems = navigationConfig.filter((item) => {
    // Compound capability predicate (supports AND/OR logic)
    if (item.capability) {
      const userPerms = user?.permissions ?? [];
      return item.capability(userPerms);
    }

    // Permission-based filtering (more granular)
    if (item.permissions && item.permissions.length > 0) {
      const userPerms = user?.permissions ?? [];
      return item.permissions.some((perm) => userPerms.includes(perm));
    }

    // Role-based filtering (legacy)
    if (item.roles && item.roles.length > 0) {
      const userRoles = user?.roles ?? [];
      return item.roles.some((role) => userRoles.includes(role));
    }

    return true;
  });

  // Group items by group label
  const groups = filteredItems.reduce(
    (acc, item) => {
      const group = item.group || "default";
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, SidebarItem[]>,
  );

  // Separate main groups from SETTINGS
  const mainGroups = Object.entries(groups).filter(
    ([key]) => key !== "SETTINGS" && key !== "default",
  );
  const defaultGroup = groups["default"] || [];
  const settingsGroup = groups["SETTINGS"] || [];

  const renderItem = (item: SidebarItem) => {
    const isActive = pathname === item.href;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-[#EBEBEC] text-foreground font-semibold"
              : "text-muted-foreground hover:bg-[#EBEBEC] hover:text-foreground font-normal",
          )}
        >
          {getIcon(
            item.icon,
            isActive ? "text-foreground" : "text-gray-500",
          )}
          {item.title}
        </Link>
      </li>
    );
  };

  const renderGroup = (label: string, items: SidebarItem[]) => (
    <div key={label} className="mb-4">
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <ul className="space-y-0.5">{items.map(renderItem)}</ul>
    </div>
  );

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 pt-1">
        <Image
          src="/logo/text-logo.svg"
          alt="STI one"
          width={64}
          height={20}
          priority
          style={{ height: "auto", width: "auto" }}
        />
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto p-4 pt-2">
        {/* Main groups */}
        <div>
          {mainGroups.map(([label, items]) => renderGroup(label, items))}
          {defaultGroup.length > 0 && (
            <ul className="space-y-1">{defaultGroup.map(renderItem)}</ul>
          )}
        </div>

        {/* Bottom group (SETTINGS) */}
        {settingsGroup.length > 0 && (
          <div className="mt-4">
            <Separator className="mb-3" />
            {renderGroup("SETTINGS", settingsGroup)}
          </div>
        )}
      </nav>
    </aside>
  );
}
