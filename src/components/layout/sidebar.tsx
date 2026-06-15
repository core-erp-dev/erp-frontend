"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button, Separator } from "@heroui/react";
import { SquaresFour, Gear as Settings } from "@phosphor-icons/react";
import { sidebarConfig } from "@/config/sidebar";
import type { SidebarItem } from "@/modules/hr/sidebar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: SquaresFour,
  settings: Settings,
};

const moduleLabels: Record<string, string> = {
  hr: "HR",
  finance: "FIN",
  inventory: "INV",
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
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const activeModule = pathname.split("/").filter(Boolean)[0] || "";
  const moduleLabel = moduleLabels[activeModule] || activeModule.toUpperCase();

  const filteredItems = sidebarConfig.filter((item) => {
    if (item.module !== activeModule) return false;

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

  // Separate main groups from PENGATURAN
  const mainGroups = Object.entries(groups).filter(
    ([key]) => key !== "PENGATURAN" && key !== "default",
  );
  const defaultGroup = groups["default"] || [];
  const settingsGroup = groups["PENGATURAN"] || [];

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
      {/* Logo + Module Name */}
      <div className="flex h-14 items-center gap-2.5 px-5 pt-1">
        <Image
          src="/logo/text-logo.svg"
          alt="STI one"
          width={64}
          height={20}
          priority
          style={{ height: "auto" }}
        />
        <span className="text-sm font-bold text-foreground uppercase tracking-wider">
          {moduleLabel}
        </span>
      </div>

      {/* Ganti Modul button */}
      <div className="px-4 pb-2">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onPress={() => router.push("/")}
        >
          <SquaresFour className="h-5 w-5" weight="regular" />
          Ganti Modul
        </Button>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto p-4 pt-2">
        {/* Main groups (ORGANISASI, etc.) */}
        <div>
          {mainGroups.map(([label, items]) => renderGroup(label, items))}
          {defaultGroup.length > 0 && (
            <ul className="space-y-1">{defaultGroup.map(renderItem)}</ul>
          )}
        </div>

        {/* Bottom group (PENGATURAN) */}
        {settingsGroup.length > 0 && (
          <div className="mt-4">
            <Separator className="mb-3" />
            {renderGroup("PENGATURAN", settingsGroup)}
          </div>
        )}
      </nav>
    </aside>
  );
}
