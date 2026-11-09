const express = require('express');
const router = express.Router();
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modes = {pursue:'David Quiz',overtake:'Overtake Quiz',recover:'Recover All Quiz',beauty:'Beauty for Ashes Quiz'};
router.get('/', (req, res) => {
  const role = req.query.role === 'player' ? 'player' : 'host';
  const pin = escape(req.query.pin || '');
  const host = escape(req.query.host || 'Presbyter David Kirui');
  const nickname = escape(req.query.name || '');
  const modeKey = String(req.query.mode || 'pursue').trim();
  const quiz = modes[modeKey] || 'Bible Quiz';
  const base = `${req.protocol}://${req.get('host')}`;
  const title = role === 'host' ? quiz : `${nickname || 'A friend'} invites you to ${quiz} by Presbyter David Kirui`;
  const description = title;
  const image = `${base}/social-preview.png`;
  const joinUrl = `${base}/?pin=${encodeURIComponent(pin)}`;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="CHRISCO Bible Quizzes"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="CHRISCO Bible Quizzes with a hand drawn open Bible in navy, cream, and gold"><meta property="og:url" content="${base}/api/share?role=${role}&amp;pin=${encodeURIComponent(pin)}&amp;host=${encodeURIComponent(host)}&amp;name=${encodeURIComponent(nickname)}&amp;mode=${encodeURIComponent(modeKey)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"></head><body><main><img src="${image}" alt="CHRISCO Bible Quizzes"><h1>${title}</h1><a href="${joinUrl}">Join this quiz</a></main></body></html>`);
});
module.exports = router;
