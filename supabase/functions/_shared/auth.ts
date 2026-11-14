// Shared caller-authentication helper for Supabase Edge Functions.
//
// Edge Functions are reachable by anyone holding the project's publishable
// (anon) key, because that key is itself a valid JWT. Verifying only that a
// bearer token exists is therefore not authentication: the token must belong
// to a real signed-in user. Every function that spends AI credits or writes
// with the service-role key must call requireUser() first.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export type AuthOutcome =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireUser(req: Request): Promise<AuthOutcome> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Please sign in to use this feature." };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: "Backend configuration is incomplete." };
  }

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await asUser.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Your session has expired. Please sign in again." };
  }
  return { ok: true, userId: data.user.id };
}
