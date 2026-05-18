'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Athlete, Page, User } from '@/lib/types';
import { LOGO_URL } from '@/lib/devData';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';

interface Props {
  athletes: Athlete[];
  onNavigate: (page: Page) => void;
  user?: User | null;
}

/* ── Animated counter ──────────────────────────────────────── */
function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current || target === 0) return;
    ref.current = true;
    let cur = 0;
    const step = Math.ceil(target / (duration / 20));
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

/* ── Rating ring SVG ───────────────────────────────────────── */
function RingBadge({ rating, size = 44 }: { rating: number; size?: number }) {
  const color = rating >= 80 ? '#10b981' : rating >= 60 ? '#38bdf8' : rating >= 40 ? '#f59e0b' : '#ef4444';
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (rating / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color+'22'} strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size*0.28} fontWeight="900" fill={color}>{rating}</text>
    </svg>
  );
}

/* ── All feature navigation cards ─────────────────────────── */
const ALL_FEATURES: { page: Page; icon: string; label: string; labelTH: string; color: string; category: string }[] = [
  { page:'dashboard',   icon:'bi-grid-1x2-fill',       label:'Dashboard',      labelTH:'ภาพรวมทีม',        color:'#38bdf8', category:'overview' },
  { page:'scout',       icon:'bi-person-badge-fill',    label:'Scout Report',   labelTH:'รายงานนักกีฬา',    color:'#818cf8', category:'athlete' },
  { page:'roster',      icon:'bi-people-fill',          label:'Roster',         labelTH:'รายชื่อนักกีฬา',   color:'#34d399', category:'athlete' },
  { page:'skill',       icon:'bi-bullseye',             label:'Skill',          labelTH:'ทักษะฟุตบอล',      color:'#f59e0b', category:'athlete' },
  { page:'ir',          icon:'bi-clipboard2-check-fill',label:'IDP',            labelTH:'แผนพัฒนารายบุคคล', color:'#a78bfa', category:'athlete' },
  { page:'attendance',  icon:'bi-check2-square',        label:'Attendance',     labelTH:'เช็คชื่อซ้อม',     color:'#4ade80', category:'athlete' },
  { page:'wellness',    icon:'bi-heart-pulse-fill',     label:'Wellness',       labelTH:'สภาพร่างกาย',      color:'#f472b6', category:'athlete' },
  { page:'compare',     icon:'bi-intersect',            label:'Compare',        labelTH:'เปรียบเทียบ',       color:'#fb923c', category:'analysis' },
  { page:'lineup',      icon:'bi-diagram-3-fill',       label:'Line-Up',        labelTH:'จัดไลน์อัพ',        color:'#60a5fa', category:'analysis' },
  { page:'teamreport',  icon:'bi-bar-chart-line-fill',  label:'Team Report',    labelTH:'รายงานทีม',         color:'#10b981', category:'analysis' },
  { page:'performance', icon:'bi-clipboard-data-fill',  label:'Update Results', labelTH:'บันทึกผลทดสอบ',    color:'#e879f9', category:'data' },
  { page:'quicktest',   icon:'bi-lightning-fill',       label:'Quick Test',     labelTH:'บันทึกด่วน',        color:'#fbbf24', category:'data' },
  { page:'register',    icon:'bi-person-plus-fill',     label:'Add Athlete',    labelTH:'เพิ่มนักกีฬา',      color:'#6ee7b7', category:'data' },
  { page:'training',    icon:'bi-play-btn-fill',        label:'Training Video', labelTH:'วิดีโอฝึกซ้อม',    color:'#f87171', category:'media' },
];

const CATEGORY_LABELS: Record<string, string> = {
  overview:  'Overview',
  athlete:   'Athletes',
  analysis:  'Analysis',
  data:      'Data Entry',
  media:     'Media',
};
const CATEGORY_COLORS: Record<string, string> = {
  overview: '#38bdf8', athlete: '#34d399', analysis: '#818cf8', data: '#f59e0b', media: '#f87171',
};

export default function HomePage({ athletes, onNavigate, user }: Props) {
  /* ── Computed real stats ─── */
  const stats = useMemo(() => {
    const teams  = [...new Set(athletes.map(a => a.Team).filter(Boolean))];
    const tested = athletes.filter(a => (a.History?.length || 0) > 0);
    const total_tests = athletes.reduce((s, a) => s + (a.History?.length || 0), 0);
    const withRating  = athletes.filter(a => Number(a.Latest?.Rating) > 0);
    const avgRating   = withRating.length
      ? Math.round(withRating.reduce((s, a) => s + Number(a.Latest?.Rating), 0) / withRating.length)
      : 0;

    /* Top 5 by rating */
    const topAthletes = [...athletes]
      .filter(a => Number(a.Latest?.Rating) > 0)
      .sort((a, b) => Number(b.Latest?.Rating) - Number(a.Latest?.Rating))
      .slice(0, 5);

    /* Position distribution */
    const posCnt: Record<string, number> = {};
    athletes.forEach(a => {
      const p = (a.Position || 'N/A').split(/[\s,/-]/)[0];
      posCnt[p] = (posCnt[p] || 0) + 1;
    });
    const positions = Object.entries(posCnt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    /* Untested (no history) */
    const untested = athletes.filter(a => !(a.History?.length));

    /* Age group distribution */
    const ageCnt: Record<string, number> = { U13: 0, U15: 0, U17: 0, U20: 0, 'Senior': 0 };
    const now = new Date();
    athletes.forEach(a => {
      if (!a.DOB) return;
      const age = now.getFullYear() - new Date(a.DOB).getFullYear();
      if (age <= 13) ageCnt['U13']++;
      else if (age <= 15) ageCnt['U15']++;
      else if (age <= 17) ageCnt['U17']++;
      else if (age <= 20) ageCnt['U20']++;
      else ageCnt['Senior']++;
    });

    return { teams, tested, total_tests, avgRating, topAthletes, positions, untested, ageCnt, withRating };
  }, [athletes]);

  const cntAthletes = useCounter(athletes.length);
  const cntTeams    = useCounter(stats.teams.length);
  const cntTests    = useCounter(stats.total_tests);
  const cntRating   = useCounter(stats.avgRating);

  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const filteredFeatures = activeCategory === 'all'
    ? ALL_FEATURES
    : ALL_FEATURES.filter(f => f.category === activeCategory);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  })();

  const dateStr = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <div>
      <style>{`
        @keyframes hglow  { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-24px,18px)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-20px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .hp-card { transition: transform 0.18s, box-shadow 0.18s; }
        .hp-card:hover { transform: translateY(-3px); }
        .hp-feat:hover { background: var(--feat-color-bg) !important; border-color: var(--feat-color) !important; }
        .hp-feat:hover .feat-icon-wrap { box-shadow: 0 6px 24px var(--feat-color-glow) !important; }
        .hp-feat:hover .feat-label { color: var(--feat-color) !important; }
      `}</style>

      {/* ══════ HERO ══════════════════════════════════════════════ */}
      <div style={{
        position:'relative', overflow:'hidden', borderRadius:20, marginBottom:20,
        background:'linear-gradient(160deg,#020c1e 0%,#05122e 50%,#020a1a 100%)',
        border:'1px solid rgba(56,189,248,0.12)',
        boxShadow:'0 4px 60px rgba(0,20,80,0.5)',
      }}>
        {/* Pitch grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, opacity:0.055,
          backgroundImage:'linear-gradient(rgba(56,189,248,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.7) 1px,transparent 1px)',
          backgroundSize:'56px 56px' }}/>
        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'-30%', right:'10%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.13) 0%,transparent 65%)', animation:'drift1 11s ease-in-out infinite', pointerEvents:'none', zIndex:1 }}/>
        <div style={{ position:'absolute', bottom:'-40%', left:'2%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.09) 0%,transparent 65%)', animation:'drift2 14s ease-in-out infinite', pointerEvents:'none', zIndex:1 }}/>

        <div style={{ position:'relative', zIndex:2, padding:'40px 44px 36px', display:'flex', gap:40, alignItems:'center', flexWrap:'wrap' }}>

          {/* LEFT: greeting + headline */}
          <div style={{ flex:'1 1 380px', minWidth:0 }}>
            {/* Greeting line */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              {user?.logoUrl
                ? <img src={user.logoUrl} alt="" style={{ width:28, height:28, borderRadius:6, objectFit:'contain', background:'rgba(255,255,255,0.08)', padding:2 }}/>
                : <img src={LOGO_URL} alt="" style={{ width:24, height:24, borderRadius:5, objectFit:'contain' }}/>
              }
              <span style={{ fontSize:'0.7rem', fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:0.5 }}>{greet} {user?.displayName || user?.username || ''}</span>
              <span style={{ marginLeft:'auto', fontSize:'0.6rem', color:'rgba(255,255,255,0.25)' }}>{dateStr}</span>
            </div>

            <h1 style={{ fontSize:'clamp(2rem,4vw,3.2rem)', fontWeight:900, color:'white', lineHeight:1.05, margin:'0 0 10px', letterSpacing:-0.5 }}>
              <span style={{ background:'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>ISP</span>
              {' '}Improve Sports<br/>Performance
            </h1>
            <p style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.42)', lineHeight:1.65, margin:'0 0 28px', maxWidth:420 }}>
              ระบบพัฒนานักกีฬาฟุตบอลครบวงจร ·{' '}
              <span style={{ color:'#38bdf8' }}>ร่างกาย</span> ·{' '}
              <span style={{ color:'#a78bfa' }}>จิตใจ</span> ·{' '}
              <span style={{ color:'#f59e0b' }}>ทักษะ</span>
            </p>

            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={() => onNavigate('dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:11, background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'white', fontWeight:800, fontSize:'0.88rem', border:'none', cursor:'pointer', boxShadow:'0 6px 24px rgba(14,165,233,0.38)', transition:'all 0.18s' }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform=''}>
                <i className="bi bi-speedometer2"/>Dashboard
              </button>
              <button onClick={() => onNavigate('scout')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:11, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.75)', fontWeight:700, fontSize:'0.88rem', border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer', transition:'all 0.18s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.transform=''; }}>
                <i className="bi bi-person-badge-fill"/>Scout Report
              </button>
              <button onClick={() => onNavigate('performance')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:11, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.75)', fontWeight:700, fontSize:'0.88rem', border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer', transition:'all 0.18s' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.transform=''; }}>
                <i className="bi bi-clipboard-data-fill"/>บันทึกผล
              </button>
            </div>
          </div>

          {/* RIGHT: Live stats */}
          <div style={{ flex:'0 0 auto', minWidth:240 }}>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px 24px', backdropFilter:'blur(12px)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:16 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#10b981', animation:'hglow 2s ease-in-out infinite', display:'inline-block' }}/>
                <span style={{ fontSize:'0.6rem', fontWeight:800, color:'#10b981', letterSpacing:2, textTransform:'uppercase' }}>Live Data</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { num: cntAthletes, label:'นักกีฬา',    sub:'Athletes',   color:'#38bdf8' },
                  { num: cntTeams,    label:'ทีม',         sub:'Teams',      color:'#34d399' },
                  { num: cntTests,    label:'ครั้งทดสอบ',  sub:'Test Records',color:'#818cf8' },
                  { num: cntRating,   label:'Rating เฉลี่ย', sub:'Avg Rating', color:'#f59e0b', suffix:'' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign:'center', padding:'12px 8px', background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:'1.8rem', fontWeight:900, color:s.color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{s.num}{(s as any).suffix ?? '+'}</div>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(255,255,255,0.55)', marginTop:3 }}>{s.label}</div>
                    <div style={{ fontSize:'0.54rem', color:'rgba(255,255,255,0.22)', letterSpacing:0.5 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ FEATURE TICKER ════════════════════════════════════ */}
      <div style={{ marginBottom:20, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 0', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <div style={{ flexShrink:0, padding:'0 18px', borderRight:'1px solid var(--border)', fontSize:'0.6rem', fontWeight:800, color:'#38bdf8', letterSpacing:2, textTransform:'uppercase' }}>PLATFORM</div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <div style={{ display:'flex', gap:8, paddingLeft:16, animation:'ticker 28s linear infinite', width:'max-content' }}>
              {[
                '⚡ Speed 30m','🦘 CMJ Power','🔄 Agility','❤️ Yo-Yo IR1','💪 Push-up','🧘 Flexibility',
                '⚽ Ball Control','🎯 Passing','🥅 Shooting','🧠 Tactical IQ','📊 IDP Report',
                '🃏 FC26 Card','📍 Line-Up','📈 Progress','🏆 Rankings','💊 Wellness','📹 Video',
                '⚡ Speed 30m','🦘 CMJ Power','🔄 Agility','❤️ Yo-Yo IR1','💪 Push-up','🧘 Flexibility',
                '⚽ Ball Control','🎯 Passing','🥅 Shooting','🧠 Tactical IQ','📊 IDP Report',
                '🃏 FC26 Card','📍 Line-Up','📈 Progress','🏆 Rankings','💊 Wellness','📹 Video',
              ].map((item, i) => (
                <span key={i} style={{ flexShrink:0, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, padding:'3px 13px', fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ LIVE OVERVIEW ═════════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Top Performers */}
        <div className="surface hp-card" style={{ padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="bi bi-trophy-fill" style={{ color:'white', fontSize:'0.8rem' }}/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:'0.88rem' }}>Top Performers</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>อันดับนักกีฬา · Rating สูงสุด</div>
            </div>
            <button onClick={() => onNavigate('dashboard')} style={{ marginLeft:'auto', background:'none', border:'none', color:'#38bdf8', cursor:'pointer', fontSize:'0.7rem', fontWeight:700 }}>ดูทั้งหมด →</button>
          </div>
          {stats.topAthletes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:'0.8rem' }}>ยังไม่มีข้อมูลการทดสอบ</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {stats.topAthletes.map((a, i) => {
                const rating = Math.round(Number(a.Latest?.Rating) || 0);
                const medals = ['🥇','🥈','🥉','4','5'];
                return (
                  <div key={a.PlayerID} onClick={() => onNavigate('scout')}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)', cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor='#38bdf8'; (e.currentTarget as HTMLDivElement).style.background='#f0f9ff'; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLDivElement).style.borderColor=''; (e.currentTarget as HTMLDivElement).style.background='var(--bg)'; }}>
                    <span style={{ fontSize: i < 3 ? '1.1rem' : '0.75rem', fontWeight:900, width:22, textAlign:'center', color:'#94a3b8' }}>{medals[i]}</span>
                    {a.PhotoUrl
                      ? <img src={a.PhotoUrl} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover', flexShrink:0 }}/>
                      : <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#334155,#475569)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'0.9rem', fontWeight:900, color:'white' }}>{(a.Name||'?').charAt(0)}</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text-main)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.Name}</div>
                      <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{a.Position || '—'} · {a.Team || '—'}</div>
                    </div>
                    <RingBadge rating={rating} size={40}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: squad overview + alerts */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Squad Stats */}
          <div className="surface hp-card" style={{ padding:'18px 20px', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#34d399,#059669)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-pie-chart-fill" style={{ color:'white', fontSize:'0.78rem' }}/>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:'0.88rem' }}>Squad Overview</div>
                <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>ข้อมูลทีม · {athletes.length} คน</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              {[
                { label:'ทดสอบแล้ว', val:`${stats.tested.length}/${athletes.length}`, pct: athletes.length ? Math.round(stats.tested.length/athletes.length*100) : 0, color:'#10b981' },
                { label:'ยังไม่ทดสอบ', val:String(stats.untested.length), pct: athletes.length ? Math.round(stats.untested.length/athletes.length*100) : 0, color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ padding:'10px 12px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'1.35rem', fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
                  <div style={{ height:4, borderRadius:3, background:'var(--border)', marginTop:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:s.color, width:`${s.pct}%`, transition:'width 0.8s' }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Position distribution */}
            {stats.positions.length > 0 && (
              <div>
                <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>สัดส่วนตำแหน่ง</div>
                {stats.positions.map(([pos, cnt]) => (
                  <div key={pos} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-main)', minWidth:44, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pos}</span>
                    <div style={{ flex:1, height:6, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:3, background:'#38bdf8', width:`${Math.round(cnt/athletes.length*100)}%`, transition:'width 0.8s' }}/>
                    </div>
                    <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', minWidth:18, textAlign:'right' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Age groups */}
          {athletes.length > 0 && (
            <div className="surface hp-card" style={{ padding:'14px 20px' }}>
              <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>กลุ่มอายุ</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Object.entries(stats.ageCnt).filter(([,v]) => v > 0).map(([grp, cnt]) => (
                  <div key={grp} style={{ flex:'1 1 48px', textAlign:'center', padding:'8px 6px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'1.1rem', fontWeight:900, color:'#38bdf8' }}>{cnt}</div>
                    <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', fontWeight:700 }}>{grp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════ ALL FEATURES ══════════════════════════════════════ */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-main)' }}>ฟีเจอร์ทั้งหมด</div>
          <div style={{ flex:1, height:1, background:'var(--border)', minWidth:20 }}/>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding:'4px 14px', borderRadius:20, fontSize:'0.68rem', fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                  background: activeCategory === cat ? (cat === 'all' ? '#0f172a' : CATEGORY_COLORS[cat]) : 'transparent',
                  color: activeCategory === cat ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${activeCategory === cat ? 'transparent' : 'var(--border)'}`,
                }}>
                {cat === 'all' ? 'ทั้งหมด' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:10 }}>
          {filteredFeatures.map(f => (
            <button key={f.page} onClick={() => onNavigate(f.page)}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = f.color + '12';
                el.style.borderColor = f.color + '60';
                el.style.transform = 'translateY(-2px)';
                const icon = el.querySelector('.feat-icon-wrap') as HTMLElement | null;
                if (icon) icon.style.boxShadow = `0 6px 20px ${f.color}55`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = 'var(--surface)';
                el.style.borderColor = 'var(--border)';
                el.style.transform = '';
                const icon = el.querySelector('.feat-icon-wrap') as HTMLElement | null;
                if (icon) icon.style.boxShadow = '';
              }}
              style={{ textAlign:'left', cursor:'pointer', borderRadius:12, padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10, transition:'all 0.18s', width:'100%' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div className="feat-icon-wrap" style={{ width:36, height:36, borderRadius:10, background: f.color + '18', display:'flex', alignItems:'center', justifyContent:'center', transition:'box-shadow 0.18s' }}>
                  <i className={`bi ${f.icon}`} style={{ color: f.color, fontSize:'0.95rem' }}/>
                </div>
                <span style={{ fontSize:'0.52rem', fontWeight:800, color:'var(--text-muted)', background:'var(--bg)', padding:'2px 6px', borderRadius:5, letterSpacing:0.5, border:'1px solid var(--border)' }}>
                  {CATEGORY_LABELS[f.category]}
                </span>
              </div>
              <div>
                <div className="feat-label" style={{ fontWeight:800, fontSize:'0.82rem', color:'var(--text-main)', transition:'color 0.18s' }}>{f.label}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:2, fontWeight:500 }}>{f.labelTH}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══════ HOW IT WORKS ══════════════════════════════════════ */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontWeight:800, fontSize:'0.95rem', color:'var(--text-main)', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          ขั้นตอนการทำงาน
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'24px 20px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,#818cf8,#f59e0b,#10b981,#f472b6)' }}/>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-around', flexWrap:'wrap', gap:8 }}>
            {[
              { emoji:'🏃', num:'01', label:'ลงทะเบียน',    sub:'เพิ่มข้อมูลนักกีฬา',      color:'#38bdf8', page:'register' as Page },
              { emoji:'📋', num:'02', label:'บันทึกผล',     sub:'ทดสอบสมรรถภาพ',           color:'#818cf8', page:'performance' as Page },
              { emoji:'⭐', num:'03', label:'ประเมินทักษะ', sub:'5 หมวดเทคนิคฟุตบอล',     color:'#f59e0b', page:'skill' as Page },
              { emoji:'📊', num:'04', label:'รายงาน IDP',   sub:'แผนพัฒนารายบุคคล',        color:'#10b981', page:'ir' as Page },
              { emoji:'🏆', num:'05', label:'ติดตามผล',     sub:'Dashboard + Scout Report', color:'#f472b6', page:'dashboard' as Page },
            ].map((step, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', flexShrink:0 }}>
                {i > 0 && (
                  <div style={{ color:'#cbd5e1', fontSize:'1.4rem', paddingTop:18, margin:'0 4px' }}>›</div>
                )}
                <button onClick={() => onNavigate(step.page)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:86, background:'none', border:'none', cursor:'pointer', padding:'8px 4px', borderRadius:12, transition:'background 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background=step.color+'12')}
                  onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                  <div style={{ position:'relative' }}>
                    <div style={{ width:52, height:52, borderRadius:14, fontSize:'1.4rem', display:'flex', alignItems:'center', justifyContent:'center', background:`${step.color}14`, border:`1.5px solid ${step.color}40` }}>{step.emoji}</div>
                    <div style={{ position:'absolute', top:-8, right:-8, width:20, height:20, borderRadius:'50%', background:step.color, color:'white', fontSize:'0.56rem', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${step.color}55` }}>{step.num}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:800, color:step.color }}>{step.label}</div>
                    <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', lineHeight:1.4, marginTop:2 }}>{step.sub}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ CTA FOOTER ════════════════════════════════════════ */}
      <div style={{
        position:'relative', overflow:'hidden', borderRadius:18,
        background:'linear-gradient(135deg,#03081e 0%,#0a1530 50%,#060e24 100%)',
        border:'1px solid rgba(56,189,248,0.1)',
        padding:'40px 36px', textAlign:'center',
        boxShadow:'0 4px 48px rgba(0,15,60,0.4)',
      }}>
        <div style={{ position:'absolute', top:'-40%', left:'50%', transform:'translateX(-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.09) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.22)', borderRadius:20, padding:'4px 14px', marginBottom:16 }}>
            <span>🏆</span>
            <span style={{ fontSize:'0.62rem', fontWeight:800, color:'#f59e0b', letterSpacing:2, textTransform:'uppercase' }}>ISP Improve Sports Performance</span>
          </div>
          <h2 style={{ fontSize:'clamp(1.4rem,2.5vw,2rem)', fontWeight:900, color:'white', lineHeight:1.2, marginBottom:12 }}>
            สร้างขึ้นเพื่อ<span style={{ color:'#38bdf8' }}> โค้ช · สเกาต์ </span>และ<span style={{ color:'#f59e0b' }}> สโมสร </span>ที่เชื่อในข้อมูล
          </h2>
          <p style={{ fontSize:'0.88rem', color:'rgba(255,255,255,0.38)', lineHeight:1.7, maxWidth:480, margin:'0 auto 24px' }}>
            เชื่อมช่องว่างระหว่าง<strong style={{ color:'rgba(255,255,255,0.65)' }}> พรสวรรค์ดิบ </strong>กับ<strong style={{ color:'rgba(255,255,255,0.65)' }}> การเติบโตที่มีแผน </strong>ด้วยข้อมูลที่วัดผลได้จริง
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'12px 24px', borderRadius:11, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', fontWeight:800, fontSize:'0.88rem', border:'none', cursor:'pointer', boxShadow:'0 6px 24px rgba(245,158,11,0.38)', transition:'all 0.18s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform=''}>
              <i className="bi bi-speedometer2"/>เข้าสู่ Dashboard
            </button>
            <button onClick={() => onNavigate('roster')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'12px 24px', borderRadius:11, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.7)', fontWeight:700, fontSize:'0.88rem', border:'1px solid rgba(255,255,255,0.13)', cursor:'pointer', transition:'all 0.18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.transform=''; }}>
              <i className="bi bi-people-fill"/>ดูรายชื่อนักกีฬา
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
