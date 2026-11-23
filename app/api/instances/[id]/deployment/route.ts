import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activity";
import { cardDeploymentSchema } from "@/lib/schemas/instance";
import { syncCardsConfig, syncProjectDomains } from "@/lib/card-deploy";
import { CARD_FALLBACK_HOST, normalizeHost } from "@/lib/card-hosts";
import { getDomainConfig, getProjectDomain, vercelConfigured } from "@/lib/vercel";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

async function loadCard(id: string) {
  const db = getAdminFirestore();
  const ref = db.collection("instances").doc(id);
  const doc = await ref.get();
  const d = doc.data();
  if (!d || d.deletedAt) return { db, ref, error: "Instance nenalezena", status: 404 } as const;
  if ((d.type ?? "card") !== "card" || !d.advisorSlug) {
    return { db, ref, error: "Nasazení má jen vizitka se slugem", status: 400 } as const;
  }
  return { db, ref, data: d } as const;
}

// GET /api/instances/[id]/deployment — stav adres ve Vercelu (ověření, DNS)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const card = await loadCard(id);
    if ("error" in card) return NextResponse.json({ error: card.error }, { status: card.status });
    if (!vercelConfigured()) return NextResponse.json({ configured: false, hosts: [] });

    const hostnames = (card.data.hostnames as string[] | undefined) ?? [];
    const hosts = await Promise.all(
      hostnames.map(async (name) => {
        try {
          const [domain, config] = await Promise.all([getProjectDomain(name), getDomainConfig(name)]);
          const apex = name.split(".").length === 2;
          return {
            name,
            inProject: !!domain,
            verified: domain?.verified ?? false,
            verification: domain?.verification ?? [],
            redirect: domain?.redirect ?? null,
            misconfigured: config.misconfigured,
            configuredBy: config.configuredBy,
            // Doporučený záznam: apex A na IP, subdoména CNAME
            record: apex
              ? { type: "A", value: config.recommendedIPv4.find((r) => r.rank === 1)?.value[0] ?? null }
              : { type: "CNAME", value: config.recommendedCNAME.find((r) => r.rank === 1)?.value ?? null },
          };
        } catch (e) {
          return { name, error: e instanceof Error ? e.message : "Chyba Vercelu" };
        }
      })
    );
    return NextResponse.json({ configured: true, hosts });
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/instances/[id]/deployment — uloží adresy a nastavení, propíše do Vercelu
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;
    const body = cardDeploymentSchema.parse(await request.json());
    const card = await loadCard(id);
    if ("error" in card) return NextResponse.json({ error: card.error }, { status: card.status });
    const { db, ref, data } = card;

    const hostnames: string[] = [];
    for (const raw of body.hostnames) {
      const host = normalizeHost(raw);
      if (!host) return NextResponse.json({ error: `Neplatná adresa „${raw}"` }, { status: 400 });
      if (host === CARD_FALLBACK_HOST) {
        return NextResponse.json({ error: `${CARD_FALLBACK_HOST} je záložní adresa, nepřidává se` }, { status: 400 });
      }
      if (!hostnames.includes(host)) hostnames.push(host);
    }

    // Jedna adresa = jedna vizitka
    if (hostnames.length > 0) {
      const clash = await db.collection("instances").where("hostnames", "array-contains-any", hostnames).get();
      const other = clash.docs.find((d) => d.id !== id && !d.data().deletedAt);
      if (other) {
        const taken = (other.data().hostnames as string[]).filter((h) => hostnames.includes(h));
        return NextResponse.json(
          { error: `Adresu ${taken.join(", ")} už má vizitka ${other.data().advisorSlug ?? other.id}` },
          { status: 409 }
        );
      }
    }

    const primaryHost =
      body.primaryHost && hostnames.includes(normalizeHost(body.primaryHost) ?? "")
        ? normalizeHost(body.primaryHost)
        : hostnames.find((h) => !h.startsWith("www.")) ?? hostnames[0] ?? null;

    const frameAncestors = [...new Set(body.frameAncestors.map((u) => new URL(u).origin))];

    await ref.update({
      hostnames,
      primaryHost,
      leadEmail: body.leadEmail || null,
      ga4MeasurementId: body.ga4MeasurementId || null,
      googleSiteVerification: body.googleSiteVerification || null,
      frameAncestors,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const before = (data.hostnames as string[] | undefined) ?? [];
    const warnings = await syncProjectDomains(before, hostnames, primaryHost);
    try {
      await syncCardsConfig(db);
    } catch (e) {
      warnings.push(`Mapa vizitek: ${e instanceof Error ? e.message : "chyba Vercelu"}`);
    }

    await logActivity({
      entityType: "client",
      entityId: data.clientId as string,
      kind: "system",
      text: `Nasazení vizitky „${data.advisorSlug}": ${hostnames.length ? hostnames.join(", ") : "jen záložní adresa"}`,
      actorUid: user.uid,
    });
    revalidatePath(`/clients/${data.clientId}`);

    return NextResponse.json({ status: "ok", warnings, vercel: vercelConfigured() });
  } catch (error) {
    return errorResponse(error);
  }
}
