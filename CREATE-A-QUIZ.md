# CREATE-A-QUIZ.md — Demos & Procedures

CHRISCO Bible Quizzes ships with **5 ready-to-play demo packs**. Each pack is a
set of questions stored in Supabase Postgres; the host screen lets you pick a
pack before starting. You can create your own packs for **any** use case with
a short SQL snippet — no coding, no redeploy.

---

## 1. Live demos (instant)

Open the landing page → click a card, **or** use these direct links:

| Use case | Pack slug | Host link (pre-selected) |
|---|---|---|
| 🏕️ Youth camp Bible quiz | `youth-camp` | https://chrisco-bible-quizzes.vercel.app/host.html?pack=youth-camp |
| ⛪ Children’s Sunday school | `sunday-school` | https://chrisco-bible-quizzes.vercel.app/host.html?pack=sunday-school |
| 🏫 School / general knowledge | `school-quest` | https://chrisco-bible-quizzes.vercel.app/host.html?pack=school-quest |
| 💼 Business / office team quiz | `business-brain` | https://chrisco-bible-quizzes.vercel.app/host.html?pack=business-brain |
| 📖 Bible scholars (advanced) | `bible-scholars` | https://chrisco-bible-quizzes.vercel.app/host.html?pack=bible-scholars |

### Play procedure (any pack)

1. **Host** opens the link above (projector / big screen) → the pack is
   pre-selected (you can still switch packs in the lobby).
2. Share the **4-digit PIN** with players.
3. **Players** open https://chrisco-bible-quizzes.vercel.app/player.html →
   enter the PIN + a nickname → **JOIN GAME**.
4. Host presses **▶ START QUIZ**.
5. Each question: 15 seconds — players tap a colour; fastest correct answers
   earn up to 1000 points (minimum 100), wrong answers earn 0.
6. After each question: reveal (correct answer + % distribution) →
   **LEADERBOARD** → **NEXT QUESTION**.
7. After the last question: final podium 🥇🥈🥉 → **HOST A NEW GAME**.

---

## 2. Creating your own quiz pack (procedure)

**No code changes needed** — packs are stored in the database and appear in
the host lobby automatically.

### Step 1 — Open the SQL editor

Supabase Dashboard → your project (`chrisco-digital-academy`) → **SQL Editor**.

### Step 2 — Paste the template (edit the values!)

```sql
-- 1) Create the pack (one row = one quiz)
insert into public.quiz_packs (slug, title, description, icon, audience)
values (
  'my-new-quiz',                      -- slug: lowercase, hyphens, unique
  'My New Quiz',                      -- title shown on the host picker
  'What this quiz is about',          -- short description
  '🎉',                               -- icon (any emoji)
  'youth'                             -- audience: youth|children|school|business|adults|general
)
on conflict (slug) do nothing;

-- 2) Add the questions (4 options each, one correct)
insert into public.quiz_questions (pack_slug, position, question, options, correct) values
  ('my-new-quiz', 1, 'First question?',  '["Option A","Option B","Option C","Option D"]'::jsonb, 0),
  ('my-new-quiz', 2, 'Second question?', '["Option A","Option B","Option C","Option D"]'::jsonb, 2),
  ('my-new-quiz', 3, 'Third question?',  '["Option A","Option B","Option C","Option D"]'::jsonb, 1),
  ('my-new-quiz', 4, 'Fourth question?', '["Option A","Option B","Option C","Option D"]'::jsonb, 3),
  ('my-new-quiz', 5, 'Fifth question?',  '["Option A","Option B","Option C","Option D"]'::jsonb, 2)
on conflict (pack_slug, position)
  do update set question = excluded.question,
                options   = excluded.options,
                correct   = excluded.correct;
```

**Rules**
- `correct` is the **0-based index** of the right option (`0`=first, `3`=fourth).
- Exactly **4 options** per question (the format enforces `correct` between 0–3).
- A pack needs **at least 3 questions** to appear on the host picker.
- `position` controls the order (1, 2, 3, …).

### Step 3 — Run the query, then verify

```sql
select p.slug, count(q.id) as questions
from public.quiz_packs p
join public.quiz_questions q on q.pack_slug = p.slug
group by p.slug order by p.slug;
```

### Step 4 — Play it

- Reload the host screen — the new pack appears in **CHOOSE A QUIZ PACK**, or
- Open `https://chrisco-bible-quizzes.vercel.app/host.html?pack=my-new-quiz`.

> Changes are **live immediately** (no redeploy). Pack list is fetched when the
> host screen loads.

---

## 3. Editing / retiring a pack

```sql
-- Fix a question
update public.quiz_questions
set question = 'New wording?', correct = 2
where pack_slug = 'my-new-quiz' and position = 3;

-- Add one more question
insert into public.quiz_questions (pack_slug, position, question, options, correct)
values ('my-new-quiz', 6, 'Bonus question?', '["A","B","C","D"]'::jsonb, 0);

-- Remove a single question
delete from public.quiz_questions where pack_slug = 'my-new-quiz' and position = 6;

-- Retire a whole pack (questions cascade)
delete from public.quiz_packs where slug = 'my-new-quiz';

-- Temporarily hide a pack without deleting it:
-- (rename its slug so it no longer matches demo links)
update public.quiz_packs set slug = 'my-new-quiz-archived'
where slug = 'my-new-quiz';
update public.quiz_questions set pack_slug = 'my-new-quiz-archived'
where pack_slug = 'my-new-quiz';
```

---

## 4. Use-case playbooks

### 🏕️ Youth camp (projector + phones on camp Wi-Fi / hotspot)
1. Laptop → host link → full-screen the browser (F11).
2. Campers join during free time; names appear live in the lobby.
3. Play 1 pack per session (≈5 min each). Reveal screen → discuss the answer
   briefly → **LEADERBOARD** → next.
4. If a camper drops Wi-Fi mid-game: they re-open `player.html` with the same
   PIN — their token restores their score automatically.

### ⛪ Children’s Sunday school (teacher-led)
1. Project the host screen; children answer on **one shared phone per table**
   (or a single classroom tablet if devices are limited).
2. Use the `sunday-school` pack; read questions aloud before starting each one.
3. After each reveal, tell the story behind the answer (30–60 seconds).
4. End with the podium and a small prize for the top scorer.

### 🏫 School / class competition
1. Create a pack per topic (e.g. `grade-4-math`, `kenya-geography`) with the
   SQL template above.
2. Two teams on two rows of phones, or every student for themselves.
3. Use **School & General Knowledge** as the ready-made demo.

### 💼 Business / staff team-building
1. Open `business-brain` at a meeting or conference break-out.
2. Mix tables: one device per table, one spokesperson taps.
3. Create a company-specific pack (products, policies, industry facts) —
   see the template above.

### 🎓 Any other use case
The pattern is the same: **make a pack → share the PIN → play**. Ideas: couples
night, choir tryouts, leadership training, exam revision, Christmas quiz,
aphorisms/proverbs, Kenya history, etc.

---

## 5. Writing good questions

- Keep wording short enough to read from the back of a room (≤ 12 words).
- Make wrong options *plausible* (same category, similar length).
- Mix difficulty: 2 easy, 2 medium, 1 hard keeps everyone engaged.
- Avoid “all of the above” — the speed-scoring makes it confusing.
- Kids’ packs: concrete characters and stories; adults: trivia and detail.

## 6. How it works (for the curious)

```
host.html ──creates──▶ rooms table (4-digit PIN)
   │
   ├─ loads packs from ▶ quiz_packs + quiz_questions
   │
   └─── Supabase Realtime channel room:<PIN> ────▶ player.html
         (Broadcast: question / answer / reveal / final)
```

The **host browser is the source of truth** (clock, scoring, validation);
Postgres stores rooms, rosters, scores and packs; Vercel serves the static
files plus `/api/config`. That is why any pack change is instant — only the
data changes, never the code.
