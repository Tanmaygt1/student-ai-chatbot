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
      out.admissions = VIT_DATA.fy_admissions;
      break;

    case 'placements':
      out.placements = VIT_DATA.placements;
      break;

    case 'hostel':
    case 'hostel':
    case 'facilities':
      out.infrastructure = VIT_DATA.infrastructure;
      out.student_life = VIT_DATA.student_life;
      break;

    case 'contact':
      out.contact = VIT_DATA.contact;
      out.college = VIT_DATA.college;
      break;

    case 'exams':
      out.examinations = VIT_DATA.examinations;
      break;

    case 'rankings':
      out.rankings = VIT_DATA.rankings_accreditation;
      out.college = { accreditation: VIT_DATA.college.accreditation, autonomous_since: VIT_DATA.college.autonomous_since };
      break;

    case 'research':
      out.research = VIT_DATA.research;
      break;

    case 'international':
      out.international = VIT_DATA.international_relations;
      break;

    case 'seda':
      out.seda_dsy = VIT_DATA.dse_seda;
      out.fees_note = VIT_DATA.fees.note;
      break;

    case 'pg':
      out.pg_programs = VIT_DATA.pg_programs;
      break;

    case 'cutoffs':
      out.cutoffs = VIT_DATA.cutoffs_mhtcet;
      if (dept && VIT_DATA.cutoffs_mhtcet?.ay_2024_25_approx?.[dept]) {
        out.specific_cutoff = { department: dept, cutoff: VIT_DATA.cutoffs_mhtcet.ay_2024_25_approx[dept] };
      }
      break;
      case 'faq':
      out.faq = VIT_DATA.faq;
      out.college = VIT_DATA.college;
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
    case 'fees': {
      const bwFees = {}; const ay = VIT_DATA.fees.ay_2025_26; if(ay){for(const tier of Object.values(ay)){if(tier.branches && tier.first_year_fee){tier.branches.forEach(b=>bwFees[b.toLowerCase()]=tier.first_year_fee);}}}
      if (dept && bwFees[dept]) {
        const deptInfo = VIT_DATA.departments[dept];
        return `💰 **Fees for ${deptInfo?.full_name || dept}:**\n\n• **First Year Fee:** ${bwFees[dept]}\n• Duration: ${deptInfo?.duration || '4 years'} | Seats: ${deptInfo?.seats || 'N/A'}\n\n**Scholarships available:**\n• TFWS: Only ₹10,000/year for top merit\n• SC/ST/OBC/EBC: Via MahaDBT portal\n\n📋 [Official Fee Structure](${VIT_DATA.fees.fee_structure_url})\n📧 ${VIT_DATA.fees.fee_contact}`;
      } else {
        const feeGroups = {
          'High-demand CS/IT branches (CE, IT, AI, ML, DS)': '₹6,24,165/year',
          'IoT/Cyber Security, E&TC, Mechanical, Instrumentation': '₹4,18,165/year',
          'Civil Engineering, Chemical Engineering': '₹2,12,165/year'
        };
        const feeList = Object.entries(feeGroups).map(([k,v]) => `• **${k}:** ${v}`).join('\n');
        return `💰 **Fee Structure at VIT Pune (AY 2025-26):**\n\n${feeList}\n\n**TFWS:** Only ₹10,000/year for top merit students\n**Scholarships:** SC/ST/OBC/EBC via MahaDBT portal\n\n> Ask me about a specific branch for exact fees!\n📋 [Official Fee Structure](${VIT_DATA.fees.fee_structure_url})`;
      }
    }

    case 'departments':
      if (dept && data.department) {
        const d = data.department;
        const highlights = d.highlights?.slice(0, 4).join(', ') || '';
        return `🎓 **${d.full_name}**\n\n• Duration: ${d.duration} | Seats: ${d.seats}\n• Key subjects: ${highlights}\n• ${d.about}\n\n🔗 [Department Page](${d.url})\n\n💡 Want info on another branch? Just name it, or ask me to list all courses!`;
      } else {
        // Group departments by category for a clean, scannable response
        const csKeys  = ['computer engineering','computer engineering (software engineering)',
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
      const a = VIT_DATA.fy_admissions;
      const docs = a.documents_required.slice(0, 4).join(', ');
      return `📝 **Admissions at VIT Pune:**\n\n• **FY B.Tech:** ${a.process}\n• **DSE/SEDA (Lateral):** Via MHT-CET Diploma + DSE CAP rounds\n• VIT College Code: **${a.vit_cap_code}**\n• Key docs: ${docs}...\n• ${a.il_quota}\n\n📄 [Download Brochure](${a.brochure})\n📋 [FY B.Tech Details](${a.url})\n📋 [DSE/SEDA Details](${VIT_DATA.dse_seda.url})\n📢 [Notifications](${a.notifications_url})`;
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

    case 'seda': {
      const s = VIT_DATA.dse_seda;
      const intakeList = Object.entries(s.dse_branch_intake)
        .sort((a,b) => b[1]-a[1])
        .slice(0,6)
        .map(([b,n]) => `• ${b}: ${n} seats`)
        .join('\n');
      return `🎓 **${s.official_name}**\n\n**What is DSE/SEDA?**\n${s.what_is_it}\n\n**Total DSE Intake:** ${s.total_dse_intake} seats\n\n**Top branches by seats:**\n${intakeList}\n\n**Eligibility:**\n• ${s.eligibility.qualification}\n• ${s.eligibility.marks}\n• Entrance: ${s.eligibility.entrance_exam}\n\n**Placements:** ${s.placements}\n\n📋 [Fee Structure PDF](${s.fee_pdf})\n🔗 [DSE Admission Details](${s.url})\n📢 [Notifications](${s.notification_url})`;
    }

    case 'pg': {
      const pg = VIT_DATA.pg_programs;
      const mtechList = pg.mtech.programs.map(p => `• ${p}`).join('\n');
      return `🎓 **Postgraduate Programs at VIT Pune:**\n\n**M.Tech (2 years):**\n${mtechList}\nEligibility: ${pg.mtech.eligibility}\n\n**MCA (2 years):**\nEligibility: ${pg.mca.eligibility}\n\n**Ph.D:** Available across all major departments\n\n🔗 [PG Admissions](${pg.mtech.url})`;
    }

    case 'cutoffs': {
      const c = VIT_DATA.cutoffs_mhtcet?.ay_2024_25_approx || {};
      if (dept && c[dept]) {
        return `📊 **MHT-CET Cutoff for ${dept.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}:**\n\n**2025 cutoff (Open category):** ${c[dept]}\n\n> ${c.note}\n\n🔗 [Official Admissions Page](${VIT_DATA.fy_admissions.url})`;
      }
      const topBranches = ['computer engineering','information technology',
        'artificial intelligence and data science','computer science and engineering (ai & ml)',
        'electronics and telecommunication','mechanical engineering'];
      const list = topBranches.map(k => `• **${k.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')}:** ${c[k] || 'N/A'}`).join('\n');
      return `📊 **MHT-CET 2025 Cutoffs at VIT Pune (Open Category):**\n\n${list}\n\n> ${c.note}\n\n🔗 [Full Admission Details](${VIT_DATA.fy_admissions.url})`;
    }

    case 'rankings':
      return `🏆 **VIT Pune Rankings & Accreditation:**\n\n• ${VIT_DATA.college.accreditation}\n• ${VIT_DATA.college.status}\n\n🔗 [Rankings & Recognitions](${VIT_DATA.rankings_accreditation.url})\n📊 [NIRF Data](${VIT_DATA.rankings_accreditation.nirf.url})`;

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

    // Detect "list all / other / more" intent — these should CLEAR dept context
    const isBroadQuery = /\b(other|others|all|more|rest|list|every|what else|different|available|offered)\b/.test(lowerMsg)
      || /\ball (courses|departments|branches|programs)\b/.test(lowerMsg)
      || /\bwhat (courses|departments|branches|programs|other)\b/.test(lowerMsg);

    // Context-awareness: resolve pending topic/dept from previous turn
    const pending = getPendingContext(sessionId);

    if (isBroadQuery) {
      // User wants a general list — ignore any stored dept context
      dept = null;
      clearPendingContext(sessionId);
    } else if (pending.topic && !topic && dept) {
      // User supplied a dept to resolve a previously pending topic (e.g. "CE" after "What are the fees?")
      topic = pending.topic;
      clearPendingContext(sessionId);
    } else if (pending.dept && dept === null && !isBroadQuery) {
      // Only inherit stored dept for clearly specific follow-ups (short messages like "tell me more", "what about fees")
      const isShortFollowUp = userMsg.split(' ').length <= 6;
      if (isShortFollowUp) dept = pending.dept;
    }

    // If asking about departments/courses in general (no specific dept named), 
    // always show the full list — never inherit a stale dept
    if (topic === 'departments' && !detectDept(userMsg)) {
      dept = null;
    }

    // Update stored context
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
