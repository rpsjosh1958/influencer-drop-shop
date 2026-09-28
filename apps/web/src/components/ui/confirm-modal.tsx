"use client";

import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // Red confirm button, for sign-out / delete style actions.
  destructive?: boolean;
  // Spinner on the confirm button; also blocks cancelling mid-action.
  loading?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => !loading && onCancel()}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          {icon && (
            <div
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center mb-4",
                destructive
                  ? "bg-red-50 text-red-500 dark:bg-red-900/20"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              {icon}
            </div>
          )}
          <h2
            id="confirm-modal-title"
            className="text-lg font-bold text-zinc-900 dark:text-white"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70",
                destructive
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
              )}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
