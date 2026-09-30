"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { useRefresh } from "@/components/refresh-context";
import type { SubmissionView } from "@/lib/submission-view-model";

interface Submission extends SubmissionView {
  id: string;
  clientId?: string;
  clientName?: string;
  createdAt: string | null;
  processedAt: string | null;
  processedBy?: string;
}

const TAB_STORAGE_KEY = "submissions:tab";

export function SubmissionsPageClient() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "processed">("new");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) setSubmissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Záložka přežije návrat z detailu.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "new" || saved === "processed") setTab(saved);
    } catch {
      // ignore
    }
  }, []);

  function changeTab(next: "new" | "processed") {
    setTab(next);
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  useRefresh(fetchData);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Podklady</h1>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const newSubmissions = submissions.filter((s) => !s.processedAt);
  const processedSubmissions = submissions.filter((s) => s.processedAt);
  const rows = tab === "new" ? newSubmissions : processedSubmissions;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Podklady</h1>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as "new" | "processed")}>
        <TabsList>
          <TabsTrigger value="new">
            Nové
            {newSubmissions.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {newSubmissions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">
            Zpracované
            {processedSubmissions.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {processedSubmissions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mobil: karty */}
      <EntityCardList>
        {rows.length === 0 ? (
          <EntityCardEmpty>
            {tab === "new" ? "Žádné nové podklady" : "Žádné zpracované podklady"}
          </EntityCardEmpty>
        ) : (
          rows.map((s) => (
            <EntityCard
              key={s.id}
              href={`/submissions/${s.id}`}
              title={s.fullName}
              subtitle={s.email}
              meta={
                <>
                  {s.clientName && <span>{s.clientName}</span>}
                  {s.createdAt && (
                    <span>
                      {new Date(s.createdAt).toLocaleDateString("cs-CZ")}
                    </span>
                  )}
                </>
              }
            />
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Odesláno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {tab === "new" ? "Žádné nové podklady" : "Žádné zpracované podklady"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id} href={`/submissions/${s.id}`}>
                  <TableCell className="font-medium">
                    <Link href={`/submissions/${s.id}`} className="hover:underline">
                      {s.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>
                    {s.clientName ? (
                      <Link href={`/clients/${s.clientId}`} className="hover:underline">
                        {s.clientName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString("cs-CZ")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
