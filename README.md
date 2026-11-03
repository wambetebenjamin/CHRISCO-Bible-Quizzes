# CHRISCO Bible Quizzes 🎮✝️

Kahoot-style **real-time multiplayer quiz** for church youth camps, Sunday
school, classrooms, offices — any group with phones and a screen.

**▶ Live demo: https://chrisco-bible-quizzes.vercel.app**

## Demo packs (ready to play)

| Use case | Link |
|---|---|
| 🏕️ Youth Camp Bible Quiz | [Host demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=youth-camp) |
| ⛪ Children’s Sunday School | [Host demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=sunday-school) |
| 🏫 School & General Knowledge | [Host demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=school-quest) |
| 💼 Business Trivia | [Host demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=business-brain) |
| 📖 Bible Scholars (advanced) | [Host demo](https://chrisco-bible-quizzes.vercel.app/host.html?pack=bible-scholars) |

Players join at **[player.html](https://chrisco-bible-quizzes.vercel.app/player.html)**
with the 4-digit PIN shown on the host screen.

## Quick start (hosting a game)

1. Open a host link above (projector → full screen).
2. Share the **PIN**; campers open `player.html` and join.
3. Pick a quiz pack in the lobby → **▶ START QUIZ**.
4. 15 seconds per question — fastest correct answers score up to 1000 points.
5. Reveal → Leaderboard → next question → final podium 🥇🥈🥉.

## Create your own quizzes

Packs live in Supabase Postgres — **no coding, no redeploy**. Copy-paste a
short SQL template, and your quiz appears in the host lobby immediately.

📖 Full step-by-step procedures (SQL templates, editing, use-case playbooks):
**[CREATE-A-QUIZ.md](./CREATE-A-QUIZ.md)**

## Architecture

- **Frontend:** vanilla HTML/CSS/JS (`public/index.html`, `host.html`, `player.html`)
- **Realtime:** Supabase Realtime **Broadcast** (questions, answers, reveals) +
  **Presence** (lobby roster, host-online detection)
- **Data:** Postgres tables `rooms`, `players`, `quiz_packs`, `quiz_questions`
  (host browser is the source of truth for the clock and scoring)
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
