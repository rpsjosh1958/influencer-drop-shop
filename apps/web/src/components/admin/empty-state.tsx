import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Canonical empty-state block (icon + heading + optional description) for admin list pages. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  /** Optional action (e.g. a "create new" button) rendered below the copy. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("text-center py-16 px-6", className)}>
      <Icon className="mx-auto text-zinc-300 mb-4" size={40} />
      <h3 className="font-bold text-zinc-500">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
