"use client";

import { useRouter } from "next/navigation";
import {
  Button,
  Avatar,
  Dropdown,
  Label,
  Separator,
  SearchField,
} from "@heroui/react";
import {
  Bell,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const userInitial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";
  const displayName = user?.username || "Pengguna";

  return (
    <header className="flex h-16 items-center bg-[#f5f5f5] px-6">
      {/* Center: Searchbar — takes remaining space, centers content */}
      <div className="flex flex-1 justify-center">
        <SearchField>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari" className="w-[320px]" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Right: Notification + Profile */}
      <div className="flex items-center gap-2">
        <Button
          variant="tertiary"
          size="md"
          isIconOnly
          aria-label="Notifikasi"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <Dropdown>
          <Dropdown.Trigger className="outline-none">
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-[#EBEBEC] cursor-pointer">
              <Avatar size="sm">
                <Avatar.Fallback>{userInitial}</Avatar.Fallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground data-[open=true]:rotate-180 transition-transform" />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end" className="min-w-48">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === "profile") {
                  router.push("/profile");
                } else if (key === "account-settings") {
                  router.push("/settings");
                } else if (key === "logout") {
                  logout();
                }
              }}
            >
              <Dropdown.Item id="profile" textValue="Profil">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-normal">Profil</Label>
                </div>
              </Dropdown.Item>
              <Dropdown.Item id="account-settings" textValue="Pengaturan Akun">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-normal">Pengaturan Akun</Label>
                </div>
              </Dropdown.Item>
              <Separator />
              <Dropdown.Item
                id="logout"
                textValue="Keluar"
                variant="danger"
              >
                <div className="flex items-center gap-2 text-danger">
                  <LogOut className="h-4 w-4" />
                  <Label className="font-normal">Keluar</Label>
                </div>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </header>
  );
}
