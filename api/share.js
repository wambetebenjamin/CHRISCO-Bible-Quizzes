// CHRISCO Bible Quizzes - Share preview page generator
// Serves a dynamic Open Graph preview page for share links.
// Query params: role=host|player, host/hostName, name, icon, emoji, pin, mode
// Host and player shares get different titles and descriptions, so WhatsApp /
// Facebook / X show a thumbnail with the right message for whoever shares.

const THEME = '1 Samuel 30:8 Pursue Overtake Recover All';
const IMAGE_PATH = '/image-search/david-bible-battle-victory-colorful-illu-1.jpg';

const MODE_NAMES = { pursue: 'David Quiz', overtake: 'Overtake', recover: 'Recover All' };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function baseUrl(req) {
  const host = (req.headers && (req.headers.host || req.headers['x-forwarded-host'])) || '';
  const proto = (req.headers && (req.headers['x-forwarded-proto'] || 'https')) || 'https';
  if (host) return proto + '://' + host;
  return 'https://chrisco-bible-quizzes.vercel.app';
}

export default async function handler(req, res) {
  const q = req.query || {};
  const role = q.role === 'player' ? 'player' : 'host';
  const host = esc((q.host || q.hostName || '').toString().trim() || 'Host');
  const name = esc((q.name || '').toString().trim() || 'A friend');
  const icon = esc((q.icon || '').toString().trim() || 'fa-solid fa-lion');
  const emoji = esc((q.emoji || '').toString().trim() || '🦁');
  const pin = esc((q.pin || '').toString().trim() || '???');
  const mode = esc((q.mode || '').toString().trim() || 'pursue');
  const modeName = MODE_NAMES[mode] || 'David Quiz';

  const origin = baseUrl(req);
  const shareUrl = origin + '/api/share?role=' + role + '&pin=' + encodeURIComponent(pin);

  let title, description, heading, body;
  if (role === 'player') {
    title = emoji + ' ' + name + ' invited you to a Bible Quiz game! PIN ' + pin;
    description = emoji + ' ' + name + ' is playing a live CHRISCO Bible Quiz and wants you to join! PIN: ' + pin + '. Tap to play now. Theme: ' + THEME;
    heading = emoji + ' ' + name + ' invites you';
    body = 'A live Bible Quiz game is running. Join with one tap and play together. Theme: ' + THEME;
  } else {
    title = 'CHRISCO Bible Quiz. Join ' + host + "'s game! PIN " + pin;
    description = host + ' is hosting a live Bible Quiz game. PIN: ' + pin + '. Theme: ' + THEME + '. Play live with friends!';
    heading = 'Join ' + host + 's Bible Quiz game';
    body = 'Live multiplayer Bible Quiz. Share the PIN, answer questions, and see who recovers all. Theme: ' + THEME;
  }

  const joinUrl = origin + '/player.html?pin=' + encodeURIComponent(pin) +
    '&host=' + encodeURIComponent(host) +
    '&name=' + encodeURIComponent(name) +
    '&icon=' + encodeURIComponent(icon) +
    '&mode=' + encodeURIComponent(mode);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#00008B" />
  <title>` + title + `</title>
  <meta name="description" content="` + description + `" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CHRISCO Bible Quizzes" />
  <meta property="og:title" content="` + title + `" />
  <meta property="og:description" content="` + description + `" />
  <meta property="og:image" content="` + origin + IMAGE_PATH + `" />
  <meta property="og:url" content="` + shareUrl + `" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="` + title + `" />
  <meta name="twitter:description" content="` + description + `" />
  <meta name="twitter:image" content="` + origin + IMAGE_PATH + `" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
      background: linear-gradient(160deg, #00008B, #46178f);
      color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 1.5rem 1rem;
    }
    .preview {
      width: 100%; max-width: 460px; background: #fff; color: #222;
      border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }
    .preview img { width: 100%; height: 200px; object-fit: cover; display: block; }
    .preview .badge {
      display: inline-block; margin: -22px 0 0 18px; padding: 0.4rem 0.9rem;
      background: #00008B; color: #fff; border-radius: 10px; font-weight: 800; font-size: 0.9rem;
      letter-spacing: 1px;
    }
    .preview .content { padding: 1.4rem 1.5rem 1.6rem; }
    .preview h1 { font-size: 1.35rem; color: #00008B; margin: 0.9rem 0 0.4rem; }
    .preview p { font-size: 0.95rem; color: #444; line-height: 1.5; }
    .preview .theme { margin-top: 0.6rem; font-size: 0.8rem; color: #FF8C00; font-weight: 700; }
    .preview .join {
      display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 1.2rem;
      background: #006400; color: #fff; font-weight: 800; text-decoration: none;
      padding: 0.8rem 1.6rem; border-radius: 12px; font-size: 1rem;
    }
    .preview .join:hover { background: #005500; }
    .preview .foot {
      margin-top: 1rem; font-size: 0.78rem; color: #888; text-align: center;
    }
    .preview .host-btn {
      display: inline-block; margin-top: 0.8rem; color: #00008B; font-weight: 700;
      font-size: 0.85rem; text-decoration: none;
    }
    .preview .host-btn:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="preview">
    <img src="` + origin + IMAGE_PATH + `" alt="CHRISCO Bible Quiz" />
    <span class="badge">GAME PIN ` + pin + `</span>
    <div class="content">
      <h1>` + heading + `</h1>
      <p>` + body + `</p>
      <div class="theme"><i class="fa-solid fa-fire"></i> Theme: ` + THEME + `</div>
      <a class="join" href="` + joinUrl + `"><i class="fa-solid fa-right-to-bracket"></i> Join Game</a>
      <div class="foot">This is how your link previews in WhatsApp, Facebook and X.</div>
      <a class="host-btn" href="` + origin + `/host.html"><i class="fa-solid fa-gamepad"></i> Want to host your own game?</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).send(html);
}
