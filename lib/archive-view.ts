import type { Firestore, Query } from "firebase-admin/firestore";

export type ArchiveSearchParams = Promise<{ archived?: string }>;

/** Zobrazit archiv? Jen admin/member — sales archiv nevidí (nemá ani archivaci). */
export async function isArchiveView(searchParams: ArchiveSearchParams, role: string) {
  const { archived } = await searchParams;
  return archived === "1" && role !== "sales";
}

/** Archivované dokumenty kolekce (mají `deletedAt`). Řazení až v paměti — bez složeného indexu. */
export function archivedQuery(db: Firestore, collection: string): Query {
  return db.collection(collection).where("deletedAt", "!=", null);
}

export function toIso(val: unknown): string | null {
  if (val && typeof val === "object" && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

/** Nejnověji archivované první. */
export function byDeletedAtDesc<T extends { deletedAt: string | null }>(a: T, b: T) {
  return (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "");
}
