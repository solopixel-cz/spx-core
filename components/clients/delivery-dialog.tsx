"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";
import { renderDeliveryEmail } from "@/lib/email-templates/delivery";

interface InstanceData {
  id: string;
  domain: string;
  status: string;
}

interface DeliveryEmailData {
  id: string;
  sentAt: string | null;
  status: string;
}

interface DeliveryDialogProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  instances: InstanceData[];
  lastDelivery?: DeliveryEmailData | null;
  trigger: React.ReactElement;
}

export function DeliveryDialog({
  clientId,
  clientName,
  clientEmail,
  instances,
  lastDelivery,
  trigger,
}: DeliveryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(clientName.split(" ")[0]);
  const [selectedInstanceId, setSelectedInstanceId] = useState(
    instances.length === 1 ? instances[0].id : ""
  );
  const [setInstanceLive, setSetInstanceLive] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(!lastDelivery);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId);
  const odkaz = selectedInstance ? `https://${selectedInstance.domain}` : "";
  const showLiveCheckbox = selectedInstance?.status === "setup";

  async function handleSend() {
    if (!confirmed && lastDelivery) {
      setConfirmed(true);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_card",
          greeting: greeting.trim(),
          instanceId: selectedInstanceId || undefined,
          setInstanceLive: showLiveCheckbox ? setInstanceLive : false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Nepodařilo se odeslat");
        return;
      }

      toast.success("Vizitka předána klientovi");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se odeslat e-mail");
    } finally {
      setSending(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setGreeting(clientName.split(" ")[0]);
      setSelectedInstanceId(instances.length === 1 ? instances[0].id : "");
      setSetInstanceLive(true);
      setConfirmed(!lastDelivery);
      setSending(false);
    }
    setOpen(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Předat vizitku klientovi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {lastDelivery && !confirmed && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Vizitka už byla předána
                {lastDelivery.sentAt
                  ? ` ${new Date(lastDelivery.sentAt).toLocaleDateString("cs-CZ")}`
                  : ""}
                .
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                Opravdu chcete poslat znovu?
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Oslovení (5. pád)</Label>
            <Input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Např. Jane, Honzo..."
            />
            <p className="text-xs text-muted-foreground">
              Upravte oslovení — v šabloně nahradí <code>{"{{jmeno}}"}</code>
            </p>
          </div>

          {instances.length > 1 && (
            <div className="space-y-2">
              <Label>Instance (vizitka)</Label>
              <Select
                value={selectedInstanceId}
                onValueChange={(val) => setSelectedInstanceId(val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte vizitku" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedInstance && (
            <div className="space-y-2">
              <Label>Odkaz na vizitku</Label>
              <Input value={odkaz} disabled className="text-muted-foreground" />
            </div>
          )}

          {showLiveCheckbox && (
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={setInstanceLive}
                onCheckedChange={(v) => setSetInstanceLive(v)}
              />
              <span className="text-sm font-normal">
                Označit vizitku jako &quot;live&quot;
              </span>
            </label>
          )}

          <Separator />

          {selectedInstance && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Náhled e-mailu</p>
                <div className="rounded border overflow-hidden bg-[#F1F5F9]">
                  <iframe
                    srcDoc={
                      renderDeliveryEmail({
                        jmeno: greeting || clientName.split(" ")[0],
                        odkaz,
                      }).html
                    }
                    sandbox=""
                    className="w-full border-0"
                    style={{ height: "400px" }}
                    title="Náhled e-mailu"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  Příjemce: <span className="font-medium">{clientEmail}</span>
                </p>
              </div>
            </>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !greeting.trim() || !selectedInstanceId}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending
              ? "Odesílám..."
              : !confirmed && lastDelivery
                ? "Ano, poslat znovu"
                : "Předat vizitku"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
