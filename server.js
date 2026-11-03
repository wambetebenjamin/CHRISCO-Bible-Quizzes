/**
 * CHRISCO Bible Quizzes — LOCAL DEV SERVER ONLY
 * ------------------------------------------------
 * The production game runs on Vercel (static files) + Supabase Realtime.
 * This Express server exists purely so you can preview the same frontend
 * locally: it serves /public and exposes /api/config with the same shape
 * as the Vercel serverless function in api/config.js.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... npm start
 */

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Mirrors api/config.js (Vercel) so the frontend code is identical in both.
app.get('/api/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✝  CHRISCO Bible Quizzes (local dev)`);
  console.log(`     http://localhost:${PORT}`);
  console.log(`     SUPABASE_URL set: ${process.env.SUPABASE_URL ? 'yes' : 'NO — set SUPABASE_URL & SUPABASE_ANON_KEY'}\n`);
});
