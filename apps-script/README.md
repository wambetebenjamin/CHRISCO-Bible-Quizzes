# Google Sheets quiz backend setup

The result spreadsheet is **Chrisco_Quiz_Database** in the connected Drive. Its private `Quiz Results` tab has the required columns: `Timestamp`, `Google_Email`, `Nickname`, `Score`, and `Answers`.

## Deploy the bound Apps Script

1. Open [Chrisco_Quiz_Database](https://docs.google.com/spreadsheets/d/1S0iqP6Rw3jdWoSjlb7_bKdQNYei2pZ5m1jqKa7Oj50Q/edit).
2. Choose **Extensions → Apps Script** and replace the editor contents with `Code.gs` from this folder.
3. In **Project Settings → Script Properties**, add:
   - `GOOGLE_CLIENT_ID`: the OAuth Web Client ID used by Google Identity Services.
   - `HOST_OVERRIDE_ENABLED`: `false` (set `true` temporarily only when an authorized host is allowing a retry).
   - `QUIZ_ANSWER_KEY_JSON`: private JSON keyed by question IDs, with each entry containing its zero-based `correct` option index and optional `explain` text. Keep this value in Script Properties; do not put the correct indexes in public source or the browser.
   - `QUIZ_HOST_EMAILS` (optional): comma-separated host email addresses. After each submitted quiz, the host receives that player's score, selected answers, correct answers, and explanations by email. Authorize the additional MailApp permission when redeploying.
4. In Google Cloud Console, create a Web application OAuth client and add the production site origin to its authorized JavaScript origins. Put the same public Client ID in `GOOGLE_CLIENT_ID` in `public/player.html` and in Apps Script Script Properties.
5. In Apps Script, choose **Deploy → New deployment → Web app**, select **Execute as me**, and set access to **Anyone**. Authorize the script's spreadsheet and URL-fetch permissions. For updates after the first deploy, choose **Deploy → Manage deployments → Edit**, select **New version**, then deploy so the existing `/exec` URL serves the updated code. If using `QUIZ_HOST_EMAILS`, approve the MailApp permission when prompted.
6. Copy the deployed URL ending in `/exec` into `APPS_SCRIPT_URL` in `public/player.html`.
7. Test sign-in, the duplicate check, a submission, and result review from the Vercel origin before announcing the quiz.

The Apps Script verifies the Google ID token and its audience server-side, grades answers server-side, uses a script lock to block concurrent duplicate submissions, and only returns the answer key after a confirmed write. The sheet is not publicly shared. The browser uses JSONP for authenticated GETs and a simple `text/plain` POST followed by an authenticated result readback to avoid a cross-origin preflight.

## Question source

The frontend, Apps Script, and live host quiz contain the same ten transcript-based questions, sequenced Beginner (q1–q3), Intermediate (q4–q7), then Advanced (q8–q10). They mix scenario-based multiple choice with True/False checks. A single attribution banner credits Presbyter David Kirui’s first YouTube episode, and each item links to the supplied teaching at its transcript timestamp. Correct answers and explanations remain hidden until the end review. The dashboard leaderboard exposes nicknames and scores only; it never returns emails or answer selections. The host email notification uses `QUIZ_HOST_EMAILS` and is sent after a player's completed submission.
