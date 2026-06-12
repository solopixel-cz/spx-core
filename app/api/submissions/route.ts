import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();

    const [submissionsSnap, tokensSnap, clientsSnap] = await Promise.all([
      db.collection("card-submissions").orderBy("createdAt", "desc").get(),
      db.collection("card-tokens").get(),
      db.collection("clients").get(),
    ]);

    // Build lookup maps
    const tokenMap: Record<string, { clientId?: string; email?: string }> = {};
    tokensSnap.docs.forEach((doc) => {
      tokenMap[doc.id] = {
        clientId: doc.data().clientId,
        email: doc.data().email,
      };
    });

    const clientMap: Record<string, string> = {};
    const clientByEmail: Record<string, { id: string; name: string }> = {};
    clientsSnap.docs.forEach((doc) => {
      clientMap[doc.id] = doc.data().name;
      const email = doc.data().email as string;
      if (email) clientByEmail[email.toLowerCase()] = { id: doc.id, name: doc.data().name };
    });

    const submissions = submissionsSnap.docs.map((doc) => {
      const data = doc.data();
      const tokenData = tokenMap[doc.id];
      let clientId = tokenData?.clientId;
      let clientName = clientId ? clientMap[clientId] : undefined;

      // Fallback: match by email
      if (!clientId && data.email) {
        const match = clientByEmail[(data.email as string).toLowerCase()];
        if (match) {
          clientId = match.id;
          clientName = match.name;
        }
      }

      return {
        id: doc.id,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        companyId: data.companyId,
        officeAddress: data.officeAddress,
        specialization: data.specialization,
        city: data.city,
        primaryLanguage: data.primaryLanguage,
        availableLanguages: data.availableLanguages ?? [],
        customDomain: data.customDomain,
        reasons: data.reasons ?? [],
        cnbExams: data.cnbExams ?? [],
        bio: data.bio,
        yearsOfExperience: data.yearsOfExperience,
        clientCount: data.clientCount,
        focusAreas: data.focusAreas ?? [],
        clientTypes: data.clientTypes ?? [],
        profileImageUrl: data.profileImageUrl,
        clientId,
        clientName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        processedAt: data.processedAt?.toDate?.()?.toISOString() ?? null,
        processedBy: data.processedBy,
      };
    });

    return NextResponse.json(submissions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
