"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Avatar, Separator } from "@heroui/react";
import { SquaresFour } from "@phosphor-icons/react";
import { ChevronDown, ChevronUp, User as UserIcon, Settings, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";
  const displayName = user?.username || "Pengguna";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  return (
    <header className="flex h-16 items-center justify-end bg-[#f5f5f5] px-6">
      <div className="flex items-center gap-2">
        <Button
          variant="tertiary"
          size="md"
          isIconOnly
          aria-label="Ganti Modul"
          onPress={() => router.push("/")}
        >
          <SquaresFour className="h-5 w-5" weight="regular" />
        </Button>

        {/* Profile section */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#EBEBEC] outline-none"
          >
            <Avatar size="sm">
              <Avatar.Fallback>{userInitial}</Avatar.Fallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {displayName}
            </span>
            {isProfileOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-background shadow-lg z-50 py-1">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push("/profile");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#EBEBEC] transition-colors"
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                Profil
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#EBEBEC] transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Pengaturan Akun
              </button>
              <Separator />
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
