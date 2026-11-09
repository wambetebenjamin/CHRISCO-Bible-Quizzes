// CHRISCO Bible Quizzes - Share preview page generator
// Serves a dynamic Open Graph preview page for share links.
// Query params: role=host|player, host/hostName, name, icon, emoji, pin, mode
// Host and player shares get different titles and descriptions, so WhatsApp /
// Facebook / X show a thumbnail with the right message for whoever shares.

const THEME = '1 Samuel 30:8 Pursue Overtake Recover All';
const IMAGE_PATH = '/social-preview.png';

const MODE_NAMES = { pursue: 'David Quiz', overtake: 'Overtake', recover: 'Recover All', beauty: 'Beauty for Ashes' };

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
  const host = esc((q.host || 'Presbyter David Kirui').toString().trim());
  const nickname = esc((q.name || '').toString().trim());
  const pin = esc((q.pin || '').toString().trim());
  const mode = (q.mode || 'pursue').toString().trim();
  const modeName = MODE_NAMES[mode] || 'Bible Quiz';
  const title = role === 'host' ? modeName : (nickname || 'A friend') + ' invites you to ' + modeName + ' by Presbyter David Kirui';
  const description = title;
  const origin = baseUrl(req);
  const shareUrl = origin + '/api/share?role=' + role + '&pin=' + encodeURIComponent(pin) +
    '&host=' + encodeURIComponent(host) + '&name=' + encodeURIComponent(nickname) + '&mode=' + encodeURIComponent(mode);
  const joinUrl = origin + '/?pin=' + encodeURIComponent(pin);
  const imageUrl = origin + IMAGE_PATH;
  let heading = title;
  let body = title;

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
  <meta property="og:image" content="` + imageUrl + `" />
  <meta property="og:image:secure_url" content="` + imageUrl + `" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="CHRISCO Bible Quizzes with a hand drawn open Bible in navy, cream, and gold" />
  <meta property="og:url" content="` + shareUrl + `" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="` + title + `" />
  <meta name="twitter:description" content="` + description + `" />
  <meta name="twitter:image" content="` + imageUrl + `" />
  <meta name="twitter:image:alt" content="CHRISCO Bible Quizzes with a hand drawn open Bible in navy, cream, and gold" />
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
    <img src="` + imageUrl + `" alt="CHRISCO Bible Quiz" />
    <div class="content">
      <h1>` + heading + `</h1>
      <a class="join" href="` + joinUrl + `"><i class="fa-solid fa-right-to-bracket"></i> Join Quiz</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).send(html);
}
