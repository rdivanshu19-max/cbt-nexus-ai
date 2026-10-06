import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), testId: z.string().uuid() }),
  z.object({ action: z.literal("redeem"), code: z.string().trim().min(3).max(64) }),
]);

// Blocks every outbound link/popup inside the embedded paper.
const GUARD = `<script>(function(){
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');
if(a){var h=a.getAttribute('href')||'';if(!h.startsWith('#')&&!h.startsWith('javascript')){e.preventDefault();e.stopPropagation();}}},true);
window.open=function(){return null;};
})();</script>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await asUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in." }, 401);
    const userId = u.user.id;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const body = parsed.data;

    if (body.action === "redeem") {
      const code = body.code.toUpperCase();
      const { data: rows } = await admin.from("series_promo_codes").select("series_id").eq("code", code);
      if (!rows?.length) return json({ ok: false, error: "That code isn't valid." });
      await admin.from("series_unlocks").upsert(rows.map((r) => ({ user_id: userId, series_id: r.series_id })), { onConflict: "user_id,series_id" });
      return json({ ok: true, seriesIds: rows.map((r) => r.series_id) });
    }

    const { data: test } = await admin.from("series_tests").select("id, series_id, lock_mode, unlock_at, title").eq("id", body.testId).single();
    if (!test) return json({ error: "Test not found" }, 404);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    let unlocked = test.lock_mode === "open" || !!isAdmin;
    if (!unlocked && test.lock_mode === "date" && test.unlock_at && new Date(test.unlock_at) <= new Date()) unlocked = true;
    if (!unlocked) {
      const { data: un } = await admin.from("series_unlocks").select("user_id").eq("user_id", userId).eq("series_id", test.series_id).maybeSingle();
      unlocked = !!un;
    }
    if (!unlocked) return json({ ok: false, locked: true, error: "This test is still locked." });

    const { data: src } = await admin.from("series_test_sources").select("storage_path, external_url").eq("test_id", test.id).maybeSingle();
    if (src?.storage_path) {
      const { data: file, error } = await admin.storage.from("series-tests").download(src.storage_path);
      if (error || !file) return json({ error: "Paper file missing" }, 500);
      let html = await file.text();
      html = html.includes("<head>") ? html.replace("<head>", `<head>${GUARD}`) : GUARD + html;
      return json({ ok: true, title: test.title, html });
    }
    if (src?.external_url) return json({ ok: true, title: test.title, url: src.external_url });
    return json({ error: "No paper attached yet" }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
