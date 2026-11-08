const express = require('express');
const router = express.Router();
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
router.get('/', (req, res) => {
  const role = req.query.role === 'player' ? 'player' : 'host';
  const pin = escape(req.query.pin || '');
  const host = escape(req.query.host || req.query.hostName || 'Presbyter David Kirui');
  const name = escape(req.query.name || 'A friend');
  const modeKey = String(req.query.mode || 'pursue').trim();
  const mode = ({pursue:'David Quiz',overtake:'Overtake',recover:'Recover All',beauty:'Beauty for Ashes'})[modeKey] || 'Bible Quiz';
  const base = `${req.protocol}://${req.get('host')}`;
  const title = role === 'player' ? `${name} invited you to ${mode}. PIN ${pin}` : `Join ${host}'s ${mode}. PIN ${pin}`;
  const description = `${title}. Play live with friends.`;
  const image = `${base}/social-preview.png`;
  const joinUrl = `${base}/player.html?pin=${encodeURIComponent(pin)}&host=${encodeURIComponent(host)}&name=${encodeURIComponent(name)}&mode=${encodeURIComponent(modeKey)}`;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="CHRISCO Bible Quizzes: Read Scripture. Think deeply. Play together."><meta property="og:url" content="${req.originalUrl}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="CHRISCO Bible Quizzes: Read Scripture. Think deeply. Play together."></head><body><main><img src="${image}" alt="CHRISCO Bible Quizzes"><h1>${title}</h1><p>${description}</p><a href="${joinUrl}">Join this game</a></main></body></html>`);
});
module.exports = router;
