"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dropdown, Avatar, Label, Separator } from "@heroui/react";
import { sidebarConfig } from "@/config/sidebar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MoreVertical,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { KpiPendingBadge } from "@/modules/hr/kpi/components/kpi-pending-badge";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: LayoutDashboard,
};

const getIcon = (
  icon: string | React.FC<{ className?: string }>,
  className?: string,
): React.ReactNode => {
  if (typeof icon === "string") {
    const IconComponent = iconMap[icon] || LayoutDashboard;
    return <IconComponent className={cn("h-5 w-5", className)} />;
  }
  const IconComponent = icon;
  return <IconComponent className={cn("h-5 w-5", className)} />;
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const activeModule = pathname.split("/").filter(Boolean)[0] || "";

  const filteredItems = sidebarConfig.filter((item) => {
    if (item.module !== activeModule) return false;
    // If item has no roles restriction, show to everyone
    if (!item.roles || item.roles.length === 0) return true;
    // Otherwise, user must have at least one of the required roles
    const userRoles = user?.roles ?? [];
    return item.roles.some((role) => userRoles.includes(role));
  });

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";
  const displayName = user?.username || "Pengguna";
  const displayEmail = user?.email || "-";

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center px-4">
        <span className="font-bold text-foreground">erpsystem</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
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
                  {/* KPI Pending Badge */}
                  {item.href === "/hr/kpi/approvals" && <KpiPendingBadge />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden pl-1">
          <Avatar size="sm">
            <Avatar.Fallback>{userInitial}</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col items-start text-left truncate">
            <span className="font-medium text-foreground truncate w-full">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full">
              {displayEmail}
            </span>
          </div>
        </div>

        <Dropdown>
          <Dropdown.Trigger className="outline-none">
            <div
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#EBEBEC] outline-none"
              aria-label="Menu profil"
            >
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="right bottom" className="min-w-50">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === "logout") {
                  logout();
                }
              }}
            >
              <Dropdown.Item id="account" textValue="Akun">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-normal">Akun</Label>
                </div>
              </Dropdown.Item>
              <Dropdown.Item id="settings" textValue="Pengaturan">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-normal">Pengaturan</Label>
                </div>
              </Dropdown.Item>
              <Separator />
              <Dropdown.Item id="logout" textValue="Keluar" variant="danger">
                <div className="flex items-center gap-2 text-danger">
                  <LogOut className="h-4 w-4" />
                  <Label className="font-normal">Keluar</Label>
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </aside>
  );
}
