"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";

type FieldKey = "name" | "company" | "email" | "phone" | "city" | "portalUrl" | "demoUrl" | "skip";

const fieldLabels: Record<FieldKey, string> = {
  name: "Jméno",
  company: "Firma",
  email: "E-mail",
  phone: "Telefon",
  city: "Město",
  portalUrl: "URL profilu",
  demoUrl: "Demo vizitka",
  skip: "— Přeskočit —",
};

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === "," || ch === ";") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<FieldKey[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping([]);
    setResult(null);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error("CSV musí mít alespoň hlavičku a jeden řádek");
        return;
      }

      const csvHeaders = parsed[0];
      const csvRows = parsed.slice(1);

      setHeaders(csvHeaders);
      setRows(csvRows);

      // Auto-map by header name
      const autoMap = csvHeaders.map((h): FieldKey => {
        const lower = h.toLowerCase().trim();
        if (lower.includes("jmén") || lower.includes("name") || lower === "jmeno") return "name";
        if (lower.includes("firm") || lower.includes("company") || lower.includes("společ")) return "company";
        if (lower.includes("mail") || lower.includes("email") || lower.includes("e-mail")) return "email";
        if (lower.includes("tel") || lower.includes("phone") || lower.includes("mobil")) return "phone";
        if (lower.includes("měst") || lower.includes("city") || lower === "mesto") return "city";
        if (lower.includes("demo")) return "demoUrl";
        if (lower.includes("url") || lower.includes("profil") || lower.includes("link") || lower.includes("web")) return "portalUrl";
        return "skip";
      });

      setMapping(autoMap);
      setStep("mapping");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    // Validate: name must be mapped
    if (!mapping.includes("name")) {
      toast.error("Mapování musí obsahovat sloupec Jméno");
      return;
    }

    setImporting(true);
    setStep("importing");

    const importRows = rows.map((row) => {
      const obj: Record<string, string> = {};
      mapping.forEach((field, i) => {
        if (field !== "skip" && row[i]) {
          obj[field] = row[i];
        }
      });
      return obj;
    }).filter((r) => r.name);

    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult({ imported: data.imported, skipped: data.skipped });
      toast.success(`Import dokončen: ${data.imported} nových, ${data.skipped} přeskočeno`);
    } catch {
      toast.error("Import selhal");
      setStep("mapping");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Import kontaktů</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nahrajte CSV soubor s kontakty k oslovení. Soubor by měl mít hlavičku na prvním řádku.
              Podporovaný oddělovač: čárka nebo středník.
            </p>
            <Label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Klikněte pro výběr CSV souboru</span>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </Label>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            {/* Column mapping */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Mapování sloupců</p>
              <div className="grid grid-cols-2 gap-2">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[100px] truncate" title={header}>
                      {header}
                    </span>
                    <Select
                      value={mapping[i]}
                      onValueChange={(val) => {
                        if (!val) return;
                        const next = [...mapping];
                        next[i] = val as FieldKey;
                        setMapping(next);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(fieldLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Náhled prvních {Math.min(10, rows.length)} z {rows.length} řádků
              </p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {mapping[i] !== "skip" ? fieldLabels[mapping[i]] : <span className="text-muted-foreground line-through">{h}</span>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 10).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell
                            key={ci}
                            className={`text-xs whitespace-nowrap ${mapping[ci] === "skip" ? "text-muted-foreground" : ""}`}
                          >
                            {cell || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Zpět</Button>
              <Button
                onClick={handleImport}
                disabled={!mapping.includes("name")}
                className="flex-1"
              >
                Importovat {rows.length} řádků
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 text-center py-8">
            {importing ? (
              <>
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">Importuji...</p>
              </>
            ) : result ? (
              <>
                <p className="text-lg font-semibold">Import dokončen</p>
                <p className="text-sm text-muted-foreground">
                  Naimportováno: <span className="font-medium text-foreground">{result.imported}</span>
                  {" · "}
                  Přeskočeno (duplicity): <span className="font-medium text-foreground">{result.skipped}</span>
                </p>
                <Button onClick={() => { reset(); onSuccess(); }}>Zavřít</Button>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
