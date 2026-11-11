const projectUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const apiUrl = 'https://chrisco-bible-quizzes.vercel.app/api/evangelism-quiz';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS', 'cache-control': 'no-store' } });
async function api(action: string, idToken: string, extra: Record<string, unknown> = {}) {
  const response = await fetch(apiUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, idToken, ...extra }) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Could not verify quiz submission.');
  return data;
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405);
  try {
    const body = await req.json();
    const rest = (path: string, init: RequestInit = {}) => fetch(`${projectUrl}/rest/v1/${path}`, { ...init, headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json', ...init.headers } });
    if (body.action === 'leaderboard') {
      const r = await rest('evangelism_quiz_scores?select=nickname,score,total_questions,updated_at&order=score.desc,updated_at.asc&limit=50');
      if (!r.ok) throw new Error('Rankings are temporarily unavailable.');
      return json({ ok: true, rankings: await r.json() });
    }
    if (body.action !== 'submit' || typeof body.idToken !== 'string') return json({ ok: false, error: 'Invalid quiz submission.' }, 400);
    const nickname = String(body.nickname || '').trim().slice(0, 40);
    if (!nickname) return json({ ok: false, error: 'Choose a nickname before submitting.' }, 400);
    const identity = await api('auth', body.idToken);
    const result = await api('review', body.idToken, { answers: body.answers });
    const review = result.review as Array<{ selected: string; correctOption: string }>;
    const score = review.filter(item => item.selected === item.correctOption).length;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(identity.email).toLowerCase()));
    const playerHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const previousResponse = await rest(`evangelism_quiz_scores?select=score&player_hash=eq.${playerHash}&limit=1`);
    if (!previousResponse.ok) throw new Error('Could not load your saved ranking.');
    const previous = await previousResponse.json();
    const bestScore = previous.length ? Math.max(score, Number(previous[0].score)) : score;
    const saved = await rest('evangelism_quiz_scores?on_conflict=player_hash', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ player_hash: playerHash, nickname, score: bestScore, total_questions: 25, updated_at: new Date().toISOString() }) });
    if (!saved.ok) throw new Error('Could not save your ranking. Please try again.');
    const rankingsResponse = await rest('evangelism_quiz_scores?select=nickname,score,total_questions,updated_at&order=score.desc,updated_at.asc&limit=50');
    if (!rankingsResponse.ok) throw new Error('Could not load the leaderboard.');
    const rankings = await rankingsResponse.json();
    return json({ ok: true, score, total: 25, rankings, review });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Unable to process the quiz.' }, 400);
  }
});
