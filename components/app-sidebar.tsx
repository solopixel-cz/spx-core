"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  CheckSquare,
  TicketCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leady", href: "/leady", icon: Briefcase },
  { label: "Klienti", href: "/klienti", icon: Users },
  { label: "Fakturace", href: "/fakturace", icon: Receipt },
  { label: "Úkoly", href: "/ukoly", icon: CheckSquare },
  { label: "Tickety", href: "/tickety", icon: TicketCheck },
  { label: "Nastavení", href: "/nastaveni", icon: Settings },
];

function NavLinks({ role }: { role: "admin" | "member" }) {
  const pathname = usePathname();

  return (
    <>
      {navItems
        .filter((item) => !item.adminOnly || role === "admin")
        .map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </>
  );
}

export function AppSidebar({ role }: { role: "admin" | "member" }) {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          SPX Core
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <NavLinks role={role} />
      </nav>
    </aside>
  );
}

export function MobileSidebar({ role }: { role: "admin" | "member" }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-3">
      {navItems
        .filter((item) => !item.adminOnly || role === "admin")
        .map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
