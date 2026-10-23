import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NoPermission({ message }: { message?: string }) {
  return (
    <Alert variant="warning">
      <ShieldAlert />
      <AlertTitle>Acesso restrito</AlertTitle>
      <AlertDescription>
        {message ?? "Esta operação é permitida apenas para gestores e administradores."}
      </AlertDescription>
    </Alert>
  );
}
