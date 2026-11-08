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
  { id:'q1', level:"Beginner", q:"You are going through a painful season and wonder whether you are meant to stay stuck there. Which response best reflects the speaker’s teaching?", options:["Assume the hardship proves God wants you to remain there", "Search Scripture for truth, seek wise support, and take a constructive next step", "Ignore the problem because faith means never discussing it", "Blame yourself automatically for every difficult thing that happens"] },
  { id:'q2', level:"Beginner", q:"A believer has attended church for years but still feels controlled by a destructive habit. What does the teaching suggest is a useful first move?", options:["Pretend the habit is harmless so nobody worries", "Wait for someone else to notice and fix it", "Bring the pattern into the light, learn what Scripture says, and seek accountable help", "Conclude that knowing religious language means no further growth is needed"] },
  { id:'q3', level:"Beginner", q:"Someone tells you that a choice against a clear boundary will have no consequences. Which response best applies the Genesis 3 example?", options:["Accept the reassurance because it sounds appealing", "Pause, test the claim against what you know is true, and step away from the temptation", "Keep discussing it until the boundary feels unnecessary", "Make the choice privately so nobody can advise you"] },
  { id:'q4', level:"Intermediate", q:"You feel resentment growing toward a colleague and are tempted to retaliate. What is the closest application of God’s warning to Cain?", options:["Hide the resentment and wait for it to disappear", "Act quickly before the other person notices", "Recognize the danger early, master the impulse, and choose a right response", "Tell yourself anger makes any response acceptable"] },
  { id:'q5', level:"Intermediate", q:"After making a serious mistake, you are tempted to lie so you can avoid embarrassment. What response best matches the talk about truth?", options:["Tell the truth, accept responsibility, and make amends where possible", "Create a more convincing story and ask others to repeat it", "Stay silent while allowing another person to take the blame", "Say that honesty matters only when there are no consequences"] },
  { id:'q6', level:"Intermediate", q:"A person’s harmful choice has hurt someone and damaged trust. What is the most responsible application of the Cain story?", options:["Assume the harm will disappear if it is never discussed", "Blame the person who was hurt for reacting", "Treat the choice as unimportant because forgiveness exists", "Acknowledge the action, seek forgiveness, repair what can be repaired, and accept fair consequences"] },
  { id:'q7', level:"Intermediate", q:"A friend says they are carrying a burden alone and feel exhausted. Which response best reflects the invitation quoted in the program?", options:["Tell them that strong people should manage alone", "Encourage them to come to Jesus for rest and offer caring, practical support", "Tell them their grief proves they lack faith", "Change the subject so they stop talking about it"] },
  { id:'q8', level:"Advanced", q:"Someone is grieving and feels overwhelmed. How could you put Isaiah 61’s comfort into practice?", options:["Demand that they praise immediately and stop mourning", "Tell them their grief is inconvenient for others", "Listen without dismissing their pain and offer steady, practical care", "Promise that every loss will be reversed by tomorrow"] },
  { id:'q9', level:"Advanced", q:"A person wants to stop an addiction but keeps returning to it and feels unable to cope alone. What is the wisest next step?", options:["Hide it and rely only on willpower", "Shame them until they promise to stop", "Tell them relapse proves they cannot change", "Seek trusted pastoral and professional support, build accountability, and take a safe next step"] },
  { id:'q10', level:"Advanced", q:"You are facing illness and financial strain at the same time. Which response applies the message without making assumptions about the cause?", options:["Seek appropriate medical and practical help, explore Scripture and trusted support, and avoid blaming yourself without evidence", "Assume the hardship proves you are cursed", "Stop medical care and wait for a miracle", "Assume every setback means you have failed spiritually"] }
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
        hostOverride: overrideActive
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
      sheet.appendRow([new Date(), email, nickname, score, JSON.stringify({ submissionId: submissionId, answers: answers })]);
      SpreadsheetApp.flush();
      notifyQuizHosts_(nickname, score, answers);
      return output_({ ok: true, completed: true, score: score, total: QUIZ_QUESTIONS.length });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return output_({ ok: false, error: safeMessage_(err) });
  }
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
  return sheet;
}

function findLatestSubmission_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, QUIZ_HEADERS.length).getValues();
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

function notifyQuizHosts_(nickname, score, answers) {
  const recipients = String(PropertiesService.getScriptProperties().getProperty('QUIZ_HOST_EMAILS') || '')
    .split(',').map(email => email.trim()).filter(email => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email));
  if (!recipients.length) return;
  try {
    const answerKey = getQuizAnswerKey_();
    const lines = ['Player: ' + nickname, 'Score: ' + score + ' / ' + QUIZ_QUESTIONS.length, '', 'Answer-by-answer review:'];
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
