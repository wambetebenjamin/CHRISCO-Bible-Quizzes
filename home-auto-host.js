/* Homepage hosted Beauty for Ashes session. The browser tab owns presence and game lifecycle. */
(function () {
  const lobbyName = 'chrisco-lobby';
  const hostName = 'Presbyter David Kirui';
  const hostId = 'homepage-beauty-' + Math.random().toString(36).slice(2, 10);
  let client, lobby, game, pin, players = {}, qs = [], index = 0, timer = null, seconds = 20, phase = 'lobby', answers = {};
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modeName = g => (window.CHRISCO_MODES[g.mode] || {}).name || g.mode || 'Bible Quiz';
  function renderLobby(presence) {
    const entries = Object.values(presence || {}).flat().filter(g => g && g.pin && g.status !== 'idle' && g.status !== 'closed');
    const list = $('lobby-list'); if (!list) return;
    const unique = Array.from(new Map(entries.map(g => [g.hostId || g.pin, g])).values());
    list.innerHTML = unique.length ? unique.map(g => {
      const n = Array.isArray(g.players) ? g.players.length : 0;
      return '<article class="game-tile ' + (g.status === 'playing' ? 'playing' : 'waiting') + '"><div class="gt-pin">' + escapeHtml(g.pin) + '</div><div class="gt-mode">' + escapeHtml(modeName(g)) + '</div><div class="gt-host"><i class="fa-solid fa-user"></i> ' + escapeHtml(g.name) + '</div><div class="gt-meta"><span><i class="fa-solid fa-users"></i> ' + n + ' ' + escapeHtml(window.L(n === 1 ? 'lobby_player' : 'lobby_players')) + '</span><span>' + escapeHtml(window.L(g.status === 'playing' ? 'lobby_playing' : 'lobby_waiting')) + '</span></div><a class="btn btn--yellow gt-join" href="player.html?pin=' + encodeURIComponent(g.pin) + '&host=' + encodeURIComponent(g.name) + '"><i class="fa-solid fa-right-to-bracket"></i> ' + escapeHtml(window.L('join_now')) + '</a></article>';
    }).join('') : '<div class="game-tile gt-empty"><i class="fa-solid fa-hourglass-half"></i> ' + escapeHtml(window.L('lobby_empty_player')) + '</div>';
    const mine = unique.find(g => g.hostId === hostId);
    if (mine) { $('lobby-live-banner').style.display = 'flex'; $('lobby-live-pin').textContent = mine.pin; $('lobby-live-join').href = 'player.html?pin=' + encodeURIComponent(mine.pin) + '&host=' + encodeURIComponent(hostName); }
  }
  function updatePresence() {
    if (lobby) lobby.track({ name:hostName, icon:'fa-solid fa-dove', hostId, pin, mode:'beauty', status:phase === 'question' || phase === 'reveal' ? 'playing':'lobby', players:Object.values(players).flat().filter(p=>!p.isHost).map(p=>p.name), isHost:true });
  }
  function start() {
    if (phase === 'question' || phase === 'reveal' || !game) return;
    qs = window.pickQuestions('beauty', 10); index = 0; phase = 'question'; showQuestion();
    game.send({type:'broadcast',event:'start',payload:{mode:'beauty',rounds:qs.length,name:'Beauty for Ashes'}});
    updatePresence();
  }
  function showQuestion() {
    if (index >= qs.length) { phase='end'; game.send({type:'broadcast',event:'end',payload:{winner:null}}); updatePresence(); return; }
    const q=qs[index]; seconds=20; answers={}; phase='question';
    game.send({type:'broadcast',event:'question',payload:{index,total:qs.length,q:q.q,options:q.options,seconds}});
    clearInterval(timer); timer=setInterval(()=>{ seconds--; if(seconds<=0){ clearInterval(timer); reveal(); } },1000);
  }
  function reveal() {
    if (phase !== 'question') return;
    clearInterval(timer); phase='reveal'; const q=qs[index];
    const scores=Object.values(players).flat().filter(p=>!p.isHost);
    scores.forEach(p=>{ if(answers[p.name]===q.correct) p.score=(p.score||0)+100; });
    game.send({type:'broadcast',event:'reveal',payload:{index,correct:q.correct,explain:q.explain}}); updatePresence();
    setTimeout(()=>{ index++; if(index>=qs.length){phase='end';const ranked=Object.values(players).flat().filter(p=>!p.isHost).sort((a,b)=>(b.score||0)-(a.score||0));game.send({type:'broadcast',event:'end',payload:{winner:ranked[0]?.name||null}});updatePresence();}else showQuestion(); },5000);
  }
  async function connect(config) {
    client = window.supabase.createClient(config.url, config.key);
    lobby = client.channel(lobbyName,{config:{presence:{key:hostId}}}).on('presence',{event:'SYNC'},p=>renderLobby(p.presence)).on('presence',{event:'CHANGES'},p=>renderLobby(p.presence)).subscribe(async status=>{
      if(status!=='SUBSCRIBED') return;
      await lobby.track({name:hostName,icon:'fa-solid fa-dove',hostId,pin:'',mode:'beauty',status:'idle',players:[],isHost:true});
      await new Promise(resolve => setTimeout(resolve, 500));
      const present = lobby.presenceState ? Object.values(lobby.presenceState()).flat() : [];
      if (present.some(g => g && g.hostId !== hostId && String(g.name || '').toLowerCase() === hostName.toLowerCase() && g.pin && g.status !== 'idle')) return;
      pin=String(Math.floor(10000+Math.random()*90000)); phase='lobby';
      game=client.channel('quiz-'+pin,{config:{presence:{key:hostId}}})
        .on('presence',{event:'SYNC'},p=>{players=p.presence||{};updatePresence();})
        .on('presence',{event:'CHANGES'},p=>{players=Object.assign({},players,p.events.leaves,p.events.joins);updatePresence();const joined=Object.values(p.events.joins||{}).filter(x=>!x.isHost);if(joined.length){if(phase==='lobby')start();else joined.forEach(x=>game.send({type:'broadcast',event:'sync',payload:{to:x.myId,phase,index,total:qs.length,q:qs[index]?.q,options:qs[index]?.options,correct:qs[index]?.correct,explain:qs[index]?.explain,seconds,mode:'beauty'}}));}})
        .on('broadcast',{event:'answer'},p=>{const a=p.payload;if(a&&phase==='question')answers[a.name]=a.choice;})
        .on('broadcast',{event:'sync-request'},p=>{const id=p.payload?.myId,q=qs[index];if(id&&q)game.send({type:'broadcast',event:'sync',payload:{to:id,phase,index,total:qs.length,q:q.q,options:q.options,correct:q.correct,explain:q.explain,seconds,mode:'beauty'}});})
        .subscribe(async s=>{if(s==='SUBSCRIBED'){await game.track({name:hostName,icon:'fa-solid fa-dove',hostId,isHost:true,status:'lobby',score:0,mode:'beauty'});updatePresence();}});
    });
  }
  window.addEventListener('DOMContentLoaded',()=>{
    const inp=$('lobby-pin-input'), btn=$('lobby-join-pin-btn');
    if(inp&&btn) btn.addEventListener('click',()=>{const p=inp.value.trim();if(/^\d{4,5}$/.test(p))location.href='player.html?pin='+encodeURIComponent(p);});
    const wrap=$('lang-select-wrap'); if(wrap) window.buildLangSelector(wrap);
    window.applyLang(window.getLang());
    fetch('/api/config').then(r=>r.ok?r.json():Promise.reject()).catch(()=>fetch('/public/config.js').then(r=>r.text()).then(t=>{const m=t.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"][\s\S]*?SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);if(!m)throw Error('config unavailable');return {url:m[1],key:m[2]};})).then(connect).catch(e=>console.error('Lobby connection unavailable:',e));
  });
  window.addEventListener('beforeunload',()=>{clearInterval(timer);if(game)game.unsubscribe();if(lobby)lobby.unsubscribe();});
})();
