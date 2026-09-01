import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * JEDNORÁZOVÁ migrace rolí na model admin/user.
 *  - `admin` → admin (beze změny)
 *  - `member` / `sales` / cokoli jiného → `user`
 * Přepíše custom claims i pole `role` v `users`, a změněným uživatelům
 * revoknuje refresh tokeny (donutí je k novému přihlášení, aby se projevila
 * nová role v session cookie).
 *
 * Spustit jednou jako admin: POST /api/admin/migrate-roles
 * Po úspěšném doběhnutí tento soubor smaž.
 */
export async function POST() {
  try {
    await requireRole("admin");
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    const changed: { uid: string; email?: string; from: unknown; to: string }[] = [];
    let nextPageToken: string | undefined;

    do {
      const page = await auth.listUsers(1000, nextPageToken);
      for (const u of page.users) {
        const current = u.customClaims?.role;
        const target = current === "admin" ? "admin" : "user";
        if (current === target) continue;

        // 1) custom claims
        await auth.setCustomUserClaims(u.uid, {
          ...(u.customClaims ?? {}),
          role: target,
        });
        // 2) user dokument
        await db
          .collection("users")
          .doc(u.uid)
          .set({ role: target }, { merge: true })
          .catch(() => {});
        // 3) revokovat refresh tokeny → nové přihlášení načte novou roli
        await auth.revokeRefreshTokens(u.uid);

        changed.push({ uid: u.uid, email: u.email, from: current ?? null, to: target });
      }
      nextPageToken = page.pageToken;
    } while (nextPageToken);

    return NextResponse.json({ status: "ok", changedCount: changed.length, changed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
