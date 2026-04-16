import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { z } from 'npm:zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BodySchema = z.object({
  testId: z.string().uuid(),
});

type ApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;
};

const respond = (payload: ApiResponse) => new Response(JSON.stringify(payload), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respond({ ok: false, error: 'Missing authorization header.' });
    }

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return respond({ ok: false, error: 'Invalid test request.' });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return respond({ ok: false, error: 'Backend configuration is incomplete.' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return respond({ ok: false, error: 'Invalid user session.' });
    }

    const userId = authData.user.id;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    const { testId } = parsedBody.data;

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, created_by, test_type')
      .eq('id', testId)
      .maybeSingle();

    if (testError) {
      return respond({ ok: false, error: testError.message });
    }

    if (!test) {
      return respond({ ok: false, error: 'Test not found.' });
    }

    const canDeleteOwnCustomTest = test.created_by === userId && test.test_type === 'user_custom';
    if (!isAdmin && !canDeleteOwnCustomTest) {
      return respond({ ok: false, error: 'You are not allowed to delete this test.' });
    }

    const { data: attempts, error: attemptsError } = await supabase
      .from('test_attempts')
      .select('id')
      .eq('test_id', testId);

    if (attemptsError) {
      return respond({ ok: false, error: attemptsError.message });
    }

    const attemptIds = (attempts || []).map((attempt) => attempt.id);
    if (attemptIds.length > 0) {
      const { error: responsesError } = await supabase.from('test_responses').delete().in('attempt_id', attemptIds);
      if (responsesError) {
        return respond({ ok: false, error: responsesError.message });
      }
    }

    const { error: deleteAttemptsError } = await supabase.from('test_attempts').delete().eq('test_id', testId);
    if (deleteAttemptsError) {
      return respond({ ok: false, error: deleteAttemptsError.message });
    }

    const { error: deleteQuestionsError } = await supabase.from('test_questions').delete().eq('test_id', testId);
    if (deleteQuestionsError) {
      return respond({ ok: false, error: deleteQuestionsError.message });
    }

    const { error: deleteTestError } = await supabase.from('tests').delete().eq('id', testId);
    if (deleteTestError) {
      return respond({ ok: false, error: deleteTestError.message });
    }

    return respond({ ok: true, message: 'Test deleted successfully.' });
  } catch (error) {
    console.error('delete-test error:', error);
    return respond({ ok: false, error: error instanceof Error ? error.message : 'Unknown error.' });
  }
});
