import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";
import { PushToggle } from "@/components/notifications/push-toggle";
import { NotificationPrefsForm } from "@/components/notifications/notification-prefs-form";

export default async function NotifikacePage() {
  const user = await requireAuth();
  const team = user.role === "admin" || user.role === "member";
  const me = team ? (await getAdminFirestore().collection("users").doc(user.uid).get()).data() ?? {} : {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        backHref="/profile"
        items={[{ label: "Můj profil", href: "/profile" }, { label: "Notifikace" }]}
      />
      <div className="flex items-start gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notifikace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upozornění na nové poptávky z webu, vyplněné podklady a další události.
            Uvnitř aplikace je vždycky uvidíš u zvonku nahoře.
          </p>
        </div>
      </div>

      {team && (
        <Card>
          <CardHeader>
            <CardTitle>Co mi má chodit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Zaškrtnuté druhy dostaneš do zvonečku a jako push na zařízení, kde máš push zapnutý.
              Platí jen pro tebe, ostatní v týmu si to nastaví sami.
            </p>
            <NotificationPrefsForm
              prefs={(me.notificationPrefs as Record<string, boolean>) ?? {}}
              digestEmail={me.calendarDigestEmail !== false}
              email={user.email ?? undefined}
            />
            <p className="text-xs text-muted-foreground">
              Odběr do Google Kalendáře najdeš v{" "}
              <Link href="/calendar" className="font-medium text-primary underline-offset-4 hover:underline">
                Kalendáři
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Push na tomto zařízení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Zapni push, ať ti upozornění chodí, i když nemáš CRM otevřené, na
            počítači i na telefonu.
          </p>
          <PushToggle />
          <p className="text-xs text-muted-foreground">
            Na iPhonu je potřeba mít CRM přidané na plochu (Sdílet → Přidat na
            plochu) a otevřít ho odtud, jinak iOS push nedovolí. Nastavení platí
            pro každé zařízení zvlášť.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
