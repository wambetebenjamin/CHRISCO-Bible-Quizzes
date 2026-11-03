# CHRISCO Bible Quizzes

Kahoot-style **real-time multiplayer quiz** for church youth camps, Sunday
school, classrooms, offices — any group with phones and a screen.

**Live site: https://chrisco-bible-quizzes.vercel.app**

## Demo packs (ready to play)

Every demo has two modes: **watch it run itself** (simulated players — great
for explaining the concept, nobody needs to join) or **host it live** with
real players.

| Use case | Self-running demo (no players needed) | Host live (real players) |
|---|---|---|
| Youth Camp Bible Quiz | [Watch demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=youth-camp&demo=1) | [Host](https://chrisco-bible-quizzes.vercel.app/host.html?pack=youth-camp) |
| Children’s Sunday School | [Watch demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=sunday-school&demo=1) | [Host](https://chrisco-bible-quizzes.vercel.app/host.html?pack=sunday-school) |
| School & General Knowledge | [Watch demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=school-quest&demo=1) | [Host](https://chrisco-bible-quizzes.vercel.app/host.html?pack=school-quest) |
| Business Trivia | [Watch demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=business-brain&demo=1) | [Host](https://chrisco-bible-quizzes.vercel.app/host.html?pack=business-brain) |
| Bible Scholars (advanced) | [Watch demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=bible-scholars&demo=1) | [Host](https://chrisco-bible-quizzes.vercel.app/host.html?pack=bible-scholars) |

**Demo mode** plays the whole game by itself: five simulated players answer,
the reveal, leaderboard and podium run automatically (a gold DEMO badge shows
on screen). You can also start it from the lobby button
**DEMO — NO PLAYERS NEEDED**.

Players join at **[player.html](https://chrisco-bible-quizzes.vercel.app/player.html)**
with the 4-digit PIN shown on the host screen.

## Quick start (hosting a game)

1. Open a host link above (projector → full screen).
2. Share the **PIN**; campers open `player.html` and join.
3. Pick a quiz pack in the lobby → **START QUIZ**.
4. 15 seconds per question — fastest correct answers score up to 1000 points.
5. Reveal → Leaderboard → next question → final podium.

## Create your own quizzes

Packs live in Supabase Postgres — **no coding, no redeploy**. Copy-paste a
short SQL template, and your quiz appears in the host lobby immediately.

Full step-by-step procedures (demo links, SQL templates, editing/retiring
packs, use-case playbooks, icon & photo notes):
**[CREATE-A-QUIZ.md](./CREATE-A-QUIZ.md)**

## Architecture

- **Frontend:** vanilla HTML/CSS/JS (`public/index.html`, `host.html`, `player.html`)
- **Realtime:** Supabase Realtime **Broadcast** (questions, answers, reveals) +
  **Presence** (lobby roster, host-online detection)
- **Data:** Postgres tables `rooms`, `players`, `quiz_packs`, `quiz_questions`
  (host browser is the source of truth for the clock and scoring)
- **Icons:** [Lucide](https://lucide.dev) premium line icons, vendored at
  `public/vendor/lucide.min.js`
- **Photos:** free stock imagery from [Pexels](https://www.pexels.com), in `public/img/`
- **Hosting:** Vercel static files + `api/config.js` serverless function
  (`SUPABASE_URL`, `SUPABASE_ANON_KEY` env vars) — **no long-running server**

## Local development

```bash
npm install
SUPABASE_URL=https://<project>.supabase.co SUPABASE_ANON_KEY=<anon-key> npm start
# → http://localhost:3000
```

`server.js` is only a local preview harness (static files + `/api/config`);
production runs entirely on Vercel + Supabase.

## Smoke test

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... node smoke-test.js
```

Exercises the full protocol: PIN validation, presence, question broadcast,
answer validation, reveal, score persistence, final leaderboard.
