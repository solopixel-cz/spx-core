import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushToggle } from "@/components/notifications/push-toggle";

export default async function NotifikacePage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Notifikace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upozornění na nové poptávky z webu, vyplněné podklady a další události.
          Uvnitř aplikace je vždycky uvidíš u zvonku nahoře.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Push na tomto zařízení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Zapni push, ať ti upozornění chodí i když nemáš CRM otevřené — na
            počítači i na telefonu.
          </p>
          <PushToggle />
          <p className="text-xs text-muted-foreground">
            Na iPhonu je potřeba mít CRM přidané na plochu (Sdílet → Přidat na
            plochu) a otevřít ho odtud — jinak iOS push nedovolí. Nastavení platí
            pro každé zařízení zvlášť.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
