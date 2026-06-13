import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  FileText,
  Archive,
  Percent,
  User,
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
    href: "/nastaveni/uzivatele",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Šablony",
    description: "Onboarding checklist, šablona oslovení, výchozí sazba provize",
    href: "/nastaveni/sablony",
    icon: FileText,
    roles: ["admin"],
  },
  {
    label: "Archiv",
    description: "Archivované záznamy — obnova a trvalé mazání",
    href: "/nastaveni/archiv",
    icon: Archive,
  },
  {
    label: "Provize",
    description: "Přehled a vyplácení provizí obchodníkům",
    href: "/provize",
    icon: Percent,
  },
  {
    label: "Můj profil",
    description: "Jméno, fotka, heslo a preference",
    href: "/profil",
    icon: User,
  },
];

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
