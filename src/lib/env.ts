import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida." }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ message: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente." })
    .min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY inválida."),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Somente variáveis públicas (URL e chave publicável). A chave secreta do
 * Supabase não é usada pela aplicação e nunca deve ter prefixo NEXT_PUBLIC_.
 */
export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Configuração do Supabase incompleta: ${parsed.error.issues.map((i) => i.message).join(" ")} ` +
        "Copie .env.example para .env.local e preencha os valores.",
    );
  }
  return parsed.data;
}
