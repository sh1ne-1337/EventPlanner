import { CalendarDaysIcon } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <CalendarDaysIcon className="size-4" />
      </span>
      <span>Planner</span>
    </Link>
  );
}
