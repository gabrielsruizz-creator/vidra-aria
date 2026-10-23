import Link from "next/link";

const LINKS = [
  { href: "/configuracoes", label: "Parâmetros gerais" },
  { href: "/configuracoes/mao-de-obra", label: "Mão de obra" },
  { href: "/configuracoes/custos-indiretos", label: "Custos indiretos" },
  { href: "/configuracoes/deducoes", label: "Tributos e comissões" },
  { href: "/configuracoes/usuarios", label: "Usuários" },
];

export default function SettingsLayout({ children }: LayoutProps<"/configuracoes">) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1 border-b pb-2 text-sm" aria-label="Seções de configuração">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
