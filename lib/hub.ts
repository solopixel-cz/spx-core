import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * Klientská zóna (spx-hub) — samostatná aplikace nad stejným Firebase.
 * Klientský účet = Auth uživatel s claims `{ role: 'client', clientId }`.
 */

export class HubInviteError extends Error {}

function hubUrl(): string {
  const url = process.env.HUB_URL;
  if (!url) throw new HubInviteError("Chybí HUB_URL (adresa klientské zóny)");
  return url.replace(/\/+$/, "");
}

/** Přihlašovací stránka hubu s předvyplněným e-mailem. */
export function hubLoginUrl(email: string): string {
  return `${hubUrl()}/login?email=${encodeURIComponent(email)}`;
}

/**
 * Zajistí klientský účet pro e-mail a navázání na klienta. Existující účet
 * znovu použije — ale nikdy nepřepíše účet z týmu ani klientský účet
 * navázaný na jiného klienta. Vrací UID.
 */
export async function grantHubAccess(email: string, clientId: string): Promise<string> {
  const auth = getAdminAuth();
  const existing = await auth.getUserByEmail(email).catch(() => null);

  if (existing) {
    const claims = existing.customClaims ?? {};
    if (claims.role && claims.role !== "client") {
      throw new HubInviteError("E-mail patří účtu z týmu — klienta pozvěte na jiný e-mail");
    }
    if (claims.role === "client" && claims.clientId !== clientId) {
      throw new HubInviteError("E-mail už má přístup do klientské zóny u jiného klienta");
    }
    if (existing.disabled) {
      await auth.updateUser(existing.uid, { disabled: false });
    }
  }

  const user = existing ?? (await auth.createUser({ email }));
  await auth.setCustomUserClaims(user.uid, { role: "client", clientId });
  return user.uid;
}

/** Poslední přihlášení klienta do hubu (ISO), nebo null — i když účet zmizel. */
export async function getHubLastSignIn(uid: string | undefined): Promise<string | null> {
  if (!uid) return null;
  const user = await getAdminAuth().getUser(uid).catch(() => null);
  const last = user?.metadata.lastSignInTime;
  return last ? new Date(last).toISOString() : null;
}
