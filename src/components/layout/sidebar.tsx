"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button, Separator } from "@heroui/react";
import { SquaresFour } from "@phosphor-icons/react";
import { sidebarConfig } from "@/config/sidebar";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { KpiPendingBadge } from "@/modules/hr/kpi/components/kpi-pending-badge";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  dashboard: LayoutDashboard,
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
    const IconComponent = iconMap[icon] || LayoutDashboard;
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
    if (!item.roles || item.roles.length === 0) return true;
    const userRoles = user?.roles ?? [];
    return item.roles.some((role) => userRoles.includes(role));
  });

  const mainItems = filteredItems.filter((item) => !item.href.endsWith("/settings"));
  const bottomItems = filteredItems.filter((item) => item.href.endsWith("/settings"));

  const renderItem = (item: (typeof filteredItems)[number]) => {
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
  };

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
        <ul className="space-y-1">
          {mainItems.map(renderItem)}
        </ul>

        {bottomItems.length > 0 && (
          <ul className="space-y-1 mt-4">
            {bottomItems.map(renderItem)}
          </ul>
        )}
      </nav>
    </aside>
  );
}
