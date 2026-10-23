import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth";

export default async function PendingAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.active) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center bg-sidebar px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso aguardando liberação</CardTitle>
          <CardDescription>
            Sua conta ({user.email}) foi criada, mas ainda não foi ativada. Peça a um administrador para liberar o
            acesso em Configurações › Usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button variant="outline" type="submit">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
