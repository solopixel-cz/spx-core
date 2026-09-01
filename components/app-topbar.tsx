"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { Menu, Search, LogOut, User, Loader2, RefreshCw } from "lucide-react";
import { getClientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRefreshControls } from "@/components/refresh-context";
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
import { PixelLogo } from "@/components/pixel-logo";
import { CommandSearch } from "@/components/command-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
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
  const pathname = usePathname();
  const { refresh, isRefreshing } = useRefreshControls();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Po přechodu na jinou stránku zavři mobilní menu (jinak přes celou šířku
  // překryje obsah). Úprava stavu během renderu — stejný vzor jako jinde v appce.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

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
    setLoggingOut(true);
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
      <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        {/* Mobile menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="data-[side=left]:w-full data-[side=left]:max-w-none data-[side=left]:sm:max-w-none p-0"
          >
            <SheetTitle className="flex h-16 items-center gap-2.5 border-b px-4 font-heading text-xl font-bold">
              <PixelLogo className="size-6 shrink-0" />
              SPX Core
            </SheetTitle>
            <MobileSidebar role={user.role} />
          </SheetContent>
        </Sheet>

        {/* Search */}
        <Button
          variant="outline"
          className="hidden h-10 w-72 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-[0.9375rem]">Hledat... (Cmd+K)</span>
        </Button>

        <div className="flex-1" />

        <NotificationBell uid={user.uid} />

        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          title="Obnovit data"
          aria-label="Obnovit data"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>

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
                {user.role === "admin" ? "Administrátor" : "Uživatel"}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Můj profil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                // Zabraň zavření menu, ať je spinner vidět během odhlašování
                e.preventDefault();
                if (!loggingOut) handleLogout();
              }}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              {loggingOut ? "Odhlašuji..." : "Odhlásit se"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
