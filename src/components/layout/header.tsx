"use client";

import { Button } from "@heroui/react";
import { ArrowRightLeft, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();

  return (
    <header className="flex h-16 items-center justify-end bg-[#f5f5f5] px-6">
      <div className="flex items-center gap-2">
        <Button variant="tertiary" size="md" onPress={() => router.push("/")}>
          <ArrowRightLeft className="h-4 w-4" />
          Ganti Modul
        </Button>

        <Button variant="tertiary" size="md" isIconOnly>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
