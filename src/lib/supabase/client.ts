import { createBrowserClient } from "@supabase/ssr";
import { SCHEMA } from "./config";

export function supabaseNavegador() {
  // Sem tipos gerados do banco; o genérico só serve para apontar o schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any, typeof SCHEMA>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: SCHEMA } },
  );
}
