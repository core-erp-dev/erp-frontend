"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { sidebarConfig } from "@/config/sidebar";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { KpiPendingBadge } from "@/modules/hr/kpi/components/kpi-pending-badge";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  settings: Settings,
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
    if (!item.roles || item.roles.length === 0) return true;
    const userRoles = user?.roles ?? [];
    return item.roles.some((role) => userRoles.includes(role));
  });

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center px-5 pt-1">
        <Image
          src="/logo/text-logo.svg"
          alt="STI one"
          width={64}
          height={20}
          priority
        />
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
                  {item.href === "/hr/kpi/approvals" && <KpiPendingBadge />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
