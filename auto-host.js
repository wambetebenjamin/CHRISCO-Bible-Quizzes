const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const hostName = process.env.AUTO_HOST_NAME || 'Presbyter David Kirui';
const hostId = 'chrisco-presbyter-david-kirui';
const persistentPin = '777777';
const lobbyName = 'global-lobby';
const gameSettings = { pacing:'self', answerVisibility:'immediate', timerSeconds:20, retries:'allow', privacy:'public' };
const standbyQuestions = [
  { q:'When the Amalekites captured David’s family at Ziklag, what did David do before pursuing them?', options:['He strengthened himself in the Lord and asked the Lord what to do','He immediately left without consulting anyone','He asked the Philistines for help','He waited for the Amalekites to return'], correct:0, explain:'David strengthened himself in the Lord and inquired of Him before pursuing the raiders (1 Samuel 30:6 to 8).' },
  { q:'When David faced Goliath, where did David say his confidence came from?', options:['His armor and weapons','The Lord of hosts, whom Goliath had defied','The size of Israel’s army','A promise of riches from Saul'], correct:1, explain:'David declared that the battle belonged to the Lord of hosts (1 Samuel 17:45 to 47).' },
  { q:'After Peter affirmed his love for Jesus, what work did Jesus entrust to him?', options:['Build a palace in Jerusalem','Feed and care for Jesus’ sheep','Return to fishing permanently','Lead the Roman army'], correct:1, explain:'Jesus told Peter to feed His lambs and tend His sheep (John 21:15 to 17).' },
  { q:'At the Red Sea, what did Moses do as the Lord made a way for Israel?', options:['He stretched out his hand over the sea','He built boats for the people','He asked Pharaoh to lead them','He returned to Egypt alone'], correct:0, explain:'Moses stretched out his hand, and the Lord drove the sea back (Exodus 14:21).' },
  { q:'When a storm threatened the boat, how did Jesus show authority over creation?', options:['He told the disciples to abandon the boat','He rebuked the wind and commanded the sea to be still','He waited for the storm to pass','He asked the crowd to row faster'], correct:1, explain:'Jesus rebuked the wind and said to the sea, “Peace, be still” (Mark 4:39).' }
];
const state = { status: 'starting', pin: null, phase: 'offline', connectedAt: null, error: null, standbyQuestions:standbyQuestions.length };
let lobbyChannel, gameChannel, timer, client;
let players = {}, questions = [], questionIndex = 0, phase = 'lobby', answers = {}, scores = {}, readyPlayers = {};

function flattenPresence(presence) { return Object.values(presence || {}).flat().filter(Boolean); }
function send(event, payload) {
  if (!gameChannel) return Promise.resolve();
  return gameChannel.send({ type: 'broadcast', event, payload });
}
function publicPlayers() { return flattenPresence(players).filter(p => !p.isHost); }
function currentRankings() {
  const totals = { ...scores };
  const q = phase === 'question' ? currentQuestion() : null;
  if (q) Object.entries(answers).forEach(([name, choice]) => { if (choice === q.correct) totals[name] = (totals[name]||0) + 100; });
  return Object.entries(totals).map(([name, score]) => ({ name, score:Number(score)||0 })).sort((a,b) => b.score-a.score);
}
async function updateLobby() {
  if (!lobbyChannel || !state.pin) return;
  const status = phase === 'question' || phase === 'reveal' ? 'PLAYING' : 'LOBBY';
  const lobbyNames = new Set([...publicPlayers().map(p => p.name), ...Object.keys(readyPlayers)]);
  const playersList = [...lobbyNames].filter(Boolean).map(name => ({ name, score:Number(scores[name])||0, ready:true }));
  await lobbyChannel.track({ isPublic:true, name:'Beauty for Ashes', hostName, icon:'fa-solid fa-dove', hostId, pin:state.pin, mode:'beauty', status, privacy:'public', settings:gameSettings, players:playersList, rankings:currentRankings(), isHost:true });
  state.phase = phase;
}
async function publishLeaderboard() {
  const scoresList = currentRankings();
  await send('leaderboard', { scores:scoresList, players:publicPlayers().map(p => p.name) });
  await updateLobby();
}
function currentQuestion() { return questions[questionIndex] || null; }
function syncPlayer(to) {
  const q = currentQuestion();
  send('sync', { to, phase, index: questionIndex, total: questions.length, q: q && q.q, options: q && q.options, correct: phase === 'reveal' ? q && q.correct : null, explain: phase === 'reveal' ? q && q.explain : null, seconds: Math.max(1, Math.ceil(((state.deadline || Date.now()) - Date.now()) / 1000)), settings:gameSettings, scores: Object.entries(scores).map(([name, score]) => ({name, score})), winner: state.winner || null, mode: 'beauty' });
}
async function startQuiz() {
  if (phase !== 'lobby' || !gameChannel) return;
  questions = standbyQuestions.map(q => ({ ...q }));
  questionIndex = 0; answers = {}; scores = {};
  publicPlayers().forEach(p => { if (p.name) scores[p.name] = 0; });
  Object.keys(readyPlayers).forEach(name => { scores[name] = 0; });
  phase = 'question'; state.winner = null;
  await send('start', { mode: 'beauty', rounds: questions.length, name: 'Beauty for Ashes', settings:gameSettings });
  await updateLobby();
  await showQuestion();
}
async function showQuestion() {
  const q = currentQuestion();
  if (!q) return finishQuiz();
  phase = 'question'; answers = {};
  state.deadline = Date.now() + 20000;
  await send('question', { index: questionIndex, total: questions.length, q: q.q, options: q.options, seconds: 20, settings:gameSettings });
  await updateLobby();
  clearTimeout(timer);
  timer = setTimeout(() => revealAnswer(), 20000);
}
async function revealAnswer() {
  if (phase !== 'question') return;
  clearTimeout(timer);
  phase = 'reveal';
  const q = currentQuestion();
  Object.entries(answers).forEach(([name, choice]) => { if (choice === q.correct) scores[name] = (scores[name] || 0) + 100; });
  const ranking = currentRankings();
  await send('reveal', { index: questionIndex, correct: q.correct, explain: q.explain, visibility:'immediate', scores:ranking });
  await publishLeaderboard();
  if (gameSettings.pacing !== 'self') timer = setTimeout(() => advanceQuestion(), 3000);
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
  let fallback = {};
  try {
    const source = fs.readFileSync(path.join(__dirname, 'public', 'config.js'), 'utf8');
    const urlMatch = source.match(/SUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]/);
    const keyMatch = source.match(/SUPABASE_ANON_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
    fallback = { url:urlMatch && urlMatch[1], key:keyMatch && keyMatch[1] };
  } catch (_) {}
  const url = process.env.SUPABASE_URL || fallback.url;
  const key = process.env.SUPABASE_ANON_KEY || fallback.key;
  if (!url || !key) {
    state.status = 'disabled'; state.error = 'Set SUPABASE_URL and SUPABASE_ANON_KEY to enable the persistent auto host.';
    console.warn(state.error); return;
  }
  state.status = 'connecting';
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  lobbyChannel = client.channel(lobbyName, { config: { presence: { key: hostId } } })
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
      state.pin = persistentPin;
      phase = 'lobby'; readyPlayers = {}; scores = {}; answers = {};
      await lobbyChannel.track({ isPublic:true, name:'Beauty for Ashes', hostName, icon:'fa-solid fa-dove', hostId, pin:state.pin, mode:'beauty', status:'LOBBY', privacy:'public', settings:gameSettings, players:[], isHost:true });
      gameChannel = client.channel('quiz-' + state.pin, { config: { presence: { key: hostId } } })
        .on('presence', { event: 'SYNC' }, payload => { players = payload.presence || {}; const ready=publicPlayers().filter(p=>p.ready); ready.forEach(p=>{if(p.name){readyPlayers[p.name]={myId:p.myId,deviceId:p.deviceId};scores[p.name]=Number(scores[p.name])||0;}}); updateLobby(); if (phase === 'lobby' && ready.length) startQuiz(); })
        .on('presence', { event: 'CHANGES' }, () => {
          players = gameChannel.presenceState();
          updateLobby();
        })
        .on('broadcast', { event: 'player-ready' }, async payload => {
          const ready = payload.payload;
          if (!ready || !ready.name || !ready.myId) return;
          readyPlayers[ready.name] = { myId:ready.myId, deviceId:ready.deviceId || null };
          if (!Number.isFinite(scores[ready.name])) scores[ready.name] = 0;
          if (phase === 'lobby') await startQuiz();
          else syncPlayer(ready.myId);
          await publishLeaderboard();
        })
        .on('broadcast', { event: 'answer' }, async payload => {
          const answer = payload.payload;
          if (phase === 'question' && answer && typeof answer.name === 'string' && Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < 4) {
            answers[answer.name] = answer.choice;
            await publishLeaderboard();
          }
        })
        .on('broadcast', { event: 'advance-request' }, async () => { if (phase === 'question') { await revealAnswer(); timer=setTimeout(() => advanceQuestion(), 1200); } else if (phase === 'reveal') advanceQuestion(); })
        .on('broadcast', { event: 'sync-request' }, payload => { if (payload.payload && payload.payload.myId) syncPlayer(payload.payload.myId); })
        .on('broadcast', { event: 'restart-request' }, () => { if (phase === 'lobby') startQuiz(); })
        .subscribe(async gameStatus => {
          if (gameStatus === 'SUBSCRIBED') {
            await gameChannel.track({ name: hostName, icon: 'fa-solid fa-dove', hostId, isHost: true, status: 'lobby', score: 0, mode: 'beauty', settings:gameSettings });
            state.status = 'ready'; state.phase = phase; console.log('Persistent Beauty for Ashes room ready at PIN ' + state.pin);
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
