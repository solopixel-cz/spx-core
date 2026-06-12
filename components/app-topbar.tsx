"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Menu, Search, LogOut, User } from "lucide-react";
import { getClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MobileSidebar } from "@/components/app-sidebar";
import { CommandSearch } from "@/components/command-search";
import type { SessionUser } from "@/lib/auth";

export function AppTopbar({
  user,
  displayName,
  photoURL,
}: {
  user: SessionUser;
  displayName: string;
  photoURL: string | null;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogout() {
    try {
      const auth = getClientAuth();
      await signOut(auth);
    } catch {
      // ignore client signout errors
    }

    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="flex h-14 items-center border-b px-4 text-lg font-bold">
              SPX Core
            </SheetTitle>
            <MobileSidebar role={user.role} />
          </SheetContent>
        </Sheet>

        {/* Search */}
        <Button
          variant="outline"
          className="hidden h-9 w-64 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Hledat... (Cmd+K)</span>
        </Button>

        <div className="flex-1" />

        <ThemeToggle />

        {/* Avatar menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" />
            }
          >
            <UserAvatar uid={user.uid} name={displayName} photoURL={photoURL} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "admin" ? "Administrátor" : user.role === "sales" ? "Obchodník" : "Člen"}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profil")}>
              <User className="mr-2 h-4 w-4" />
              Můj profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Odhlásit se
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
