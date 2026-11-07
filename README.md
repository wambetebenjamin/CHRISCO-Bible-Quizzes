# CHRISCO Bible Quizzes

A live Bible quiz site themed around 1 Samuel 30:8, with real Supabase Realtime multiplayer and a persistent Node auto host for Beauty for Ashes.

## Local development

```sh
npm ci
npm start
```

The app is served from `public/` on `http://localhost:3000`. Without environment configuration, the static quiz still serves, but the persistent auto host is disabled and Mongo backed camp and combat endpoints return `503`.

Copy `.env.example` to `.env` and set:

* `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the persistent Realtime host.
* `MONGODB_URI` for persistent camp upgrades and pursuit action records.
* `CORS_ORIGIN` to a comma separated allowlist of trusted website origins.
* `PORT` is supplied by Render in production.

The browser client only uses the public Supabase anon key. Never put a Supabase service role key in frontend code.

## Always on Render deployment

The repository includes `render.yaml`. Create a Render Blueprint from this repository and configure the secret environment values in the Render dashboard. The blueprint uses a paid always on web service, runs `npm ci && npm run build`, starts with `npm start`, and checks `/api/health`.

The persistent worker joins the `global-lobby` Supabase Realtime channel, advertises a public Beauty for Ashes room at persistent PIN 777777, starts a ten question game when players join, handles answers and advancement, and keeps the room listed for the next round. State for scores and round timers lives in the worker process for the current round; the process restarts automatically if it exits. The quiz room is hosted by this server, not by a visitor's homepage tab.

The MongoDB URI is required for the `/api/camp/upgrade` and `/api/combat/pursue` endpoints. They persist changes and action records in MongoDB. These Unity oriented endpoints are a starting data API and should be combined with authenticated player identities and authorization before use with valuable player inventories.

## Hosting providers

* Render runs the persistent Node process and serves the site files from `public/`.
* Vercel remains configured for static hosting from `public/` and the existing serverless `/api` functions.
* Supabase Realtime transports lobby and live quiz events.
* MongoDB stores camp and combat API data.

The home, host, and player pages are in `public/`. Images, question data, the local Supabase client, and language resources are also served from that folder.
