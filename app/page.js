'use client';
// app/page.js — VIT Pune Chatbot UI
// Author: Tanmay

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Inline styles as JS objects ──────────────────────────
const S = {
  root: { display:'flex', height:'100vh', overflow:'hidden', fontFamily:'var(--font)' },

  sidebar: {
    width:'260px', minWidth:'260px', height:'100vh',
    background:'var(--surface)', borderRight:'1px solid var(--border)',
    display:'flex', flexDirection:'column', padding:'18px 12px',
    transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    overflow:'hidden', flexShrink:0
  },
  sidebarHidden: { width:0, minWidth:0, padding:0, overflow:'hidden' },

  logoRow: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'22px', padding:'4px 6px' },
  logoMark: {
    width:'38px', height:'38px', borderRadius:'50%',
    background:'linear-gradient(135deg,#1e40af,#3b82f6)',
    display:'grid', placeItems:'center', fontSize:'16px', fontWeight:700, color:'white', flexShrink:0,
    boxShadow:'0 0 0 2px rgba(59,130,246,0.3)'
  },
  logoTextBig: { fontSize:'14px', fontWeight:700, color:'var(--text)', letterSpacing:'0.02em' },
  logoTextSm: { fontSize:'10.5px', color:'var(--text-sec)', letterSpacing:'0.05em', textTransform:'uppercase' },

  newBtn: {
    display:'flex', alignItems:'center', gap:'8px', width:'100%',
    padding:'10px 13px', marginBottom:'22px',
    background:'var(--accent-dim)', border:'1px solid var(--border-hi)',
    borderRadius:'var(--r-md)', color:'var(--accent-hi)',
    fontSize:'13px', fontWeight:500, fontFamily:'var(--font)', cursor:'pointer',
    transition:'all 0.2s'
  },

  sectionLabel: {
    display:'block', fontSize:'10px', fontWeight:700,
    letterSpacing:'0.1em', textTransform:'uppercase',
    color:'var(--text-mute)', marginBottom:'8px', padding:'0 4px'
  },

  topicBtn: {
    display:'flex', alignItems:'center', gap:'9px', width:'100%',
    padding:'9px 10px', background:'transparent', border:'none',
    borderRadius:'var(--r-sm)', color:'var(--text-sec)',
    fontSize:'12.5px', fontFamily:'var(--font)', textAlign:'left', cursor:'pointer',
    transition:'all 0.2s'
  },

  footer: { marginTop:'auto' },
  footerCard: {
    display:'flex', alignItems:'center', gap:'10px', padding:'11px 12px',
    background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)'
  },
  onlineDot: {
    width:'8px', height:'8px', borderRadius:'50%',
    background:'var(--green)', flexShrink:0,
    boxShadow:'0 0 6px var(--green)', animation:'pulse 2s infinite'
  },

  // MAIN
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 },

  header: {
    height:'62px', display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'0 18px', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0
  },
  toggleBtn: {
    background:'none', border:'none', color:'var(--text-sec)', cursor:'pointer',
    padding:'6px', borderRadius:'var(--r-sm)', transition:'all 0.2s', display:'grid', placeItems:'center'
  },
  headerCenter: { display:'flex', alignItems:'center', gap:'10px' },
  headerAvatar: {
    width:'36px', height:'36px', borderRadius:'50%',
    background:'linear-gradient(135deg,#1e40af,#3b82f6)',
    display:'grid', placeItems:'center', fontSize:'15px', fontWeight:700, color:'white',
    border:'2px solid rgba(59,130,246,0.4)'
  },
  headerTitle: { fontSize:'16px', fontWeight:700, color:'var(--text)' },
  headerSub: { fontSize:'11px', color:'var(--green)', display:'flex', alignItems:'center', gap:'4px' },
  statusDot: { width:'6px', height:'6px', borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' },
  vitBadge: {
    fontSize:'11px', fontWeight:600, padding:'4px 10px', borderRadius:'20px',
    background:'var(--gold-dim)', border:'1px solid var(--gold-border)',
    color:'var(--gold)', fontFamily:'var(--mono)'
  },

  // MESSAGES
  msgArea: { flex:1, overflowY:'auto', padding:'22px 18px', scrollBehavior:'smooth' },

  // WELCOME
  welcome: { display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'32px 16px' },
  welcomeLogo: { position:'relative', width:'72px', height:'72px', display:'grid', placeItems:'center', marginBottom:'20px' },
  ring1: { position:'absolute', inset:0, borderRadius:'50%', border:'2px solid var(--accent)', opacity:0.6, animation:'spin 5s linear infinite' },
  ring2: { position:'absolute', inset:'10px', borderRadius:'50%', border:'2px solid var(--gold)', opacity:0.35, animation:'spin 8s linear infinite reverse' },
  welcomeAv: {
    width:'44px', height:'44px', borderRadius:'50%', zIndex:1,
    background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',
    display:'grid', placeItems:'center', fontSize:'20px', fontWeight:700, color:'white'
  },
  welcomeTitle: { fontSize:'26px', fontWeight:700, marginBottom:'10px', color:'var(--text)' },
  welcomeGold: { color:'var(--gold)' },
  welcomeSub: { fontSize:'14px', color:'var(--text-sec)', maxWidth:'420px', lineHeight:1.7, marginBottom:'28px' },
  chips: { display:'flex', flexWrap:'wrap', gap:'9px', justifyContent:'center', maxWidth:'520px' },
  chip: {
    padding:'9px 15px', background:'var(--elevated)', border:'1px solid var(--border)',
    borderRadius:'var(--r-xl)', color:'var(--text-sec)', fontSize:'12.5px',
    fontFamily:'var(--font)', cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap'
  },

  // MESSAGES LIST
  msgList: { display:'flex', flexDirection:'column', gap:'18px' },
  msgRow: { display:'flex', gap:'10px' },
  msgRowUser: { flexDirection:'row-reverse' },

  avatar: { width:'32px', height:'32px', borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', fontSize:'12px', fontWeight:700, alignSelf:'flex-end' },
  avatarBot: { background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', color:'white', border:'1.5px solid rgba(59,130,246,0.3)' },
  avatarUser: { background:'rgba(99,179,237,0.12)', color:'var(--accent-hi)', border:'1.5px solid rgba(99,179,237,0.2)' },

  bubble: { maxWidth:'min(500px, calc(100% - 70px))' },
  bubbleContent: { padding:'12px 15px', borderRadius:'var(--r-lg)', fontSize:'14px', lineHeight:1.65, whiteSpace:'pre-wrap', wordBreak:'break-word' },
  bubbleBot: { background:'var(--elevated)', border:'1px solid var(--border)', borderBottomLeftRadius:'4px', color:'var(--text)' },
  bubbleUser: { background:'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)', border:'1px solid rgba(99,179,237,0.15)', borderBottomRightRadius:'4px', color:'white' },

  msgMeta: { display:'flex', alignItems:'center', gap:'6px', padding:'4px 4px 0', fontSize:'10px', color:'var(--text-mute)' },
  msgMetaUser: { justifyContent:'flex-end' },

  srcTag: { fontSize:'9px', padding:'1px 6px', borderRadius:'10px', fontFamily:'var(--mono)', fontWeight:500 },
  srcAI: { background:'rgba(59,130,246,0.1)', color:'var(--accent-hi)', border:'1px solid rgba(59,130,246,0.2)' },
  srcLocal: { background:'rgba(245,158,11,0.1)', color:'var(--gold)', border:'1px solid rgba(245,158,11,0.2)' },

  // TYPING
  typingRow: { display:'flex', alignItems:'flex-end', gap:'10px' },
  typingBubble: { background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', borderBottomLeftRadius:'4px', padding:'13px 16px', display:'flex', gap:'5px', alignItems:'center' },
  dot: { width:'7px', height:'7px', background:'var(--text-mute)', borderRadius:'50%' },

  // INPUT
  inputArea: { padding:'12px 18px 14px', background:'var(--surface)', borderTop:'1px solid var(--border)', flexShrink:0 },
  inputBox: { display:'flex', alignItems:'flex-end', gap:'9px', background:'var(--elevated)', border:'1.5px solid var(--border)', borderRadius:'var(--r-xl)', padding:'9px 13px', transition:'all 0.2s' },
  inputBoxFocus: { borderColor:'rgba(59,130,246,0.35)', boxShadow:'0 0 0 3px rgba(59,130,246,0.06)' },
  textarea: { flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontSize:'14px', fontFamily:'var(--font)', resize:'none', lineHeight:1.5, maxHeight:'130px', overflowY:'auto' },
  sendBtn: { width:'36px', height:'36px', borderRadius:'50%', display:'grid', placeItems:'center', cursor:'pointer', border:'none', transition:'all 0.2s', flexShrink:0 },
  sendOn: { background:'var(--accent)', color:'white' },
  sendOff: { background:'var(--elevated)', color:'var(--text-mute)', cursor:'not-allowed' },
  inputFooter: { display:'flex', justifyContent:'space-between', padding:'5px 3px 0', fontSize:'10.5px' },
};

// ── Quick Sidebar Topics ──────────────────────────────────
const TOPICS = [
  { icon:'🎓', label:'All Courses',       msg:'What B.Tech courses does VIT Pune offer?' },
  { icon:'💰', label:'Fees',              msg:'What are the fees at VIT Pune?' },
  { icon:'📝', label:'Admissions',        msg:'How to apply for admission at VIT Pune?' },
  { icon:'🚀', label:'Placements',        msg:'Tell me about placements at VIT Pune' },
  { icon:'🏠', label:'Hostel & Facilities', msg:'What are the hostel and campus facilities?' },
  { icon:'📅', label:'Exam Schedule',     msg:'Where can I find the exam timetable?' },
  { icon:'📞', label:'Contact VIT',       msg:'What is the contact information for VIT Pune?' },
  { icon:'🏆', label:'Rankings',          msg:'What are VIT Pune rankings and accreditations?' },
];

const WELCOME_CHIPS = [
  { icon:'🎓', text:'Available Courses',  msg:'What B.Tech programs does VIT Pune offer?' },
  { icon:'💰', text:'Fee Structure',      msg:'What are the fees at VIT Pune?' },
  { icon:'🚀', text:'Placement Stats',    msg:'What are the placement statistics at VIT?' },
  { icon:'📝', text:'How to Apply',       msg:'How do I apply for admission at VIT Pune?' },
  { icon:'🏠', text:'Hostel & Campus',    msg:'Tell me about hostel and facilities at VIT' },
  { icon:'👨‍💻', text:'CS/AI Branches',    msg:'Tell me about Computer Science and AI branches at VIT' },
];

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function renderText(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong style="color:#93c5fd;font-weight:600">$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:#60a5fa;text-decoration:underline">$1</a>')
    .replace(/^[•\-]\s+(.+)$/gm,'<span style="display:block;padding-left:10px">• $1</span>')
    .replace(/\n/g,'<br>');
}

export default function Home() {
  const [sessionId]      = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vit_session');
      if (stored) return stored;
      const id = genId();
      localStorage.setItem('vit_session', id);
      return id;
    }
    return genId();
  });
  const [messages,    setMessages]   = useState([]);
  const [input,       setInput]      = useState('');
  const [loading,     setLoading]    = useState(false);
  const [started,     setStarted]    = useState(false);
  const [sideOpen,    setSideOpen]   = useState(true);
  const [focused,     setFocused]    = useState(false);
  const [aiActive,    setAiActive]   = useState(true);

  const msgEndRef  = useRef(null);
  const textareaRef = useRef(null);

  const scrollDown = useCallback(() => {
    msgEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, []);

  useEffect(() => { scrollDown(); }, [messages, loading]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    if (!started) setStarted(true);

    const ts = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    setMessages(prev => [...prev, { role:'user', content:msg, ts }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:msg, sessionId })
      });
      const data = await res.json();
      const botTs = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      setMessages(prev => [...prev, {
        role:'assistant',
        content: data.response || '⚠️ No response received. Please try again.',
        ts: botTs,
        source: data.source
      }]);
      setAiActive(data.source === 'ai');
    } catch {
      setMessages(prev => [...prev, {
        role:'assistant',
        content:'⚠️ Connection error. Please ensure the server is running.',
        ts: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
        source:'error'
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, started, sessionId]);

  const newChat = async () => {
    await fetch('/api/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});
    setMessages([]);
    setStarted(false);
    localStorage.removeItem('vit_session');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div style={S.root}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
        .msg-enter{animation:slideUp 0.3s ease}
        .topic-btn:hover{background:var(--elevated)!important;color:var(--text)!important}
        .chip:hover{background:var(--accent-dim)!important;border-color:var(--border-hi)!important;color:var(--accent-hi)!important;transform:translateY(-2px)}
        .new-btn:hover{background:rgba(59,130,246,0.18)!important;transform:translateY(-1px)}
        .send-on:hover{filter:brightness(1.1);transform:scale(1.06)}
        textarea::-webkit-scrollbar{display:none}
        .msgs::-webkit-scrollbar{width:3px}
        .msgs::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
        a{color:var(--accent-hi)}
        strong{color:#93c5fd}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={sideOpen ? S.sidebar : {...S.sidebar,...S.sidebarHidden}}>
        {/* Logo */}
        <div style={S.logoRow}>
          <div style={S.logoMark}>V</div>
          <div>
            <div style={S.logoTextBig}>VIT Pune</div>
            <div style={S.logoTextSm}>Student Assistant</div>
          </div>
        </div>

        {/* New Chat */}
        <button className="new-btn" style={S.newBtn} onClick={newChat}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          New Conversation
        </button>

        {/* Topics */}
        <span style={S.sectionLabel}>Quick Topics</span>
        <div style={{display:'flex',flexDirection:'column',gap:'2px',marginBottom:'20px'}}>
          {TOPICS.map(t => (
            <button key={t.label} className="topic-btn" style={S.topicBtn}
              onClick={() => { send(t.msg); if(window.innerWidth<=768) setSideOpen(false); }}>
              <span style={{fontSize:'14px'}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.footerCard}>
            <div style={S.onlineDot}></div>
            <div>
              <div style={{fontSize:'12px',fontWeight:600,color:'var(--text)'}}>VIT Pune</div>
              <div style={{fontSize:'10.5px',color:'var(--text-sec)'}}>Bibwewadi, Pune 411037</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={S.main}>
        {/* Header */}
        <header style={S.header}>
          <button style={S.toggleBtn} onClick={() => setSideOpen(v => !v)} aria-label="Toggle sidebar">
            <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>

          <div style={S.headerCenter}>
            <div style={S.headerAvatar}>V</div>
            <div>
              <div style={S.headerTitle}>VIT Assistant</div>
              <div style={S.headerSub}><span style={S.statusDot}></span> Online</div>
            </div>
          </div>

          <div style={S.vitBadge}>vit.edu</div>
        </header>

        {/* Messages */}
        <div className="msgs" style={S.msgArea}>

          {/* Welcome */}
          {!started && (
            <div style={S.welcome}>
              <div style={S.welcomeLogo}>
                <div style={S.ring1}></div>
                <div style={S.ring2}></div>
                <div style={S.welcomeAv}>V</div>
              </div>
              <h2 style={S.welcomeTitle}>
                Hello! I&apos;m <span style={S.welcomeGold}>VIT Assistant</span>
              </h2>
              <p style={S.welcomeSub}>
                Your official guide to <strong style={{color:'var(--accent-hi)'}}>Vishwakarma Institute of Technology, Pune</strong>.
                Ask me anything about courses, admissions, placements, exams, or campus life.
              </p>
              <div style={S.chips}>
                {WELCOME_CHIPS.map(c => (
                  <button key={c.text} className="chip" style={S.chip} onClick={() => send(c.msg)}>
                    {c.icon} {c.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div style={S.msgList}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className="msg-enter" style={isUser ? {...S.msgRow,...S.msgRowUser} : S.msgRow}>
                  <div style={isUser ? {...S.avatar,...S.avatarUser} : {...S.avatar,...S.avatarBot}}>
                    {isUser ? 'T' : 'V'}
                  </div>
                  <div style={S.bubble}>
                    <div style={isUser ? {...S.bubbleContent,...S.bubbleUser} : {...S.bubbleContent,...S.bubbleBot}}
                      dangerouslySetInnerHTML={{__html: isUser ? m.content.replace(/</g,'&lt;') : renderText(m.content)}} />
                    <div style={isUser ? {...S.msgMeta,...S.msgMetaUser} : S.msgMeta}>
                      <span>{m.ts}</span>
                      {m.source && !isUser && (
                        <span style={m.source === 'ai' ? {...S.srcTag,...S.srcAI} : {...S.srcTag,...S.srcLocal}}>
                          {m.source === 'ai' ? '✦ AI' : '📂 Data'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div style={S.typingRow}>
                <div style={{...S.avatar,...S.avatarBot}}>V</div>
                <div style={S.typingBubble}>
                  {[0,150,300].map(d => (
                    <div key={d} style={{...S.dot, animation:`bounce 1.2s ease-in-out ${d}ms infinite`}}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={msgEndRef} />
        </div>

        {/* Input */}
        <div style={S.inputArea}>
          <div style={focused ? {...S.inputBox,...S.inputBoxFocus} : S.inputBox}>
            <textarea
              ref={textareaRef}
              style={S.textarea}
              placeholder="Ask about VIT courses, admissions, placements..."
              value={input}
              rows={1}
              maxLength={500}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
              }}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <button
              style={canSend ? {...S.sendBtn,...S.sendOn,'className':'send-on'} : {...S.sendBtn,...S.sendOff}}
              className={canSend ? 'send-on' : ''}
              disabled={!canSend}
              onClick={() => send()}
              aria-label="Send"
            >
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <div style={S.inputFooter}>
            <span style={{color:'var(--text-mute)',fontFamily:'var(--mono)',fontSize:'10px'}}>{input.length}/500</span>
            <span style={{color:'var(--text-mute)',fontSize:'10px'}}>
              {aiActive ? '✦ AI-powered responses' : '📂 Using local knowledge base'} • vit.edu
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
