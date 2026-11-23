"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PixelLogo } from "@/components/pixel-logo";
import { AppVersion } from "@/components/app-version";
import { navGroups, type NavItem, type UserRole } from "@/lib/nav";

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] transition-colors",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {navGroups.map((group, gi) => {
        const visibleItems = group.items.filter(
          (item) => !item.roles || item.roles.includes(role)
        );
        if (visibleItems.length === 0) return null;

        return (
          <div key={gi}>
            {group.title && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AppSidebar({ role }: { role: UserRole }) {
  return (
    <aside className="flex h-full w-[17rem] flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight"
        >
          <PixelLogo className="size-7 shrink-0" />
          SPX Core
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <SidebarNav role={role} />
      </nav>
      <div className="px-1 py-1">
        <AppVersion />
      </div>
    </aside>
  );
}

export function MobileSidebar({ role }: { role: UserRole }) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <nav className="flex-1 overflow-y-auto p-3">
        <SidebarNav role={role} />
      </nav>
      <div className="border-t px-1 py-1">
        <AppVersion />
      </div>
    </div>
  );
}
