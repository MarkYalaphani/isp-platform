'use client';
import { useRef } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Athlete, TestRecord, SkillAssessment, IRReport } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface AIReport {
  potentialRating: number;
  potentialLabel: string;
  potentialLabelTH: string;
  executiveSummary: string;
  physicalAnalysis: string;
  technicalAnalysis: string;
  characterAnalysis: string;
  strengths: string[];
  developmentAreas: string[];
  trainingPlan: string[];
  scoutVerdict: string;
  parentMessage: string;
}

interface Props {
  athlete: Athlete;
  aiReport: AIReport;
  latestSkill: SkillAssessment | null;
  latestIR: IRReport | null;
  attendanceRate: number | null;
  matchStats: { matches: number; goals: number; assists: number; avgRating: number } | null;
  generatedAt: string;
  onClose: () => void;
}

const METRICS = [
  { key:'speed30',  field:'Speed30',     label:'ความเร็ว', unit:'s',    hi:false, color:'#f472b6' },
  { key:'cmj',      field:'CMJ',         label:'CMJ',      unit:'cm',   hi:true,  color:'#818cf8' },
  { key:'agility',  field:'Agility',     label:'คล่องตัว', unit:'s',    hi:false, color:'#fb923c' },
  { key:'yoyo',     field:'YoYo',        label:'โยโย่',    unit:'m',    hi:true,  color:'#f87171' },
  { key:'longjump', field:'LongJump',    label:'กระโดดไกล',unit:'cm',   hi:true,  color:'#a3e635' },
  { key:'pushup',   field:'Pushup',      label:'วิดพื้น',  unit:'reps', hi:true,  color:'#4ade80' },
  { key:'situp',    field:'Situp',       label:'ซิทอัพ',   unit:'reps', hi:true,  color:'#facc15' },
  { key:'sitreach', field:'SitAndReach', label:'ยืดหยุ่น', unit:'cm',   hi:true,  color:'#38bdf8' },
] as const;

const SKILL_CATS = [
  { key:'scoreBallControl', label:'Ball Control', color:'#38bdf8' },
  { key:'scorePassing',     label:'Passing',      color:'#34d399' },
  { key:'scoreDribbling',   label:'Dribbling',    color:'#f59e0b' },
  { key:'scoreShooting',    label:'Shooting',     color:'#f87171' },
  { key:'scoreTactical',    label:'Tactical IQ',  color:'#a78bfa' },
] as const;

function calcAge(dob: string) {
  if (!dob || dob === '-') return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 31557600000);
}
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' }); }
  catch { return s; }
}

export default function ScoutReportModal({ athlete, aiReport, latestSkill, latestIR, attendanceRate, matchStats, generatedAt, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const age = calcAge(athlete.DOB);
  const latest = athlete.Latest as Partial<TestRecord>;
  const rating = Number(latest?.Rating) || 0;

  const scores: Record<string, number> = {};
  METRICS.forEach(m => {
    const s = getScorePoint(m.key, latest[m.field as keyof TestRecord] || '', athlete.DOB, athlete.Position);
    if (s > 0) scores[m.key] = s;
  });

  const radarData = {
    labels: METRICS.filter(m => scores[m.key] > 0).map(m => m.label),
    datasets: [{
      data: METRICS.filter(m => scores[m.key] > 0).map(m => scores[m.key]),
      backgroundColor: 'rgba(56,189,248,0.15)',
      borderColor: '#38bdf8',
      borderWidth: 2,
      pointBackgroundColor: '#0f172a',
      pointRadius: 4,
    }],
  };

  const potColor = aiReport.potentialRating >= 80 ? '#10b981'
    : aiReport.potentialRating >= 65 ? '#38bdf8'
    : aiReport.potentialRating >= 50 ? '#f59e0b' : '#ef4444';

  const handlePrint = () => window.print();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:5000, overflowY:'auto', backdropFilter:'blur(6px)' }}>
      {/* Toolbar */}
      <div className="no-print" style={{ position:'sticky', top:0, zIndex:10, background:'rgba(15,23,42,0.95)', borderBottom:'1px solid rgba(255,255,255,0.1)', padding:'10px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, fontWeight:800, color:'white', fontSize:'0.9rem' }}>
          <i className="bi bi-file-earmark-person-fill me-2" style={{ color:'#38bdf8' }}/>
          AI Scout Report — {athlete.Name}
        </div>
        <button onClick={handlePrint} className="btn-primary" style={{ padding:'6px 16px', fontSize:'0.8rem' }}>
          <i className="bi bi-printer-fill me-1"/>พิมพ์ / PDF
        </button>
        <button onClick={onClose} style={{ background:'none', border:'1px solid rgba(255,255,255,0.2)', color:'white', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:'0.85rem' }}>
          <i className="bi bi-x-lg"/>
        </button>
      </div>

      {/* Report content */}
      <div ref={printRef} style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px 60px' }}>

        {/* ══ COVER ══ */}
        <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#0c1a3a 50%,#0f172a 100%)', borderRadius:20, padding:'36px 36px 28px', marginBottom:20, position:'relative', overflow:'hidden', border:'1px solid rgba(56,189,248,0.2)' }}>
          {/* Background pattern */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%, rgba(56,189,248,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(129,140,248,0.06) 0%, transparent 50%)', pointerEvents:'none' }}/>

          <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap', position:'relative' }}>
            {/* Photo */}
            <div style={{ width:110, height:140, borderRadius:14, overflow:'hidden', flexShrink:0, border:'3px solid rgba(56,189,248,0.4)', background:'#1e293b', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
              {athlete.PhotoUrl
                ? <img src={athlete.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
                : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', color:'#38bdf8', fontWeight:900 }}>
                    {(athlete.Name||'?')[0].toUpperCase()}
                  </div>
              }
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:'0.62rem', fontWeight:800, color:'#38bdf8', letterSpacing:3, textTransform:'uppercase', marginBottom:6 }}>
                ISP Improve Sports Performance · Scout Report
              </div>
              <div style={{ fontWeight:900, fontSize:'2rem', color:'white', lineHeight:1.1, marginBottom:6 }}>
                {athlete.Name}
              </div>
              {athlete.Nickname && <div style={{ fontSize:'1rem', color:'rgba(255,255,255,0.5)', marginBottom:10 }}>"{athlete.Nickname}"</div>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                {[
                  { icon:'bi-person-fill',    val: athlete.Position || 'ไม่ระบุตำแหน่ง' },
                  { icon:'bi-people-fill',     val: athlete.Team || '—' },
                  { icon:'bi-calendar3',       val: age ? `${age} ปี` : athlete.DOB || '—' },
                  { icon:'bi-geo-alt-fill',    val: athlete.Province || athlete.Club || '—' },
                  { icon:'bi-lightning-fill',  val: `เท้า${athlete.DomFoot || '?'}` },
                ].map(x => (
                  <span key={x.icon} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'4px 12px', fontSize:'0.72rem', color:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center', gap:5 }}>
                    <i className={`bi ${x.icon}`} style={{ color:'#38bdf8', fontSize:'0.7rem' }}/>{x.val}
                  </span>
                ))}
              </div>
              {/* AI Summary */}
              <div style={{ background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:10, padding:'12px 16px', fontSize:'0.83rem', color:'rgba(255,255,255,0.85)', lineHeight:1.65, fontStyle:'italic' }}>
                "{aiReport.executiveSummary}"
              </div>
            </div>

            {/* Rating & Potential */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ textAlign:'center', background:'rgba(255,255,255,0.04)', border:'2px solid rgba(56,189,248,0.3)', borderRadius:14, padding:'14px 20px', minWidth:110 }}>
                <div style={{ fontSize:'0.55rem', fontWeight:800, color:'#38bdf8', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>OVERALL</div>
                <div style={{ fontSize:'3rem', fontWeight:900, color:'#38bdf8', lineHeight:1 }}>{rating}</div>
                <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>/ 100</div>
              </div>
              <div style={{ textAlign:'center', background:`${potColor}18`, border:`2px solid ${potColor}50`, borderRadius:14, padding:'12px 16px', minWidth:110 }}>
                <div style={{ fontSize:'0.55rem', fontWeight:800, color:potColor, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>POTENTIAL</div>
                <div style={{ fontSize:'2rem', fontWeight:900, color:potColor, lineHeight:1 }}>{aiReport.potentialRating}</div>
                <div style={{ fontSize:'0.6rem', color:potColor, marginTop:4, fontWeight:700 }}>{aiReport.potentialLabelTH}</div>
              </div>
            </div>
          </div>

          {/* Test count badge */}
          <div style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'4px 10px', fontSize:'0.65rem', color:'rgba(255,255,255,0.4)' }}>
            {(athlete.History||[]).length} test records
          </div>
        </div>

        {/* ══ SECTION 1: PHYSICAL PROFILE ══ */}
        <div style={{ background:'var(--surface,#1e293b)', borderRadius:16, padding:'24px 28px', marginBottom:16, border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:4, height:20, background:'#f472b6', borderRadius:2 }}/>
            <h3 style={{ margin:0, fontWeight:900, fontSize:'1rem', color:'var(--text,white)' }}>
              <i className="bi bi-lightning-charge-fill me-2" style={{ color:'#f472b6' }}/>ส่วนที่ 1 — สมรรถภาพทางกาย
            </h3>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
            {/* Radar */}
            <div style={{ height:220, position:'relative' }}>
              {radarData.labels.length >= 3
                ? <Radar data={radarData} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ r:{ min:0, max:5, ticks:{ stepSize:1, font:{ size:9 }, color:'rgba(255,255,255,0.3)' }, grid:{ color:'rgba(255,255,255,0.08)' }, angleLines:{ color:'rgba(255,255,255,0.08)' }, pointLabels:{ color:'rgba(255,255,255,0.6)', font:{ size:9, weight:700 } } } } }}/>
                : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'rgba(255,255,255,0.3)', fontSize:'0.8rem' }}>ข้อมูลไม่เพียงพอสำหรับ Radar</div>
              }
            </div>

            {/* Metric bars */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {METRICS.map(m => {
                const sc = scores[m.key] || 0;
                if (sc === 0) return null;
                const cfg = SCORE_COLORS[sc];
                const raw = String(latest[m.field as keyof TestRecord] || '');
                return (
                  <div key={m.key}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text,white)' }}>{m.label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)' }}>{raw}{m.unit}</span>
                        <span style={{ fontSize:'0.65rem', fontWeight:800, background:cfg?.bg||'#1e293b', color:cfg?.color||'#94a3b8', borderRadius:5, padding:'1px 6px' }}>{cfg?.labelTH || sc}</span>
                      </div>
                    </div>
                    <div style={{ height:6, borderRadius:6, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:6, background:m.color, width:`${sc/5*100}%`, transition:'width 0.6s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop:18, padding:'14px 18px', background:'rgba(244,114,182,0.06)', border:'1px solid rgba(244,114,182,0.15)', borderRadius:10, fontSize:'0.83rem', color:'rgba(255,255,255,0.8)', lineHeight:1.7 }}>
            {aiReport.physicalAnalysis}
          </div>
        </div>

        {/* ══ SECTION 2: TECHNICAL ASSESSMENT ══ */}
        {latestSkill && (
          <div style={{ background:'var(--surface,#1e293b)', borderRadius:16, padding:'24px 28px', marginBottom:16, border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ width:4, height:20, background:'#34d399', borderRadius:2 }}/>
              <h3 style={{ margin:0, fontWeight:900, fontSize:'1rem', color:'var(--text,white)' }}>
                <i className="bi bi-bullseye me-2" style={{ color:'#34d399' }}/>ส่วนที่ 2 — ทักษะฟุตบอล (Skill Assessment)
              </h3>
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', fontWeight:800, color:'#34d399', background:'rgba(52,211,153,0.12)', borderRadius:8, padding:'3px 10px' }}>
                {latestSkill.scoreTotal}%
              </span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:18 }}>
              {SKILL_CATS.map(cat => {
                const val = latestSkill[cat.key] as number || 0;
                return (
                  <div key={cat.key} style={{ textAlign:'center', padding:'12px 8px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:`1px solid ${cat.color}30` }}>
                    <div style={{ fontSize:'1.8rem', fontWeight:900, color:cat.color, lineHeight:1 }}>{val}%</div>
                    <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', fontWeight:700, marginTop:4 }}>{cat.label}</div>
                    <div style={{ marginTop:6, height:4, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:4, background:cat.color, width:`${val}%` }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding:'14px 18px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.15)', borderRadius:10, fontSize:'0.83rem', color:'rgba(255,255,255,0.8)', lineHeight:1.7 }}>
              {aiReport.technicalAnalysis}
            </div>
          </div>
        )}

        {/* ══ SECTION 3: CHARACTER PROFILE ══ */}
        {latestIR && (
          <div style={{ background:'var(--surface,#1e293b)', borderRadius:16, padding:'24px 28px', marginBottom:16, border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ width:4, height:20, background:'#818cf8', borderRadius:2 }}/>
              <h3 style={{ margin:0, fontWeight:900, fontSize:'1rem', color:'var(--text,white)' }}>
                <i className="bi bi-emoji-smile-fill me-2" style={{ color:'#818cf8' }}/>ส่วนที่ 3 — บุคลิกและทัศนคติ (IDP Profile)
              </h3>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'🧠 พฤติกรรม', val:latestIR.BehaviourScore, color:'#818cf8' },
                { label:'🌿 วิถีชีวิต', val:latestIR.LifestyleScore, color:'#34d399' },
                { label:'⚽ ทักษะ IDP', val:latestIR.TechnicalScore, color:'#f472b6' },
              ].map(x => (
                <div key={x.label} style={{ textAlign:'center', padding:'14px 10px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:`1px solid ${x.color}30` }}>
                  <div style={{ fontSize:'1.6rem', fontWeight:900, color:x.color, lineHeight:1 }}>{x.val}%</div>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)', marginTop:4 }}>{x.label}</div>
                  <div style={{ marginTop:6, height:4, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:x.color, width:`${x.val}%` }}/>
                  </div>
                </div>
              ))}
            </div>

            {latestIR.IdpDream && (
              <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(255,255,255,0.04)', borderRadius:8, borderLeft:'3px solid #f59e0b' }}>
                <span style={{ fontSize:'0.65rem', fontWeight:800, color:'#f59e0b', textTransform:'uppercase', letterSpacing:1 }}>ความฝัน</span>
                <p style={{ margin:'4px 0 0', fontSize:'0.83rem', color:'rgba(255,255,255,0.8)', fontStyle:'italic' }}>"{latestIR.IdpDream}"</p>
              </div>
            )}

            <div style={{ padding:'14px 18px', background:'rgba(129,140,248,0.06)', border:'1px solid rgba(129,140,248,0.15)', borderRadius:10, fontSize:'0.83rem', color:'rgba(255,255,255,0.8)', lineHeight:1.7 }}>
              {aiReport.characterAnalysis}
            </div>
          </div>
        )}

        {/* ══ SECTION 4: PERFORMANCE RECORD ══ */}
        {(matchStats || attendanceRate !== null) && (
          <div style={{ background:'var(--surface,#1e293b)', borderRadius:16, padding:'24px 28px', marginBottom:16, border:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{ width:4, height:20, background:'#fb923c', borderRadius:2 }}/>
              <h3 style={{ margin:0, fontWeight:900, fontSize:'1rem', color:'var(--text,white)' }}>
                <i className="bi bi-trophy-fill me-2" style={{ color:'#fb923c' }}/>ส่วนที่ 4 — ผลการแข่งขัน & ความสม่ำเสมอ
              </h3>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
              {matchStats && [
                { label:'แมทช์', val:matchStats.matches, color:'#fb923c', icon:'bi-shield-fill' },
                { label:'ประตู', val:matchStats.goals, color:'#10b981', icon:'bi-dribbble' },
                { label:'Assist', val:matchStats.assists, color:'#38bdf8', icon:'bi-people-fill' },
                { label:'Avg Rating', val:matchStats.avgRating.toFixed(1), color:'#818cf8', icon:'bi-star-fill' },
              ].map(x => (
                <div key={x.label} style={{ textAlign:'center', padding:'14px 8px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:`1px solid rgba(255,255,255,0.06)` }}>
                  <i className={`bi ${x.icon}`} style={{ fontSize:'1.2rem', color:x.color, display:'block', marginBottom:6 }}/>
                  <div style={{ fontSize:'1.6rem', fontWeight:900, color:x.color, lineHeight:1 }}>{x.val}</div>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', marginTop:4 }}>{x.label}</div>
                </div>
              ))}
              {attendanceRate !== null && (
                <div style={{ textAlign:'center', padding:'14px 8px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <i className="bi bi-check2-circle" style={{ fontSize:'1.2rem', color:'#34d399', display:'block', marginBottom:6 }}/>
                  <div style={{ fontSize:'1.6rem', fontWeight:900, color:'#34d399', lineHeight:1 }}>{attendanceRate}%</div>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', marginTop:4 }}>Attendance</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SECTION 5: SCOUT VERDICT ══ */}
        <div style={{ background:`linear-gradient(135deg,#0f172a,${potColor}18,#0f172a)`, borderRadius:16, padding:'28px 32px', marginBottom:16, border:`1px solid ${potColor}30`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:`${potColor}08`, pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
            <div style={{ width:4, height:20, background:potColor, borderRadius:2 }}/>
            <h3 style={{ margin:0, fontWeight:900, fontSize:'1rem', color:'white' }}>
              <i className="bi bi-clipboard2-pulse-fill me-2" style={{ color:potColor }}/>ส่วนที่ 5 — Scout Verdict & แผนพัฒนา
            </h3>
            <span style={{ marginLeft:'auto', background:`${potColor}22`, color:potColor, border:`1px solid ${potColor}40`, borderRadius:20, padding:'4px 14px', fontSize:'0.75rem', fontWeight:800 }}>
              {aiReport.potentialLabel} · {aiReport.potentialRating}/100
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#10b981', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>✅ จุดแข็ง</div>
              {aiReport.strengths.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:'0.8rem', color:'rgba(255,255,255,0.8)' }}>
                  <span style={{ color:'#10b981', fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#f59e0b', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>🎯 พัฒนาได้</div>
              {aiReport.developmentAreas.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:'0.8rem', color:'rgba(255,255,255,0.8)' }}>
                  <span style={{ color:'#f59e0b', fontWeight:800, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6-month plan */}
          <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
            <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#38bdf8', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>📋 แผนพัฒนา 6 เดือน</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
              {aiReport.trainingPlan.map((t, i) => (
                <div key={i} style={{ display:'flex', gap:8, padding:'8px 12px', background:'rgba(56,189,248,0.06)', borderRadius:8, border:'1px solid rgba(56,189,248,0.15)' }}>
                  <span style={{ background:'#38bdf8', color:'#0f172a', borderRadius:5, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:900, flexShrink:0 }}>{i+1}</span>
                  <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.8)', lineHeight:1.4 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict */}
          <div style={{ padding:'16px 20px', background:`${potColor}10`, border:`1px solid ${potColor}30`, borderRadius:12, marginBottom:16, borderLeft:`4px solid ${potColor}` }}>
            <div style={{ fontSize:'0.62rem', fontWeight:800, color:potColor, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>🔍 SCOUT VERDICT</div>
            <p style={{ margin:0, fontSize:'0.88rem', color:'rgba(255,255,255,0.9)', lineHeight:1.7, fontStyle:'italic' }}>
              "{aiReport.scoutVerdict}"
            </p>
          </div>

          {/* Parent message */}
          <div style={{ padding:'14px 18px', background:'rgba(255,255,255,0.04)', borderRadius:12, borderLeft:'4px solid #f472b6' }}>
            <div style={{ fontSize:'0.62rem', fontWeight:800, color:'#f472b6', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>💌 ข้อความถึงผู้ปกครอง</div>
            <p style={{ margin:0, fontSize:'0.85rem', color:'rgba(255,255,255,0.85)', lineHeight:1.7 }}>{aiReport.parentMessage}</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)', fontSize:'0.68rem', color:'rgba(255,255,255,0.3)' }}>
          <span><i className="bi bi-shield-check me-1" style={{ color:'#38bdf8' }}/>รายงานนี้สร้างโดย ISP Platform · AI Scout Engine (Claude)</span>
          <span>{fmtDate(generatedAt)}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(.print-root) { display: none !important; }
          .no-print { display: none !important; }
          div[style*="position:fixed"] { position: static !important; overflow: visible !important; background: white !important; }
        }
      `}</style>
    </div>
  );
}
