import { toast } from "sonner";

/**
 * Toast s akcí „Vrátit zpět": náhrada za potvrzovací modál u měkkého mazání /
 * archivace. Akce se provede rovnou (optimisticky) a uživatel ji může vzít zpět
 * z toastu. Bez modálového okna.
 */
export function toastWithUndo(opts: {
  message: string;
  undo: () => void | Promise<void>;
  undoLabel?: string;
  duration?: number;
}) {
  toast.success(opts.message, {
    duration: opts.duration ?? 8000,
    action: {
      label: opts.undoLabel ?? "Vrátit zpět",
      onClick: () => {
        void opts.undo();
      },
    },
  });
}

/**
 * Odložené trvalé smazání s možností vrátit: položka hned zmizí z UI, smazání
 * na serveru (`commit`) proběhne až po zavření toastu. „Vrátit zpět" ho zruší
 * a zavolá `onUndo` (vrácení položky do UI). Pro kolekce bez archivu.
 */
export function deferredDelete(opts: {
  message: string;
  commit: () => Promise<void>;
  onUndo: () => void;
  duration?: number;
}) {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    void opts.commit();
  };
  toast.success(opts.message, {
    duration: opts.duration ?? 6000,
    onAutoClose: finish,
    onDismiss: finish,
    action: {
      label: "Vrátit zpět",
      onClick: () => {
        if (settled) return;
        settled = true;
        opts.onUndo();
      },
    },
  });
}
