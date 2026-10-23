import {
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Comercial",
    items: [
      { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
      { href: "/orcamentos", label: "Orçamentos", icon: FileText },
      { href: "/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Engenharia de custos",
    items: [
      { href: "/produtos", label: "Produtos e fichas", icon: Package },
      { href: "/materiais", label: "Materiais", icon: Boxes },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/precos", label: "Preços de fornecedores", icon: Tags },
    ],
  },
  {
    label: "Administração",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
