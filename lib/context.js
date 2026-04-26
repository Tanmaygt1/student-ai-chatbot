/**
 * context.js
 * -----------
 * Session-based conversation context management for VIT Chatbot.
 * Handles: session store, pending context, topic/course detection, intent detection.
 * 
 * Author: Tanmay
 */

// ── In-memory session store ──────────────────────────────
// Maps sessionId → session object
// In production you'd use Redis or a DB
const sessions = new Map();
const MAX_HISTORY = 16;

// ── Session Management ───────────────────────────────────

export function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      history: [],
      pendingTopic: null,
      pendingDept: null,
      turnCount: 0,
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }
  const s = sessions.get(sessionId);
  s.lastActive = Date.now();
  return s;
}

export function addMessage(sessionId, role, content) {
  const session = getOrCreateSession(sessionId);
  session.history.push({ role, content });
  session.turnCount++;
  // Keep history bounded
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
}

export function getHistoryForAPI(sessionId) {
  const session = getOrCreateSession(sessionId);
  return session.history.map(({ role, content }) => ({ role, content }));
}

export function setPendingContext(sessionId, { topic, dept } = {}) {
  const session = getOrCreateSession(sessionId);
  if (topic !== undefined) session.pendingTopic = topic;
  if (dept !== undefined) session.pendingDept = dept;
}

export function getPendingContext(sessionId) {
  const session = getOrCreateSession(sessionId);
  return { topic: session.pendingTopic, dept: session.pendingDept };
}

export function clearPendingContext(sessionId) {
  const session = getOrCreateSession(sessionId);
  session.pendingTopic = null;
  session.pendingDept = null;
}

export function clearSession(sessionId) {
  sessions.delete(sessionId);
}

export function getSessionSummary(sessionId) {
  const session = getOrCreateSession(sessionId);
  return {
    turnCount: session.turnCount,
    pendingTopic: session.pendingTopic,
    pendingDept: session.pendingDept,
    messageCount: session.history.length
  };
}

// ── Intent Detection ─────────────────────────────────────

const TOPIC_KEYWORDS = {
  fees:        ['fee', 'fees', 'cost', 'tuition', 'charges', 'price', 'money', 'pay', 'expensive', 'how much'],
  admissions:  ['admission', 'apply', 'application', 'eligibility', 'cutoff', 'cap', 'cet', 'jee', 'document', 'merit', 'intake'],
  placements:  ['placement', 'job', 'salary', 'package', 'lpa', 'recruit', 'company', 'campus', 'tpo', 'hiring'],
  departments: ['department', 'departments', 'branch', 'branches', 'course', 'courses', 'program', 'programs', 'stream', 'btech', 'b.tech', 'engineering college', 'what do you offer', 'what can i study'],
  faculty:     ['faculty', 'teacher', 'professor', 'hod', 'staff', 'lecturer', 'who teaches'],
  timetable:   ['timetable', 'time table', 'schedule', 'class timing', 'lecture time', 'when is class', 'period'],
  exams:       ['exam', 'examination', 'test', 'result', 'marks', 'grade', 'end sem', 'mid sem', 'practical exam', 'viva'],
  seda:        ['seda', 'dsy', 'direct second year', 'lateral entry', 'lateral admission', 'diploma admission', 'direct admission', 'second year admission', 'diploma to btech', 'diploma holder'],
  pg:          ['mtech', 'm.tech', 'mca', 'phd', 'ph.d', 'postgraduate', 'post graduate', 'pg program', 'masters'],
  cutoffs:     ['cutoff', 'cut off', 'cut-off', 'percentile', 'merit list', 'closing rank', 'opening rank', 'cet score needed'],
  hostel:      ['hostel', 'accommodation', 'stay', 'dormitory', 'room', 'mess'],
  facilities:  ['library', 'canteen', 'sports', 'gym', 'wifi', 'transport', 'bus', 'facility', 'lab', 'infrastructure'],
  contact:     ['contact', 'address', 'phone', 'email', 'where is', 'location', 'how to reach', 'office'],
  rankings:    ['rank', 'ranking', 'nirf', 'naac', 'accreditation', 'rating', 'recognition'],
  research:    ['research', 'project', 'publication', 'paper', 'phd', 'internship'],
  international: ['international', 'foreign', 'abroad', 'exchange', 'overseas', 'mou', 'global', 'internship abroad', 'student exchange', 'ntu', 'purdue', 'penn state']
};

const DEPT_KEYWORDS = {
  'computer engineering':                          ['computer engineering', 'comp eng', 'cse', 'computer science'],
  'computer engineering (software engineering)':   ['software engineering', 'ce-se', 'software eng'],
  'computer science and engineering (ai)':         ['cse ai', 'cs ai', 'cse-ai'],
  'computer science and engineering (ai & ml)':    ['ai ml', 'aiml', 'cse aiml', 'machine learning'],
  'computer science and engineering (data science)':['data science', 'cs ds', 'cse data'],
  'computer science and engineering (iot and cyber security)': ['iot', 'cyber security', 'blockchain', 'cse iot'],
  'artificial intelligence and data science':      ['aids', 'ai and data science', 'artificial intelligence and data'],
  'information technology':                        ['information technology', 'b.tech it', 'btech it'],
  'electronics and telecommunication':             ['electronics and telecommunication', 'electronics', 'entc', 'e&tc', 'telecommunication'],
  'mechanical engineering':                        ['mechanical engineering', 'mechanical', 'mech'],
  'civil engineering':                             ['civil engineering', 'civil'],
  'chemical engineering':                          ['chemical engineering', 'chemical'],
  'instrumentation engineering':                   ['instrumentation engineering', 'instrumentation'],
  'engineering science and humanities':            ['desh', 'engineering science', 'humanities', 'engineering sciences and humanities', 'engineering science & humanities'],
};

export function detectTopic(text) {
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return topic;
  }
  return null;
}

export function detectDept(text) {
  const lower = text.toLowerCase();
  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
    if (keywords.some(kw => {
      // Use word-boundary check: keyword must not be surrounded by letters
      // This prevents 'it' matching 'what', 'mech' matching 'mechanics' etc.
      const idx = lower.indexOf(kw);
      if (idx === -1) return false;
      const before = idx === 0 || /[\s,.()/\-]/.test(lower[idx - 1]);
      const after  = (idx + kw.length) === lower.length || /[\s,.()/\-?!]/.test(lower[idx + kw.length]);
      return before && after;
    })) return dept;
  }
  return null;
}

export function isGreeting(text) {
  return /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|howdy|sup)\b/i.test(text.trim());
}

export function isThanks(text) {
  return /thank(s| you)|thnx|thx|appreciate/i.test(text);
}
