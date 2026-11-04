# CHRISCO-Bible-Quizzes

## Theme
1 Samuel 30:8 — Pursue, Overtake, Recover All

## Architecture (Expert DevOps & Supabase)
- **Phase 1: Config Exposure**
  - `public/config.js` exposes `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `host.html` and `player.html`.
  - Supabase JS CDN v2 imported.
- **Phase 2: Realtime Channels & State**
  - Channel ID: `game-PIN` (PIN: 839204).
  - Presence state maintained by Host.
  - Players subscribe with `.subscribe((status) => { console.error(...) })` logging.
  - **SQL Policies (Concept)**:
    ```sql
    ALTER TABLE games ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "public read/write" ON games FOR ALL TO public WITH CHECK (true);
    ```
  - **Fix "Host Ended"**: Leader starts new game, players join new PIN (839204). Concept demo explains flow without live person.
- **Phase 3: Redeploy & Verify**
  - Files: `index.html` (Concept Landing), `host.html`, `player.html`, `public/config.js`, `vercel.json`.
  - Premium Icons: Font Awesome 6.
  - Free Images: Local workspace `image-search/` (1 Samuel 30 8 theme).

## Links (Ready to Click & Play Concept)
- Main: https://chrisco-bible-quizzes.vercel.app
- Pursue: https://chrisco-bible-quizzes-m5sgius6n-wambete-benjamin-s-projects.vercel.app
- Overtake: https://chrisco-bible-quizzes-ekyofbfbp-wambete-benjamin-s-projects.vercel.app
- Recover All: https://chrisco-bible-quizzes-pnhiwvhk3-wambete-benjamin-s-projects.vercel.app

## Theme
1 Samuel 30:8 — Pursue, Overtake, Recover All
Premium Icons: Font Awesome 6
Free Images: Local workspace (1 Samuel 30 8 theme)
Leader Start / Join PIN: 839204 (Concept Demo - No Live Person)
Cards: Mobile optimized grid with badges for each stage
