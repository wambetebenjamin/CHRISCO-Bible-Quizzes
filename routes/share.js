const express = require('express');
const router = express.Router();
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
router.get('/', (req, res) => {
  const role = req.query.role === 'player' ? 'player' : 'host';
  const pin = escape(req.query.pin || '');
  const host = escape(req.query.host || req.query.hostName || 'Presbyter David Kirui');
  const name = escape(req.query.name || 'A friend');
  const base = `${req.protocol}://${req.get('host')}`;
  const title = role === 'player' ? `${name} invited you to CHRISCO Bible Quizzes. PIN ${pin}` : `Join ${host}'s CHRISCO Bible Quiz. PIN ${pin}`;
  const description = `${title}. Play live with friends. Theme: 1 Samuel 30:8 Pursue Overtake Recover All.`;
  const image = `${base}/image-search/bright-colorful-worship-church-backgroun-1.jpg`;
  const joinUrl = `${base}/player.html?pin=${encodeURIComponent(pin)}&host=${encodeURIComponent(host)}&name=${encodeURIComponent(name)}`;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:url" content="${req.originalUrl}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"></head><body><main><img src="${image}" alt="CHRISCO Bible Quizzes"><h1>${title}</h1><p>${description}</p><a href="${joinUrl}">Join this game</a></main></body></html>`);
});
module.exports = router;
