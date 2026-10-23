import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Busca via GET (funciona sem JavaScript e mantém a URL compartilhável). */
export function SearchBar({
  q,
  placeholder = "Buscar…",
  children,
}: {
  q?: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <form method="get" className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center" role="search">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-9" aria-label="Buscar" />
      </div>
      {children}
      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
    </form>
  );
}
