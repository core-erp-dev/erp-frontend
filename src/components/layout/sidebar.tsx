"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Avatar, Description, Label } from "@heroui/react";
import {
  SquaresFour,
  Gear as Settings,
  SignOut,
} from "@phosphor-icons/react";
import { navigationConfig } from "@/config/navigation";
import type { SidebarItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { logout } from "@/lib/auth";

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

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const displayName = user?.username || "User";
  const userInitial = displayName.charAt(0).toUpperCase();
  const userEmail = user?.email || "";

  const filteredItems = navigationConfig.filter((item) => {
    if (item.capability) {
      const userPerms = user?.permissions ?? [];
      return item.capability(userPerms);
    }

    if (item.permissions && item.permissions.length > 0) {
      const userPerms = user?.permissions ?? [];
      return item.permissions.some((perm) => userPerms.includes(perm));
    }

    if (item.roles && item.roles.length > 0) {
      const userRoles = user?.roles ?? [];
      return item.roles.some((role) => userRoles.includes(role));
    }

    return true;
  });

  const groups = filteredItems.reduce(
    (acc, item) => {
      const group = item.group || "default";

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push(item);
      return acc;
    },
    {} as Record<string, SidebarItem[]>,
  );

  const mainGroups = Object.entries(groups).filter(
    ([key]) => key !== "SETTINGS" && key !== "default",
  );

  const defaultGroup = groups.default || [];

  const settingsGroup = (groups.SETTINGS || []).filter(
    (item) => item.title !== "Access Control & Roles",
  );

  const renderItem = (item: SidebarItem) => {
    const isActive = pathname === item.href;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-[#EBEBEC] font-semibold text-foreground"
              : "font-normal text-muted-foreground hover:bg-[#EBEBEC] hover:text-foreground",
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
    <aside
      className={cn(
        "flex flex-col overflow-hidden border-r border-border bg-background transition-all duration-300",
        isOpen ? "w-64" : "w-0",
      )}
    >
      {/* Account section */}
      <div className="flex shrink-0 items-center gap-3 px-6 py-5">
        <Avatar size="sm">
          <Avatar.Fallback>{userInitial}</Avatar.Fallback>
        </Avatar>

        <div className="flex min-w-0 flex-col">
          <Label className="truncate text-sm font-medium text-foreground">
            {displayName}
          </Label>

          <Description className="truncate text-xs">
            {userEmail}
          </Description>
        </div>
      </div>

      <nav className="flex min-w-56 flex-1 flex-col overflow-y-auto p-4 pt-3">
        {/* Main groups */}
        <div className="flex-1">
          {mainGroups.map(([label, items]) => renderGroup(label, items))}

          {defaultGroup.length > 0 && (
            <ul className="space-y-1">{defaultGroup.map(renderItem)}</ul>
          )}
        </div>

        {/* Bottom section: Settings + Sign Out */}
        <ul className="space-y-0.5">
          {settingsGroup.map(renderItem)}

          <li>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                "font-normal text-muted-foreground hover:bg-[#EBEBEC] hover:text-foreground",
              )}
            >
              <SignOut className="h-5 w-5 text-gray-500" />
              Sign Out
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
