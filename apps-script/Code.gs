// Bound Google Apps Script for Chrisco_Quiz_Database.
// In Apps Script Project Settings, add Script Properties:
//   GOOGLE_CLIENT_ID = the OAuth Web Client ID used by Google Identity Services
//   HOST_OVERRIDE_ENABLED = false (set true temporarily only for an authorized host override)
//   QUIZ_ANSWER_KEY_JSON = private JSON map, e.g. {"q1":{"correct":0,"explain":"..."}, ...}
// Keep QUIZ_ANSWER_KEY_JSON in Script Properties only; never put correct indexes in public source.
// Deploy as a Web App, execute as the spreadsheet owner, and allow access to anyone.

const SPREADSHEET_ID = '1S0iqP6Rw3jdWoSjlb7_bKdQNYei2pZ5m1jqKa7Oj50Q';
const QUIZ_HEADERS = ['Timestamp', 'Google_Email', 'Nickname', 'Score', 'Answers'];
const QUIZ_QUESTIONS = [
  {id:"q1", level:"Beginner", type:"multiple-choice", timestamp:"02:19–03:44", timestampSeconds:139, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"Isaiah 61:1–3 introduces the image of “beauty for ashes.” A friend assumes every painful loss must be reversed quickly. Which response best reflects the passage?", options:["Treat the promise as a guarantee that every external loss will reverse quickly, and defer practical action until then.", "Read the passage as hope for the brokenhearted and freedom for captives, then ask how its truth speaks to the situation.", "Read the text as comfort for grief, but not as guidance about the freedom or truth it also names.", "Use present hardship alone to identify a specific spiritual cause before checking the facts or seeking wise counsel."]},
  {id:"q2", level:"Beginner", type:"true-false", timestamp:"02:51–04:11", timestampSeconds:171, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"TRUE OR FALSE: The teaching links Jesus’ promise that truth sets people free to Hosea’s warning about lack of knowledge, and invites listeners to compare Scripture with their own situation.", options:["True", "False"]},
  {id:"q3", level:"Beginner", type:"multiple-choice", timestamp:"04:14–06:42", timestampSeconds:254, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"Genesis calls creation “very good,” while people still ask, “Why am I going through this?” Which conclusion best reflects that contrast without claiming more than the passage establishes?", options:["Read “very good” as evidence that current suffering is unreal or should simply be dismissed.", "Use the original good creation to assume every setback has the same cause as Cain’s wrongdoing.", "The contrast invites people to seek truth about their situation and intended good, instead of treating distress as their identity.", "Use Genesis 1:31 to measure a person’s faith by their current health, comfort, or income."]},
  {id:"q4", level:"Intermediate", type:"true-false", timestamp:"07:30–08:40", timestampSeconds:450, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"TRUE OR FALSE: Jesus’ listeners in John 8 were already believers; the conversation about freedom therefore goes beyond political captivity and turns to slavery to sin.", options:["True", "False"]},
  {id:"q5", level:"Intermediate", type:"multiple-choice", timestamp:"19:42–21:14", timestampSeconds:1182, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"You realize that a lie you told has harmed someone and damaged trust. Which response best applies the teaching’s contrast between truth and lies while taking responsibility for the real harm?", options:["Explain the pressure behind the lie first, and let the harmed person decide whether your story needs correcting.", "Offer an apology, but avoid naming the lie if doing so might make the relationship more difficult.", "Tell the truth, acknowledge the harm, seek forgiveness, and make appropriate repairs without demanding instant trust.", "Publish every detail to demonstrate transparency, without considering the affected person’s privacy."]},
  {id:"q6", level:"Intermediate", type:"true-false", timestamp:"22:29–23:17", timestampSeconds:1349, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"TRUE OR FALSE: In the account of Cain, the warning that sin was at the door came after Cain murdered Abel, leaving him no opportunity to master it.", options:["True", "False"]},
  {id:"q7", level:"Intermediate", type:"multiple-choice", timestamp:"14:41–15:32", timestampSeconds:881, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"A friend says they are carrying a heavy burden alone and do not know what to do next. What response best echoes Jesus’ invitation in Matthew 11:28?", options:["Offer to listen, encourage them to bring the burden to Jesus, and ask what practical support would help now.", "Promise a timeline for relief so their hope stays strong.", "Tell them carrying the burden quietly is part of faithful endurance; do not involve anyone else.", "Give advice before listening, because action is more useful than acknowledging how heavy it feels."]},
  {id:"q8", level:"Advanced", type:"true-false", timestamp:"39:04–40:44", timestampSeconds:2344, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"TRUE OR FALSE: The teaching’s framework from John 10:10 and later examples names sin, curse or judgment, and demonic possession or oppression as three avenues of destruction.", options:["True", "False"]},
  {id:"q9", level:"Advanced", type:"multiple-choice", timestamp:"41:59–43:18", timestampSeconds:2519, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"Someone says an addiction feels stronger than their intention to stop, and they are ashamed to tell anyone. Which response applies the teaching about bondage while responding responsibly to the person in front of you?", options:["Assure them that willpower alone is the answer and encourage them to keep the struggle private until they succeed.", "Offer spiritual support but discourage professional assessment because the issue is only spiritual.", "Listen without shaming them, encourage trusted spiritual support and qualified professional help, and agree on a safe next step.", "Make continued support conditional on the person stopping immediately and never relapsing."]},
  {id:"q10", level:"Advanced", type:"true-false", timestamp:"31:51–37:14", timestampSeconds:1911, videoUrl:"https://youtu.be/aDLRHK2GO6k?si=rMwSlEZ_RU1UafPN", q:"TRUE OR FALSE: The serpent first contradicted God’s instruction openly, before asking Eve a question about it.", options:["True", "False"]}
];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'status';
    // Public ranking rows contain nicknames and scores only; never expose email addresses or answer choices.
    if (action === 'leaderboard') return output_({ ok:true, rankings:getPublicLeaderboard_() }, params.callback);
    const email = verifyGoogleIdToken_(params.id_token);
    const sheet = getResultsSheet_();
    const existing = findLatestSubmission_(sheet, email);
    const overrideActive = isHostOverrideActive_();

    if (action === 'status') {
      getQuizAnswerKey_(); // Fail fast before a player starts if the private key is not configured.
      return output_( {
        ok: true,
        email: email,
        completed: !!existing,
        canPlay: overrideActive || !existing,
        hostOverride: overrideActive,
        savedProgress: getPlayerProgress_(email)
      }, params.callback);
    }

    if (action === 'result') {
      if (!existing) return output_({ ok: true, completed: false }, params.callback);
      const stored = storedAnswers_(existing[4]);
      if (!params.submission_id || stored.submissionId !== params.submission_id) {
        return output_({ ok: true, completed: false, alreadyCompleted: true }, params.callback);
      }
      return output_({
        ok: true,
        completed: true,
        nickname: existing[2],
        score: Number(existing[3]) || 0,
        total: QUIZ_QUESTIONS.length,
        elapsedSeconds: Number(existing[5]) || 0,
        answers: storedAnswers_(existing[4]).answers || [],
        answerKey: publicAnswerKey_()
      }, params.callback);
    }

    return output_({ ok: false, error: 'Unknown action.' }, params.callback);
  } catch (err) {
    return output_({ ok: false, error: safeMessage_(err) }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = readPostBody_(e);
    const email = verifyGoogleIdToken_(body.id_token);
    const action = String(body.action || 'submit');
    if (action === 'join' || action === 'progress' || action === 'clearProgress') {
      lock.waitLock(30000);
      try {
        if (action === 'join') upsertPlayerProgress_(email, '', 0, [], 0, 'joined');
        if (action === 'clearProgress') upsertPlayerProgress_(email, String(body.nickname || ''), 0, [], 0, 'joined');
        if (action === 'progress') {
          const nicknameValue = String(body.nickname || '').trim();
          if (!nicknameValue || nicknameValue.length > 40) throw new Error('Enter a nickname between 1 and 40 characters.');
          const savedAnswers = validateAnswersForProgress_(body.answers);
          const current = Math.max(0, Math.min(QUIZ_QUESTIONS.length - 1, Number(body.current) || 0));
          const elapsed = Math.max(0, Math.floor(Number(body.elapsed_seconds) || 0));
          upsertPlayerProgress_(email, nicknameValue, current, savedAnswers, elapsed, 'in_progress');
        }
        return output_({ok:true});
      } finally { lock.releaseLock(); }
    }
    const nickname = String(body.nickname || '').trim();
    if (!nickname || nickname.length > 40) throw new Error('Enter a nickname between 1 and 40 characters.');
    const answers = validateAnswers_(body.answers);
    const submissionId = String(body.submissionId || '');
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(submissionId)) throw new Error('The submission identifier is invalid.');
    const overrideActive = isHostOverrideActive_();

    lock.waitLock(30000);
    try {
      const sheet = getResultsSheet_();
      const existing = findLatestSubmission_(sheet, email);
      if (existing && !overrideActive) {
        return output_({ ok: false, alreadyCompleted: true, error: 'You have already completed this quiz. Retries are not allowed.' });
      }
      const answerKey = getQuizAnswerKey_();
      const score = answers.reduce((sum, answer, index) => sum + (answer.selectedIndex === answerKey[QUIZ_QUESTIONS[index].id].correct ? 1 : 0), 0);
      const elapsedSeconds = Math.max(0, Math.floor(Number(body.elapsed_seconds) || 0));
      sheet.getRange(1, 6).setValue('Elapsed_Seconds');
      sheet.appendRow([new Date(), email, nickname, score, JSON.stringify({ submissionId: submissionId, answers: answers }), elapsedSeconds]);
      upsertPlayerProgress_(email, nickname, QUIZ_QUESTIONS.length - 1, answers.map(answer => answer.selectedIndex), elapsedSeconds, 'completed');
      SpreadsheetApp.flush();
      notifyQuizHosts_(nickname, score, answers, elapsedSeconds);
      return output_({ ok: true, completed: true, score: score, total: QUIZ_QUESTIONS.length });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return output_({ ok: false, error: safeMessage_(err) });
  }
}

function getPlayerProgressSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Player Progress');
  const headers = ['Joined_At', 'Google_Email', 'Quiz', 'Nickname', 'Current_Question', 'Answers_JSON', 'Elapsed_Seconds', 'Status', 'Updated_At'];
  if (!sheet) { sheet = ss.insertSheet('Player Progress'); sheet.appendRow(headers); }
  else if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}
function getPlayerProgress_(email) {
  const sheet = getPlayerProgressSheet_(), last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, 9).getValues();
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][1] || '').toLowerCase() === email.toLowerCase() && rows[i][2] === 'Beauty for Ashes: Put It Into Practice' && rows[i][7] !== 'completed') {
    return {nickname:String(rows[i][3] || ''), current:Number(rows[i][4]) || 0, answers:parseJson_(rows[i][5], []), elapsedSeconds:Number(rows[i][6]) || 0, savedAt:rows[i][8] instanceof Date ? rows[i][8].getTime() : Date.now()};
  }
  return null;
}
function upsertPlayerProgress_(email, nickname, current, answers, elapsed, status) {
  const sheet = getPlayerProgressSheet_(), quiz = 'Beauty for Ashes: Put It Into Practice', last = sheet.getLastRow();
  const rows = last < 2 ? [] : sheet.getRange(2, 1, last - 1, 9).getValues();
  let rowNumber = 0;
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][1] || '').toLowerCase() === email.toLowerCase() && rows[i][2] === quiz) { rowNumber = i + 2; break; }
  const now = new Date(), joinedAt = rowNumber ? sheet.getRange(rowNumber, 1).getValue() : now;
  const values = [joinedAt, email, quiz, nickname, current, JSON.stringify(answers), elapsed, status, now];
  if (rowNumber) sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]); else sheet.appendRow(values);
}
function validateAnswersForProgress_(answers) {
  if (!Array.isArray(answers) || answers.length !== QUIZ_QUESTIONS.length) return Array(QUIZ_QUESTIONS.length).fill(null);
  return answers.map((value, index) => Number.isInteger(value) && value >= 0 && value < QUIZ_QUESTIONS[index].options.length ? value : null);
}
function formatElapsedSeconds_(seconds) {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h ? h + 'h ' + m + 'm ' + s + 's' : m ? m + 'm ' + s + 's' : s + 's';
}

function getResultsSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName('Quiz Results') || spreadsheet.getSheets()[0];
  if (!sheet) throw new Error('The results sheet was not found.');
  if (sheet.getLastRow() === 0) sheet.appendRow(QUIZ_HEADERS);
  const actualHeaders = sheet.getRange(1, 1, 1, QUIZ_HEADERS.length).getDisplayValues()[0];
  if (QUIZ_HEADERS.some((header, index) => actualHeaders[index] !== header)) {
    throw new Error('The first row must contain: ' + QUIZ_HEADERS.join(', '));
  }
  if (sheet.getRange(1, 6).getDisplayValue() !== 'Elapsed_Seconds') sheet.getRange(1, 6).setValue('Elapsed_Seconds');
  return sheet;
}

function findLatestSubmission_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const normalized = email.toLowerCase();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1] || '').trim().toLowerCase() === normalized) return rows[i];
  }
  return null;
}

function getPublicLeaderboard_() {
  const sheet = getResultsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, QUIZ_HEADERS.length).getValues();
  // Keep only each player's latest permitted entry; email is used for deduplication and never returned.
  const latestByEmail = new Map();
  rows.forEach(row => {
    const email = String(row[1] || '').trim().toLowerCase();
    const nickname = String(row[2] || '').trim();
    if (email && nickname) latestByEmail.set(email, { nickname:nickname, score:Number(row[3])||0, timestamp:row[0] instanceof Date ? row[0].getTime() : new Date(row[0]).getTime()||0 });
  });
  return Array.from(latestByEmail.values())
    .sort((a,b) => b.score-a.score || a.timestamp-b.timestamp)
    .slice(0,10)
    .map(row => ({ nickname:row.nickname, score:row.score, total:QUIZ_QUESTIONS.length }));
}

function notifyQuizHosts_(nickname, score, answers, elapsedSeconds) {
  const recipients = String(PropertiesService.getScriptProperties().getProperty('QUIZ_HOST_EMAILS') || '')
    .split(',').map(email => email.trim()).filter(email => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email));
  if (!recipients.length) return;
  try {
    const answerKey = getQuizAnswerKey_();
    const lines = ['Player: ' + nickname, 'Score: ' + score + ' / ' + QUIZ_QUESTIONS.length, 'Total time: ' + formatElapsedSeconds_(elapsedSeconds), '', 'Answer-by-answer review:'];
    QUIZ_QUESTIONS.forEach((question, index) => {
      const selected = answers[index].selectedIndex;
      lines.push((index+1) + '. ' + question.q);
      lines.push('Player chose: ' + question.options[selected]);
      lines.push('Correct answer: ' + question.options[answerKey[question.id].correct]);
      lines.push('Explanation: ' + (answerKey[question.id].explain || ''));
      lines.push('');
    });
    MailApp.sendEmail({to:recipients.join(','),subject:'Beauty for Ashes quiz result: ' + score + ' / ' + QUIZ_QUESTIONS.length + ' — ' + nickname,body:lines.join('\n')});
  } catch (error) {
    console.error('Quiz host notification failed: ' + safeMessage_(error));
  }
}

function verifyGoogleIdToken_(idToken) {
  if (!idToken || typeof idToken !== 'string') throw new Error('Sign in with Google before continuing.');
  const clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) throw new Error('The Apps Script GOOGLE_CLIENT_ID property is not configured.');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Google sign-in could not be verified. Please sign in again.');
  const claims = JSON.parse(response.getContentText());
  const issuer = String(claims.iss || '');
  const expiresAt = Number(claims.exp || 0);
  const verified = claims.email_verified === true || String(claims.email_verified).toLowerCase() === 'true';
  if (claims.aud !== clientId || !/^(https:\/\/)?accounts\.google\.com$/.test(issuer) || expiresAt * 1000 <= Date.now() || !verified || !claims.email) {
    throw new Error('Google identity verification failed. Please sign in again.');
  }
  return String(claims.email).trim().toLowerCase();
}

function validateAnswers_(answers) {
  if (!Array.isArray(answers) || answers.length !== QUIZ_QUESTIONS.length) throw new Error('Submit an answer for every question.');
  return QUIZ_QUESTIONS.map((question, index) => {
    const submitted = answers[index];
    if (!submitted || submitted.questionId !== question.id || !Number.isInteger(submitted.selectedIndex) || submitted.selectedIndex < 0 || submitted.selectedIndex >= question.options.length) {
      throw new Error('The submitted answers are incomplete or invalid.');
    }
    return { questionId: question.id, selectedIndex: submitted.selectedIndex };
  });
}

function getQuizAnswerKey_() {
  const raw = PropertiesService.getScriptProperties().getProperty('QUIZ_ANSWER_KEY_JSON');
  if (!raw) throw new Error('The private QUIZ_ANSWER_KEY_JSON script property is not configured.');
  const answerKey = JSON.parse(raw);
  QUIZ_QUESTIONS.forEach(question => {
    const entry = answerKey[question.id];
    if (!entry || !Number.isInteger(entry.correct) || entry.correct < 0 || entry.correct >= question.options.length) {
      throw new Error('The private answer key is missing or invalid for ' + question.id + '.');
    }
  });
  return answerKey;
}

function publicAnswerKey_() {
  const answerKey = getQuizAnswerKey_();
  return QUIZ_QUESTIONS.map(question => ({
    id: question.id,
    level: question.level,
    type: question.type,
    timestamp: question.timestamp,
    timestampSeconds: question.timestampSeconds,
    videoUrl: question.videoUrl,
    q: question.q,
    options: question.options,
    correct: answerKey[question.id].correct,
    explain: answerKey[question.id].explain || ''
  }));
}

function readPostBody_(e) {
  const raw = e && e.parameter && e.parameter.payload
    ? e.parameter.payload
    : (e && e.postData && e.postData.contents ? e.postData.contents : '');
  if (!raw) throw new Error('The submission body is empty.');
  return JSON.parse(raw);
}

function isHostOverrideActive_() {
  return PropertiesService.getScriptProperties().getProperty('HOST_OVERRIDE_ENABLED') === 'true';
}

function parseJson_(value, fallback) {
  try { return JSON.parse(String(value || '')); } catch (_) { return fallback; }
}

function storedAnswers_(value) {
  const parsed = parseJson_(value, {});
  return Array.isArray(parsed) ? { answers: parsed } : parsed;
}

function output_(data, callback) {
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function safeMessage_(error) {
  return error && error.message ? error.message : 'The request could not be completed.';
}
