const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createClient } = require('@supabase/supabase-js');

const hostName = process.env.AUTO_HOST_NAME || 'Presbyter David Kirui';
const hostId = 'chrisco-presbyter-david-kirui';
const state = { status: 'starting', pin: null, phase: 'offline', connectedAt: null, error: null };
let lobbyChannel, gameChannel, timer, client;
let players = {}, questions = [], questionIndex = 0, phase = 'lobby', answers = {}, scores = {};

function loadQuestionBank() {
  const sandbox = { window: {}, Math, console };
  const source = fs.readFileSync(path.join(__dirname, 'public', 'questions.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'public/questions.js' });
  return sandbox.window;
}
const bank = loadQuestionBank();
function modeQuestionPool() { return bank.CHRISCO_BA_QUESTIONS || []; }
function shuffle(items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function flattenPresence(presence) { return Object.values(presence || {}).flat().filter(Boolean); }
function send(event, payload) {
  if (!gameChannel) return Promise.resolve();
  return gameChannel.send({ type: 'broadcast', event, payload });
}
function publicPlayers() { return flattenPresence(players).filter(p => !p.isHost); }
async function updateLobby() {
  if (!lobbyChannel || !state.pin) return;
  const status = phase === 'question' || phase === 'reveal' ? 'playing' : 'lobby';
  await lobbyChannel.track({ name: hostName, icon: 'fa-solid fa-dove', hostId, pin: state.pin, mode: 'beauty', status, players: publicPlayers().map(p => p.name), isHost: true });
  state.phase = phase;
}
function currentQuestion() { return questions[questionIndex] || null; }
function syncPlayer(to) {
  const q = currentQuestion();
  send('sync', { to, phase, index: questionIndex, total: questions.length, q: q && q.q, options: q && q.options, correct: phase === 'reveal' ? q && q.correct : null, explain: phase === 'reveal' ? q && q.explain : null, seconds: Math.max(1, Math.ceil(((state.deadline || Date.now()) - Date.now()) / 1000)), scores: Object.entries(scores).map(([name, score]) => ({name, score})), winner: state.winner || null, mode: 'beauty' });
}
async function startQuiz() {
  if (phase !== 'lobby' || !gameChannel) return;
  questions = shuffle(modeQuestionPool()).slice(0, 10);
  if (!questions.length) { state.error = 'Beauty for Ashes question bank is empty'; return; }
  questionIndex = 0; answers = {}; scores = {};
  publicPlayers().forEach(p => { scores[p.name] = Number(p.score) || 0; });
  phase = 'question'; state.winner = null;
  await send('start', { mode: 'beauty', rounds: questions.length, name: 'Beauty for Ashes' });
  await updateLobby();
  await showQuestion();
}
async function showQuestion() {
  const q = currentQuestion();
  if (!q) return finishQuiz();
  phase = 'question'; answers = {};
  state.deadline = Date.now() + 20000;
  await send('question', { index: questionIndex, total: questions.length, q: q.q, options: q.options, seconds: 20 });
  await updateLobby();
  clearTimeout(timer);
  timer = setTimeout(() => revealAnswer(), 20000);
}
async function revealAnswer() {
  if (phase !== 'question') return;
  clearTimeout(timer);
  phase = 'reveal';
  const q = currentQuestion();
  publicPlayers().forEach(p => { if (answers[p.name] === q.correct) scores[p.name] = (scores[p.name] || 0) + 100; });
  await send('reveal', { index: questionIndex, correct: q.correct, explain: q.explain, scores: Object.entries(scores).map(([name, score]) => ({name, score})) });
  await updateLobby();
  timer = setTimeout(() => advanceQuestion(), 3000);
}
async function advanceQuestion() {
  if (phase !== 'reveal') return;
  questionIndex++;
  if (questionIndex >= questions.length) return finishQuiz();
  await showQuestion();
}
async function finishQuiz() {
  clearTimeout(timer);
  phase = 'end';
  const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
  state.winner = ranked.length ? ranked[0][0] : null;
  await send('end', { winner: state.winner, scores: ranked.map(([name, score]) => ({name, score})) });
  await updateLobby();
  // Keep the room and PIN listed. The next participant or an existing player's
  // restart request begins a fresh round, rather than leaving a dead room.
  phase = 'lobby'; state.phase = 'lobby';
  await updateLobby();
}

function startAutoHost() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    state.status = 'disabled'; state.error = 'Set SUPABASE_URL and SUPABASE_ANON_KEY to enable the persistent auto host.';
    console.warn(state.error); return;
  }
  state.status = 'connecting';
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  lobbyChannel = client.channel('chrisco-lobby', { config: { presence: { key: hostId } } })
    .on('presence', { event: 'SYNC' }, payload => { state.lobbyPresence = payload.presence || {}; })
    .subscribe(async status => {
      if (status !== 'SUBSCRIBED') {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { state.status = 'error'; state.error = 'Supabase lobby connection: ' + status; }
        return;
      }
      state.status = 'connected'; state.connectedAt = new Date().toISOString(); state.error = null;
      const existing = flattenPresence(lobbyChannel.presenceState()).find(p => p.hostId === hostId && p.pin);
      if (existing) {
        state.status = 'already-hosted'; state.pin = existing.pin;
        console.warn('Another process currently owns the persistent host identity; waiting to take over safely.');
        const retryTakeover = () => setTimeout(async () => {
          if (state.status !== 'already-hosted') return;
          const stillPresent = flattenPresence(lobbyChannel.presenceState()).some(p => p.hostId === hostId && p.pin);
          if (stillPresent) return retryTakeover();
          await client.removeAllChannels(); lobbyChannel = null; gameChannel = null; state.pin = null;
          state.status = 'connecting'; startAutoHost();
        }, 10000);
        retryTakeover();
        return;
      }
      state.pin = String(Math.floor(10000 + Math.random() * 90000));
      phase = 'lobby';
      await lobbyChannel.track({ name: hostName, icon: 'fa-solid fa-dove', hostId, pin: state.pin, mode: 'beauty', status: 'lobby', players: [], isHost: true });
      gameChannel = client.channel('quiz-' + state.pin, { config: { presence: { key: hostId } } })
        .on('presence', { event: 'SYNC' }, payload => { players = payload.presence || {}; updateLobby(); if (phase === 'lobby' && publicPlayers().length) startQuiz(); })
        .on('presence', { event: 'CHANGES' }, payload => {
          players = gameChannel.presenceState();
          updateLobby();
          const joined = flattenPresence(payload.events.joins || {}).filter(p => !p.isHost);
          if (joined.length && phase === 'lobby') startQuiz();
          else joined.forEach(p => { if (p.myId) syncPlayer(p.myId); });
        })
        .on('broadcast', { event: 'answer' }, payload => {
          const answer = payload.payload;
          if (phase === 'question' && answer && typeof answer.name === 'string' && Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < 4) answers[answer.name] = answer.choice;
        })
        .on('broadcast', { event: 'advance-request' }, () => { if (phase === 'question') revealAnswer(); })
        .on('broadcast', { event: 'sync-request' }, payload => { if (payload.payload && payload.payload.myId) syncPlayer(payload.payload.myId); })
        .on('broadcast', { event: 'restart-request' }, () => { if (phase === 'lobby') startQuiz(); })
        .subscribe(async gameStatus => {
          if (gameStatus === 'SUBSCRIBED') {
            await gameChannel.track({ name: hostName, icon: 'fa-solid fa-dove', hostId, isHost: true, status: 'lobby', score: 0, mode: 'beauty' });
            state.status = 'ready'; state.phase = phase; console.log('Persistent Beauty for Ashes room ready:', state.pin);
            await updateLobby();
          } else if (gameStatus === 'CHANNEL_ERROR' || gameStatus === 'TIMED_OUT' || gameStatus === 'CLOSED') {
            state.status = 'error'; state.error = 'Supabase game connection: ' + gameStatus;
          }
        });
    });
}
async function shutdown() {
  clearTimeout(timer);
  if (gameChannel) await gameChannel.unsubscribe();
  if (lobbyChannel) await lobbyChannel.unsubscribe();
  if (client) await client.removeAllChannels();
}

module.exports = { startAutoHost, state, shutdown };
