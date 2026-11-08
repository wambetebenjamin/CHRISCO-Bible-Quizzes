# Google Sheets quiz backend setup

The result spreadsheet is **Chrisco_Quiz_Database** in the connected Drive. Its private `Quiz Results` tab has the required columns: `Timestamp`, `Google_Email`, `Nickname`, `Score`, and `Answers`.

## Deploy the bound Apps Script

1. Open [Chrisco_Quiz_Database](https://docs.google.com/spreadsheets/d/1S0iqP6Rw3jdWoSjlb7_bKdQNYei2pZ5m1jqKa7Oj50Q/edit).
2. Choose **Extensions → Apps Script** and replace the editor contents with `Code.gs` from this folder.
3. In **Project Settings → Script Properties**, add:
   - `GOOGLE_CLIENT_ID`: the OAuth Web Client ID used by Google Identity Services.
   - `HOST_OVERRIDE_ENABLED`: `false` (set `true` temporarily only when an authorized host is allowing a retry).
   - `QUIZ_ANSWER_KEY_JSON`: private JSON keyed by question IDs, with each entry containing its zero-based `correct` option index and optional `explain` text. Keep this value in Script Properties; do not put the correct indexes in public source or the browser.
4. In Google Cloud Console, create a Web application OAuth client and add the production site origin to its authorized JavaScript origins. Put the same public Client ID in `GOOGLE_CLIENT_ID` in `public/player.html` and in Apps Script Script Properties.
5. In Apps Script, choose **Deploy → New deployment → Web app**, select **Execute as me**, and set access to **Anyone**. Authorize the script's spreadsheet and URL-fetch permissions.
6. Copy the deployed URL ending in `/exec` into `APPS_SCRIPT_URL` in `public/player.html`.
7. Test sign-in, the duplicate check, a submission, and result review from the Vercel origin before announcing the quiz.

The Apps Script verifies the Google ID token and its audience server-side, grades answers server-side, uses a script lock to block concurrent duplicate submissions, and only returns the answer key after a confirmed write. The sheet is not publicly shared. The browser uses JSONP for authenticated GETs and a simple `text/plain` POST followed by an authenticated result readback to avoid a cross-origin preflight.

## Question source

No YouTube URL or extracted YouTube question set was present in the repository or request context. The frontend and Apps Script therefore contain a small set of starter Bible questions. Replace the question text/options in both files with the approved video quiz, keeping IDs and ordering identical, and set the matching correct indexes privately in `QUIZ_ANSWER_KEY_JSON`.
