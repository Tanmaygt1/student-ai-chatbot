/**
 * app/api/chat/route.js
 * ---------------------
 * Main chat endpoint. Handles student queries, context management,
 * VIT data lookup, AI integration, and fallback responses.
 * 
 * POST /api/chat
 * Body: { message: string, sessionId: string }
 * 
 * Author: Tanmay
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAIResponse } from '../../../lib/ai_client.js';
import {
  getOrCreateSession, addMessage, getHistoryForAPI,
  setPendingContext, getPendingContext, clearPendingContext,
  clearSession, getSessionSummary,
  detectTopic, detectDept, isGreeting, isThanks
} from '../../../lib/context.js';

// Load VIT knowledge base (once at startup)
let VIT_DATA;
try {
  const dataPath = join(process.cwd(), 'lib', 'data.json');
  VIT_DATA = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log('[VIT Chat] Knowledge base loaded:', VIT_DATA.college.name);
} catch (e) {
  console.error('[VIT Chat] Failed to load data.json:', e.message);
  VIT_DATA = { college: { name: 'VIT Pune' }, departments: {}, placements: {} };
}

// ── Fetch relevant data slice for a query ──────────────────
function getRelevantData(topic, dept) {
  const out = {};
  if (!topic) {
    out.college_overview = VIT_DATA.college;
    return out;
  }

  switch (topic) {
    case 'fees':
      out.fees = VIT_DATA.fees;
      if (dept && VIT_DATA.departments[dept]) {
        out.department = {
          name: VIT_DATA.departments[dept].full_name,
          seats: VIT_DATA.departments[dept].seats,
          duration: VIT_DATA.departments[dept].duration
        };
      } else {
        out.all_departments = Object.entries(VIT_DATA.departments).reduce((acc, [k, v]) => {
          acc[k] = { name: v.full_name, seats: v.seats, duration: v.duration };
          return acc;
        }, {});
      }
      break;

    case 'departments':
      if (dept && VIT_DATA.departments[dept]) {
        out.department = VIT_DATA.departments[dept];
      } else {
        out.departments_list = Object.entries(VIT_DATA.departments).map(([, v]) => ({
          name: v.full_name, code: v.code, seats: v.seats, url: v.url
        }));
      }
      break;

    case 'admissions':
      out.admissions = VIT_DATA.admissions;
      break;

    case 'placements':
      out.placements = VIT_DATA.placements;
      break;

    case 'hostel':
    case 'facilities':
      out.infrastructure = VIT_DATA.infrastructure;
      break;

    case 'contact':
      out.contact = VIT_DATA.contact;
      out.college = VIT_DATA.college;
      break;

    case 'exams':
      out.examinations = VIT_DATA.examinations;
      break;

    case 'rankings':
      out.rankings = VIT_DATA.rankings;
      out.college = { accreditation: VIT_DATA.college.accreditation, autonomous_since: VIT_DATA.college.autonomous_since };
      break;

    case 'research':
      out.research = VIT_DATA.research;
      break;

    case 'international':
      out.international = VIT_DATA.quick_links.international;
      break;

    default:
      out.college = VIT_DATA.college;
  }

  // Include live announcements if available
  if (VIT_DATA.live_announcements) {
    out.recent_announcements = VIT_DATA.live_announcements.slice(0, 3);
  }

  return out;
}

// ── Fallback response generator (no AI needed) ────────────
function buildFallbackResponse(message, topic, dept, data) {
  if (isGreeting(message)) {
    return `👋 Hello! I'm VIT Assistant, your guide for everything about **Vishwakarma Institute of Technology, Pune**.\n\nI can help you with courses, admissions, fees, placements, exams, facilities, and more. What would you like to know?`;
  }

  if (isThanks(message)) {
    return `You're welcome! 😊 Feel free to reach out anytime. Best of luck with your VIT journey! 🎓`;
  }

  switch (topic) {
    case 'fees':
      if (dept && data.department) {
        return `💰 **Fees for ${data.department.name}:**\n\nApproximate tuition: **${VIT_DATA.fees.tuition_fee_approx}**\n\nFor precise fee details (which vary by academic year and category), please check:\n📋 [VIT Admissions Page](${VIT_DATA.admissions.admission_url})\n\n> Scholarships from Govt. of Maharashtra are available for eligible categories.`;
      } else {
        return `💰 **Fee Structure at VIT Pune:**\n\n${VIT_DATA.fees.tuition_fee_approx}\n\nFees vary by branch and academic year. For official, up-to-date fee details:\n📋 [VIT Admissions Page](${VIT_DATA.admissions.admission_url})\n📧 Contact: ${VIT_DATA.fees.fee_contact}`;
      }

    case 'departments':
      if (dept && data.department) {
        const d = data.department;
        const highlights = d.highlights?.slice(0, 4).join(', ') || '';
        return `🎓 **${d.full_name}**\n\n• Duration: ${d.duration} | Seats: ${d.seats}\n• Key subjects: ${highlights}\n• ${d.about}\n\n🔗 [Department Page](${d.url})`;
      }  else {
  const csKeys = ['computer engineering','computer engineering (software engineering)',
    'computer science and engineering (ai)','computer science and engineering (ai & ml)',
    'computer science and engineering (data science)',
    'computer science and engineering (iot and cyber security)',
    'artificial intelligence and data science','information technology'];
  const coreKeys = ['electronics and telecommunication','mechanical engineering',
    'civil engineering','chemical engineering','instrumentation engineering'];
  const fmtGroup = (keys) => keys
    .filter(k => VIT_DATA.departments[k])
    .map(k => `• **${VIT_DATA.departments[k].full_name}** (${VIT_DATA.departments[k].seats} seats)`)
    .join('\n');
  return `🎓 **B.Tech Programs at VIT Pune:**\n\n**💻 Computer Science & IT:**\n${fmtGroup(csKeys)}\n\n**⚙️ Core Engineering:**\n${fmtGroup(coreKeys)}\n\n🔗 [All Departments](https://www.vit.edu/academics-at-vit/)\n\nAsk me about any specific branch for more details!`;
}

    case 'admissions': {
      const a = VIT_DATA.admissions;
      const docs = a.documents_required.slice(0, 4).join(', ');
      return `📝 **Admissions at VIT Pune:**\n\n• Process: ${a.process}\n• Key docs: ${docs}...\n• For IL seats: Apply directly to VIT\n\n📄 [Download Brochure](${a.brochure_url})\n📋 [Admission Details](${a.admission_url})\n📢 [Notifications](${a.notification_url})`;
    }

    case 'placements': {
      const p = VIT_DATA.placements;
      const s = p.ay_2024_25;
      const recruiters = p.top_recruiters.slice(0, 6).join(', ');
      return `🚀 **Placements at VIT Pune (AY 2024-25):**\n\n• Highest Package: **${s.highest_package}**\n• Median Salary: **${s.median_salary}**\n• Placement %: **${s.placement_percentage}**\n• ${s.companies_visiting}\n\nTop Recruiters: ${recruiters}, and 500+ more!\n\n📞 TPO: ${p.tpo.name}\n✉️ ${p.tpo.email} | ${p.tpo.mobile}\n\n🔗 [Placement Details](${p.placement_url})`;
    }

    case 'hostel':
    case 'facilities': {
      const f = VIT_DATA.infrastructure;
      return `🏢 **VIT Pune Facilities:**\n\n• 🏠 Hostel: ${f.hostel.boys} (Boys) & ${f.hostel.girls} (Girls)\n• 📚 Library: ${f.library}\n• 🏃 Sports: ${f.sports}\n• 📶 Wi-Fi: ${f.wifi}\n• 🚌 Transport: ${f.transport}\n\n🔗 [Infrastructure Details](${f.infrastructure_url})`;
    }

    case 'contact': {
      const c = VIT_DATA.contact;
      return `📞 **Contact VIT Pune:**\n\n📍 ${c.address}\n📞 ${c.phone}\n📧 ${c.email}\n🌐 [${c.website}](${c.website})\n📝 [Enquiry Form](${c.enquiry_form})`;
    }

    case 'exams':
      return `📅 **Examinations at VIT Pune:**\n\nVIT is an autonomous institute and conducts its own examinations.\n\n🔗 [Exam Timetable & Notifications](${VIT_DATA.examinations.url})\n📆 [Academic Calendar](${VIT_DATA.examinations.academic_calendar_url})`;

    case 'rankings':
      return `🏆 **VIT Pune Rankings & Accreditation:**\n\n• ${VIT_DATA.college.accreditation}\n• ${VIT_DATA.college.status}\n\n🔗 [Rankings & Recognitions](${VIT_DATA.rankings.url})\n📊 [NIRF Data](${VIT_DATA.rankings.nirf_url})`;

    default:
      return `🤔 I can help you with:\n\n• **Courses & Departments** — All B.Tech programs at VIT\n• **Fees & Admissions** — Process, eligibility, documents\n• **Placements** — Stats, recruiters, TPO contact\n• **Exams** — Timetables, results, academic calendar\n• **Facilities** — Hostel, library, sports\n• **Contact** — Address, phone, email\n\nWhat would you like to know? 😊`;
  }
}

// ── Main API handler ───────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message?.trim() || !sessionId) {
      return NextResponse.json({ error: 'Missing message or sessionId' }, { status: 400 });
    }

    const userMsg = message.trim();
const lowerMsg = userMsg.toLowerCase();

// Detect topic and department from message
let topic = detectTopic(userMsg);
let dept  = detectDept(userMsg);

// Detect "list all / other / more" intent — clears dept context
const isBroadQuery = /\b(other|others|all|more|rest|list|every|what else|different|available|offered)\b/.test(lowerMsg)
  || /\ball (courses|departments|branches|programs)\b/.test(lowerMsg)
  || /\bwhat (courses|departments|branches|programs|other)\b/.test(lowerMsg);

const pending = getPendingContext(sessionId);

if (isBroadQuery) {
  dept = null;
  clearPendingContext(sessionId);
} else if (pending.topic && !topic && dept) {
  topic = pending.topic;
  clearPendingContext(sessionId);
} else if (pending.dept && dept === null && !isBroadQuery) {
  const isShortFollowUp = userMsg.split(' ').length <= 6;
  if (isShortFollowUp) dept = pending.dept;
}

if (dept) setPendingContext(sessionId, { dept });
if (topic && !dept) setPendingContext(sessionId, { topic });
if (topic && dept) clearPendingContext(sessionId);

    // Fetch relevant data slice
    const relevantData = getRelevantData(topic, dept);

    // Get conversation history for AI context
    const history = getHistoryForAPI(sessionId);

    // Try AI first
    const aiResult = await getAIResponse(userMsg, history, relevantData);

    let finalResponse, source;

    if (aiResult.success) {
      finalResponse = aiResult.response;
      source = 'ai';
    } else {
      finalResponse = buildFallbackResponse(userMsg, topic, dept, relevantData);
      source = 'local';
    }

    // Save to session history
    addMessage(sessionId, 'user', userMsg);
    addMessage(sessionId, 'assistant', finalResponse);

    return NextResponse.json({
      response: finalResponse,
      sessionId,
      source,
      context: getSessionSummary(sessionId)
    });

  } catch (err) {
    console.error('[VIT Chat API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
