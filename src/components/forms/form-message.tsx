import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormMessage({ state }: { state: { ok: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.ok ? "success" : "destructive"}>
      {state.ok ? <CheckCircle2 /> : <AlertCircle />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
