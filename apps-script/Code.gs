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
  {
    id: 'q1',
    q: 'Who built an ark before the great flood?',
    options: ['Moses', 'Noah', 'David', 'Solomon']
  },
  {
    id: 'q2',
    q: 'What did David use to strike Goliath?',
    options: ['A spear', 'A bow', 'A sling and a stone', 'A sword']
  },
  {
    id: 'q3',
    q: 'Which city’s walls fell after the Israelites marched around them?',
    options: ['Jerusalem', 'Bethlehem', 'Jericho', 'Nazareth']
  },
  {
    id: 'q4',
    q: 'Who was thrown into the lions’ den?',
    options: ['Daniel', 'Joseph', 'Samuel', 'Elijah']
  },
  {
    id: 'q5',
    q: 'Which disciple denied knowing Jesus three times?',
    options: ['John', 'Thomas', 'Peter', 'Andrew']
  }
];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const email = verifyGoogleIdToken_(params.id_token);
    const sheet = getResultsSheet_();
    const existing = findLatestSubmission_(sheet, email);
    const overrideActive = isHostOverrideActive_();
    const action = params.action || 'status';

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
