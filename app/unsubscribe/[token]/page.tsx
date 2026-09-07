import { getAdminFirestore } from "@/lib/firebase/admin";
import { UnsubscribeClient } from "@/components/unsubscribe-client";

export const metadata = { title: "Odhlášení z odběru" };

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getAdminFirestore();

  const snap = await db
    .collection("campaignEmails")
    .where("unsubToken", "==", token)
    .limit(1)
    .get();

  let email: string | null = null;
  let alreadyUnsubscribed = false;

  if (!snap.empty) {
    email = ((snap.docs[0].data().toEmail as string) ?? "").trim() || null;
    if (email) {
      const unsubDoc = await db
        .collection("marketingUnsubscribes")
        .doc(email.toLowerCase())
        .get();
      alreadyUnsubscribed = unsubDoc.exists;
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {!email ? (
          <>
            <h1 className="text-xl font-bold">Neplatný odkaz</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tento odhlašovací odkaz je neplatný nebo už není aktivní.
            </p>
          </>
        ) : (
          <UnsubscribeClient
            token={token}
            email={email}
            alreadyUnsubscribed={alreadyUnsubscribed}
          />
        )}
      </div>
    </div>
  );
}
