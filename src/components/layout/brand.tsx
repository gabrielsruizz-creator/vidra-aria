import Link from "next/link";

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-6">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        VA
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-sidebar-foreground">Vidra Aria</span>
        <span className="text-[11px] text-sidebar-muted">Custos e orçamentos</span>
      </span>
    </Link>
  );
}
