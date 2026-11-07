/* Browser side of the lobby dashboard only. The always-on Node process owns the game host. */
(function () {
  const hostName = 'Presbyter David Kirui';
  let client, lobby;
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modeName = g => (window.CHRISCO_MODES[g.mode] || {}).name || g.mode || 'Bible Quiz';
  function render(presence) {
    const entries = Object.values(presence || {}).flat().filter(g => g && g.pin && g.status !== 'idle' && g.status !== 'closed' && (g.privacy === 'public' || !g.privacy));
    const unique = Array.from(new Map(entries.map(g => [g.hostId || g.pin, g])).values());
    const list = $('lobby-list'); if (!list) return;
    list.innerHTML = unique.length ? unique.map(g => {
      const n = Array.isArray(g.players) ? g.players.length : 0;
      return '<article class="game-tile ' + (g.status === 'playing' ? 'playing' : 'waiting') + '"><div class="gt-pin">' + escapeHtml(g.pin) + '</div><div class="gt-mode">' + escapeHtml(modeName(g)) + '</div><div class="gt-host"><i class="fa-solid fa-user"></i> ' + escapeHtml(g.name) + '</div><div class="gt-meta"><span><i class="fa-solid fa-users"></i> ' + n + ' ' + escapeHtml(window.L(n === 1 ? 'lobby_player' : 'lobby_players')) + '</span><span>' + escapeHtml(window.L(g.status === 'playing' ? 'lobby_playing' : 'lobby_waiting')) + '</span></div><a class="btn btn--yellow gt-join" href="player.html?pin=' + encodeURIComponent(g.pin) + '&host=' + encodeURIComponent(g.name) + '"><i class="fa-solid fa-right-to-bracket"></i> ' + escapeHtml(window.L('join_now')) + '</a></article>';
    }).join('') : '<div class="game-tile gt-empty"><i class="fa-solid fa-hourglass-half"></i> ' + escapeHtml(window.L('lobby_empty_player')) + '</div>';
    const live = unique.find(g => g.name === hostName);
    if (live) { $('lobby-live-banner').style.display = 'flex'; $('lobby-live-pin').textContent = live.pin; $('lobby-live-join').href = 'player.html?pin=' + encodeURIComponent(live.pin) + '&host=' + encodeURIComponent(hostName); }
    else $('lobby-live-banner').style.display = 'none';
  }
  function connect(config) {
    client = window.supabase.createClient(config.url, config.key);
    lobby = client.channel('chrisco-lobby')
      .on('presence', {event:'SYNC'}, p => render(p.presence))
      .on('presence', {event:'CHANGES'}, () => render(lobby.presenceState()))
      .subscribe(status => { if (status === 'SUBSCRIBED') render(lobby.presenceState()); });
  }
  window.addEventListener('DOMContentLoaded', () => {
    const wrap = $('lang-select-wrap'); if (wrap) window.buildLangSelector(wrap);
    window.applyLang(window.getLang());
    const input = $('lobby-pin-input'), button = $('lobby-join-pin-btn');
    if (input && button) button.addEventListener('click', () => { const pin = input.value.trim(); if (/^\d{4,5}$/.test(pin)) location.href = 'player.html?pin=' + encodeURIComponent(pin); });
    fetch('/api/config').then(r => r.ok ? r.json() : Promise.reject()).catch(() => fetch('/config.js').then(r => r.text()).then(t => {
      const m = t.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"][\s\S]*?SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
      if (!m) throw Error('Supabase config unavailable'); return {url:m[1],key:m[2]};
    })).then(connect).catch(e => console.error('Lobby connection unavailable:', e));
  });
  window.addEventListener('beforeunload', () => { if (lobby) lobby.unsubscribe(); if (client) client.removeAllChannels(); });
})();
