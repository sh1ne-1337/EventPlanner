import { Skeleton } from "@/components/ui/skeleton";

export function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:justify-between" aria-hidden="true">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-8 w-48" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 42 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {Array.from({ length: 3 }, (_, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <CalendarSkeleton />
    </div>
  );
}
