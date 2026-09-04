import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, error: 'Missing authorization header.' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await asUser.auth.getUser();
    if (userErr || !userData?.user) return json({ ok: false, error: 'Not authenticated.' });

    const userId = userData.user.id;
    const admin = createClient(url, serviceKey);

    // Wipe app data first (attempts/responses cascade through FKs).
    const { data: attempts } = await admin.from('test_attempts').select('id').eq('user_id', userId);
    if (attempts?.length) {
      await admin.from('test_responses').delete().in('attempt_id', attempts.map((a) => a.id));
    }
    await admin.from('test_attempts').delete().eq('user_id', userId);
    await admin.from('chat_messages').delete().eq('user_id', userId);
    await admin.from('study_streaks').delete().eq('user_id', userId);
    await admin.from('saved_notes').delete().eq('user_id', userId);
    await admin.from('pdf_conversions').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('user_id', userId);
    await admin.from('user_roles').delete().eq('user_id', userId);

    // Custom tests created by the user
    const { data: ownTests } = await admin.from('tests').select('id').eq('created_by', userId);
    if (ownTests?.length) {
      const ids = ownTests.map((t) => t.id);
      await admin.from('test_questions').delete().in('test_id', ids);
      await admin.from('tests').delete().in('id', ids);
    }

    // Finally remove the auth account so the email can no longer sign in.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ ok: false, error: delErr.message });

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
  }
});
