/**
 * End-to-end smoke test of the Supabase Realtime game protocol.
 * Simulates a host + one player using the same events as the HTML clients.
 * Run: node smoke-test.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY first.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let failures = 0;
const ok = (cond, label) => {
  console.log((cond ? '  ✔ ' : '  ✘ FAIL ') + label);
  if (!cond) failures++;
};

const PLAYER_TOKEN = 't-smoke-' + Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeoutMs = 8000, everyMs = 100) {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > timeoutMs) return null;
    await sleep(everyMs);
  }
}

async function main() {
  console.log('1) Postgres: host creates a room');
  let pin = null;
  for (let i = 0; i < 10 && !pin; i++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    const { data, error } = await sb
      .from('rooms')
      .insert({ pin: candidate, status: 'lobby', current_index: -1 })
      .select()
      .single();
    if (!error) pin = data.pin;
    else if (error.code !== '23505') throw error;
  }
  ok(pin && /^\d{4}$/.test(pin), `room created with PIN ${pin}`);

  try {
    // ---------- HOST ----------
    const hostChannel = sb.channel(`room:${pin}`, {
      config: { broadcast: { self: false }, presence: { key: 'host' } },
    });
    const hostGot = { answer: null, sync: 0 };
    hostChannel
      .on('broadcast', { event: 'answer' }, ({ payload }) => (hostGot.answer = payload))
      .on('broadcast', { event: 'sync_request' }, ({ payload }) => {
        hostGot.sync++;
        hostChannel.send({
          type: 'broadcast',
          event: 'question',
          payload: {
            questionNumber: 1,
            totalQuestions: 5,
            question: 'Who built the ark?',
            options: ['Moses', 'Noah', 'David', 'Solomon'],
            durationMs: 15000,
            forToken: payload.token,
            msLeft: 9000,
          },
        });
      })
      .on('presence', { event: 'sync' }, () => (hostGot.presenceSync = true));

    const hostStatus = await hostChannel.subscribe();
    ok(hostStatus === 'SUBSCRIBED', 'host channel subscribed');
    await hostChannel.track({ role: 'host', name: 'Host' });

    // ---------- PLAYER ----------
    console.log('2) Postgres: player validates PIN + joins roster');
    const { data: room } = await sb.from('rooms').select('pin,status').eq('pin', pin).maybeSingle();
    ok(!!room, 'PIN validates against rooms table');

    const { data: noRoom } = await sb.from('rooms').select('pin').eq('pin', '9999').maybeSingle();
    ok(!noRoom, 'bogus PIN rejected');

    const { error: insErr } = await sb
      .from('players')
      .insert({ room_pin: pin, token: PLAYER_TOKEN, name: 'Faith' });
    ok(!insErr, 'player row inserted');

    const playerChannel = sb.channel(`room:${pin}`, {
      config: { broadcast: { self: false }, presence: { key: PLAYER_TOKEN } },
    });
    const playerGot = { question: null, reveal: null, final: null, answerError: null };
    playerChannel
      .on('broadcast', { event: 'question' }, ({ payload }) => (playerGot.question = payload))
      .on('broadcast', { event: 'reveal' }, ({ payload }) => (playerGot.reveal = payload))
      .on('broadcast', { event: 'final' }, ({ payload }) => (playerGot.final = payload))
      .on('broadcast', { event: 'answer_error' }, ({ payload }) => (playerGot.answerError = payload))
      .on('presence', { event: 'sync' }, () => (playerGot.presenceSync = true));

    const playerStatus = await playerChannel.subscribe();
    ok(playerStatus === 'SUBSCRIBED', 'player channel subscribed');
    await playerChannel.track({ role: 'player', name: 'Faith', token: PLAYER_TOKEN });

    // ---------- PRESENCE ----------
    console.log('3) Presence: host sees the player');
    const sawPlayer = await waitFor(() => {
      const st = hostChannel.presenceState();
      return Object.values(st).some((metas) =>
        metas.some((m) => m && m.role === 'player' && m.token === PLAYER_TOKEN)
      );
    });
    ok(sawPlayer, 'host presenceState includes player');

    const playerSawHost = await waitFor(() => {
      const st = playerChannel.presenceState();
      return Object.values(st).some((metas) => metas.some((m) => m && m.role === 'host'));
    });
    ok(playerSawHost, 'player presenceState includes host (host-left detection)');

    // ---------- QUESTION BROADCAST ----------
    console.log('4) Broadcast: question (no answer leak)');
    hostChannel.send({
      type: 'broadcast',
      event: 'question',
      payload: {
        questionNumber: 1,
        totalQuestions: 5,
        question: 'Who built the ark?',
        options: ['Moses', 'Noah', 'David', 'Solomon'],
        durationMs: 15000,
      },
    });
    const q = await waitFor(() => playerGot.question);
    ok(!!q, 'player received question');
    ok(q && !('correct' in q) && q.options.length === 4, 'correct answer not leaked; 4 options');

    // ---------- ANSWER BROADCAST ----------
    console.log('5) Broadcast: player answers (correct = Noah idx 1)');
    playerChannel.send({
      type: 'broadcast',
      event: 'answer',
      payload: { token: PLAYER_TOKEN, answerIndex: 1 },
    });
    const ans = await waitFor(() => hostGot.answer);
    ok(!!ans && ans.answerIndex === 1 && ans.token === PLAYER_TOKEN, 'host received answer');

    // Host scores like the real client (speed-scaled points).
    const timeLeft = 12000;
    const points = Math.max(100, Math.round(1000 * (timeLeft / 15000)));
    const score = points;

    // Double answer must be rejected by host logic → simulate via sync error path:
    // (the HTML host does this inline; here we just verify error routing works)
    playerChannel.send({
      type: 'broadcast',
      event: 'answer',
      payload: { token: PLAYER_TOKEN, answerIndex: 2 },
    });
    await waitFor(() => hostGot.answer); // second delivery
    // Host would reply answer_error for the duplicate:
    hostChannel.send({
      type: 'broadcast',
      event: 'answer_error',
      payload: { token: PLAYER_TOKEN, error: 'You already answered this question.' },
    });
    const aerr = await waitFor(() => playerGot.answerError);
    ok(!!aerr && aerr.error.includes('already answered'), 'player received answer_error for duplicate');

    // ---------- REVEAL ----------
    console.log('6) Broadcast: reveal with per-player results');
    hostChannel.send({
      type: 'broadcast',
      event: 'reveal',
      payload: {
        questionNumber: 1,
        totalQuestions: 5,
        correctIndex: 1,
        correctText: 'Noah',
        answerCounts: [0, 1, 0, 0],
        leaderboard: [{ name: 'Faith', score }],
        results: {
          [PLAYER_TOKEN]: { answered: true, correct: true, points, score, rank: 1 },
        },
      },
    });
    const rev = await waitFor(() => playerGot.reveal);
    ok(!!rev, 'player received reveal');
    ok(rev && rev.correctIndex === 1 && rev.correctText === 'Noah', 'reveal carries correct answer');
    const mine = rev && rev.results[PLAYER_TOKEN];
    ok(mine && mine.correct && mine.points === points, `own result: +${mine && mine.points} pts (total ${mine && mine.score})`);

    // ---------- SCORE PERSISTENCE ----------
    console.log('7) Postgres: score persisted');
    await sb
      .from('players')
      .upsert({ room_pin: pin, token: PLAYER_TOKEN, name: 'Faith', score }, { onConflict: 'room_pin,token' });
    const { data: row } = await sb
      .from('players')
      .select('score')
      .eq('room_pin', pin)
      .eq('token', PLAYER_TOKEN)
      .maybeSingle();
    ok(row && row.score === score, `players.score = ${score}`);

    // Rejoin keeps score (update name only, not score):
    await sb.from('players').update({ name: 'Faith' }).eq('room_pin', pin).eq('token', PLAYER_TOKEN);
    const { data: row2 } = await sb
      .from('players')
      .select('score,name')
      .eq('room_pin', pin)
      .eq('token', PLAYER_TOKEN)
      .maybeSingle();
    ok(row2 && row2.score === score && row2.name === 'Faith', 'rejoin preserves score');

    // ---------- SYNC REQUEST ----------
    console.log('8) Broadcast: sync_request → state replay');
    playerChannel.send({ type: 'broadcast', event: 'sync_request', payload: { token: PLAYER_TOKEN } });
    const syncs = await waitFor(() => hostGot.sync > 0);
    ok(!!syncs, 'host received sync_request');

    // ---------- FINAL ----------
    console.log('9) Broadcast: final leaderboard');
    hostChannel.send({
      type: 'broadcast',
      event: 'final',
      payload: {
        totalQuestions: 5,
        podium: [{ name: 'Faith', score }],
        players: [{ name: 'Faith', score }],
      },
    });
    const fin = await waitFor(() => playerGot.final);
    ok(!!fin && fin.podium[0].name === 'Faith', 'player received final leaderboard');

    await sb.removeChannel(hostChannel);
    await sb.removeChannel(playerChannel);
  } finally {
    // Cleanup: cascade removes players.
    const { error: delErr } = await sb.from('rooms').delete().eq('pin', pin);
    ok(!delErr, 'test room cleaned up');
    const { data: left } = await sb.from('players').select('id').eq('room_pin', pin);
    ok(!left || left.length === 0, 'no orphan players');
  }

  console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL TESTS PASSED'));
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
