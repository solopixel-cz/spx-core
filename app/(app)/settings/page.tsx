import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Archive,
  Receipt,
  TicketPercent,
} from "lucide-react";

interface Tile {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<"admin" | "member">;
}

const tiles: Tile[] = [
  {
    label: "Uživatelé",
    description: "Správa členů týmu, rolí a přístupů",
    href: "/settings/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Fakturační údaje",
    description: "Údaje dodavatele na fakturách, účet a QR platba",
    href: "/settings/billing-details",
    icon: Receipt,
    roles: ["admin"],
  },
  {
    label: "Promo kódy",
    description: "Kódy pro formulář na webu, platnost a počet použití",
    href: "/settings/promo-codes",
    icon: TicketPercent,
    roles: ["admin"],
  },
  {
    label: "Archiv",
    description: "Archivované záznamy, obnova a trvalé mazání",
    href: "/settings/archive",
    icon: Archive,
  },
];

// Nastavení je pro celé CRM; osobní věci (profil, notifikace) jsou v menu pod avatarem.

export default async function NastaveniPage() {
  const user = await requireAuth();

  const visible = tiles.filter((t) => {
    if (!t.roles) return true;
    return t.roles.includes(user.role as "admin" | "member");
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visible.map((tile) => (
        <Link key={tile.href} href={tile.href}>
          <Card className="h-full hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="rounded-lg bg-muted p-2">
                <tile.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{tile.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tile.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
