import {
  LayoutDashboard,
  CalendarDays,
  History,
  Users,
  BookUser,
  Receipt,
  CreditCard,
  SquareKanban,
  ClipboardList,
  Mails,
  Settings,
  Globe,
  Wallet,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";

/** Menu aplikace: zdroj pro postranní menu i drobečky na seznamech (sekce › stránka). */
export type UserRole = "admin" | "member" | "sales";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "Přehled",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Kalendář", href: "/calendar", icon: CalendarDays, roles: ["admin", "member"] },
      { label: "Aktivita", href: "/activity", icon: History },
    ],
  },
  {
    title: "Obchod",
    items: [
      { label: "Oslovení", href: "/prospects", icon: BookUser },
      {
        label: "Email marketing",
        href: "/email-marketing",
        icon: Mails,
        roles: ["admin", "member"],
      },
      { label: "Klienti", href: "/clients", icon: Users },
      { label: "Moje vizitky", href: "/my-cards", icon: CreditCard, roles: ["sales"] },
      { label: "Podklady", href: "/submissions", icon: ClipboardList },
      { label: "Zpětná vazba z webu", href: "/web-feedback", icon: MessageSquareText, roles: ["admin", "member"] },
    ],
  },
  {
    title: "Provoz",
    items: [
      { label: "Backlog", href: "/backlog", icon: SquareKanban },
      { label: "Domény", href: "/domains", icon: Globe, roles: ["admin", "member"] },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Fakturace",
        href: "/invoices",
        icon: Receipt,
        roles: ["admin", "member"],
      },
      { label: "Náklady", href: "/costs", icon: Wallet, roles: ["admin", "member"] },
    ],
  },
  {
    items: [
      {
        label: "Nastavení",
        href: "/settings",
        icon: Settings,
        roles: ["admin", "member"],
      },
    ],
  },
];

/** Položka menu a její sekce pro danou cestu (nejdelší shoda, Dashboard jen přesně `/`). */
export function navMatch(pathname: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of navGroups) {
    for (const item of group.items) {
      const hit = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
      if (hit && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}
