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
      {/* Center: Searchbar */}
      <div className="flex flex-1 justify-center">
        <SearchField aria-label="Cari">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari" className="w-[320px]" />
            <SearchField.ClearButton aria-label="Hapus pencarian" />
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
            <Button
              variant="tertiary"
              size="md"
              aria-label="Menu profil"
              className="rounded-full gap-2 pl-1! pr-3!"
            >
              <Avatar size="sm">
                <Avatar.Fallback>{userInitial}</Avatar.Fallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground data-[open=true]:rotate-180 transition-transform" />
            </Button>
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
