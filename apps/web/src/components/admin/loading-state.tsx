import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Canonical full-page/section loading spinner for admin pages. */
export function LoadingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[60vh]",
        className,
      )}
    >
      <Loader2 className="animate-spin text-zinc-400" size={32} />
    </div>
  );
}
