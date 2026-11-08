/* Browser side of the lobby dashboard only. The always-on Node process owns the game host. */
(function () {
  const hostName = 'Presbyter David Kirui';
  const BEAUTY_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxRRD8upXMq0icOmFxDJwd5WZ51sZtQ1_eMYUVjQ2zVTJ7Ywe8JL9ME9nBCYBvgJsk/exec';
  let client, lobby;
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modeName = g => (window.CHRISCO_MODES[g.mode] || {}).name || g.mode || 'Bible Quiz';
  function render(presence) {
    const entries = Object.values(presence || {}).flat().filter(g => g && g.pin && !['idle','closed'].includes(String(g.status || '').toLowerCase()) && (g.isPublic === true || g.privacy === 'public' || (!g.privacy && g.isPublic !== false)));
    const unique = Array.from(new Map(entries.map(g => [g.hostId || g.pin, g])).values());
    const list = $('lobby-list'); if (!list) return;
    list.innerHTML = unique.length ? unique.map(g => {
      const n = Array.isArray(g.players) ? g.players.length : 0;
      const playing = String(g.status || '').toLowerCase() === 'playing';
      const displayHost = g.hostName || g.name || 'Host';
      const rankings = Array.isArray(g.rankings) ? g.rankings.slice(0,3).map((row,i) => '<span>' + (i+1) + '. ' + escapeHtml(row.name) + ' <strong>' + (Number(row.score)||0) + '</strong></span>').join('') : '';
      const joinControl = String(g.pin) === '777777'
        ? `<button class="btn btn--yellow gt-join" type="button" onclick="window.location.href = 'player.html?pin=777777';"><i class="fa-solid fa-right-to-bracket"></i> Join ${escapeHtml(g.name || 'Game')}</button>`
        : '<a class="btn btn--yellow gt-join" href="player.html?pin=' + encodeURIComponent(g.pin) + '"><i class="fa-solid fa-right-to-bracket"></i> Join ' + escapeHtml(g.name || 'Game') + '</a>';
      return '<article class="game-tile ' + (playing ? 'playing' : 'waiting') + '"><div class="gt-pin">' + escapeHtml(g.pin) + '</div><div class="gt-mode">' + escapeHtml(modeName(g)) + '</div><div class="gt-host"><i class="fa-solid fa-user"></i> ' + escapeHtml(displayHost) + '</div><div class="gt-meta"><span><i class="fa-solid fa-users"></i> ' + n + ' ' + escapeHtml(window.L(n === 1 ? 'lobby_player' : 'lobby_players')) + '</span><span>' + escapeHtml(window.L(playing ? 'lobby_playing' : 'lobby_waiting')) + '</span></div>' + (rankings ? '<div class="gt-rankings"><strong>Live rankings</strong>' + rankings + '</div>' : '') + joinControl + '</article>';
    }).join('') : '<div class="game-tile gt-empty"><i class="fa-solid fa-hourglass-half"></i> ' + escapeHtml(window.L('lobby_empty_player')) + '</div>';
    const live = unique.find(g => g.hostName === hostName || g.name === hostName || g.name === 'Beauty for Ashes');
    if (live) { $('lobby-live-banner').style.display = 'flex'; $('lobby-live-pin').textContent = live.pin; $('lobby-live-join').href = 'player.html?pin=' + encodeURIComponent(live.pin); }
    else $('lobby-live-banner').style.display = 'none';
  }
  function loadBeautyRankings() {
    const target = $('beauty-public-rankings'); if (!target) return;
    const callback = '__chriscoRankings' + Date.now();
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(null), 12000);
    function finish(rows) {
      clearTimeout(timeout); delete window[callback]; script.remove(); target.replaceChildren();
      if (!Array.isArray(rows) || !rows.length) { target.textContent = 'No completed quizzes yet. Be the first to join!'; return; }
      rows.slice(0, 5).forEach((row, i) => {
        const line = document.createElement('div'); line.style.cssText = 'display:flex;gap:.6rem;align-items:center;padding:.35rem .45rem;border-bottom:1px solid #e8ebf1;';
        const rank = document.createElement('b'); rank.textContent = (i + 1) + '.'; rank.style.color = '#8a6114';
        const nickname = document.createElement('span'); nickname.textContent = row.nickname || 'Quiz player'; nickname.style.flex = '1';
        const score = document.createElement('strong'); score.textContent = (Number(row.score) || 0) + ' / ' + (Number(row.total) || 10); score.style.color = '#071a52';
        line.append(rank, nickname, score); target.appendChild(line);
      });
    }
    window[callback] = data => finish(data && data.rankings);
    script.onerror = () => finish(null);
    script.src = BEAUTY_SCRIPT_URL + '?action=leaderboard&callback=' + encodeURIComponent(callback);
    document.head.appendChild(script);
  }
  function connect(config) {
    client = window.supabase.createClient(config.url, config.key);
    lobby = client.channel('global-lobby')
      .on('presence', {event:'SYNC'}, p => render(p.presence))
      .on('presence', {event:'CHANGES'}, () => render(lobby.presenceState()))
      .subscribe(status => { if (status === 'SUBSCRIBED') render(lobby.presenceState()); });
  }
  window.addEventListener('DOMContentLoaded', () => {
    loadBeautyRankings();
    const wrap = $('lang-select-wrap'); if (wrap) window.buildLangSelector(wrap);
    window.applyLang(window.getLang());
    const input = $('lobby-pin-input'), button = $('lobby-join-pin-btn');
    if (input && button) button.addEventListener('click', () => { const pin = input.value.trim(); if (/^\d{4,6}$/.test(pin)) location.href = 'player.html?pin=' + encodeURIComponent(pin); });
    fetch('/api/config').then(r => r.ok ? r.json() : Promise.reject()).catch(() => fetch('/config.js').then(r => r.text()).then(t => {
      const m = t.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"][\s\S]*?SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
      if (!m) throw Error('Supabase config unavailable'); return {url:m[1],key:m[2]};
    })).then(connect).catch(e => console.error('Lobby connection unavailable:', e));
  });
  window.addEventListener('beforeunload', () => { if (lobby) lobby.unsubscribe(); if (client) client.removeAllChannels(); });
})();
