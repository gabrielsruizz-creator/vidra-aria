import { LogOut } from "lucide-react";

import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type CurrentUser } from "@/server/auth";

export function UserMenu({ user }: { user: CurrentUser }) {
  const initials = (user.fullName || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm leading-tight font-medium">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      </div>
      <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
        {initials}
      </span>
      <form action={signOut}>
        <Button variant="ghost" size="icon" type="submit" aria-label="Sair" title="Sair">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
