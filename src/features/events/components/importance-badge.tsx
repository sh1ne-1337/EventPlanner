import { cn } from "@/lib/utils";

import { IMPORTANCE_META, type Importance } from "../constants";

export function ImportanceDot({
  importance,
  className,
}: {
  importance: Importance;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        IMPORTANCE_META[importance].dotClassName,
        className,
      )}
    />
  );
}

export function ImportanceBadge({ importance }: { importance: Importance }) {
  const meta = IMPORTANCE_META[importance];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badgeClassName,
      )}
    >
      <ImportanceDot importance={importance} />
      {meta.label}
    </span>
  );
}
