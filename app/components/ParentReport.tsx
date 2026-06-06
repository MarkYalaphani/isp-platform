'use client';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip,
  CategoryScale, LinearScale,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { Athlete, User, IRReport, SkillAssessment, AttendanceRecord, WellnessRecord, RPERecord } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, CategoryScale, LinearScale);

interface PlayerMatchPerf {
  id: string; matchId: string; playerId: string;
  minutesPlayed: number; goals: number; assists: number;
  yellowCards: number; redCards: number; rating: number;
  notes: string; matchDate: string; opponent: string;
  teamName: string; matchType: string;
}

interface Props {
  athlete: Athlete;
  user: User;
  onClose: () => void;
  irHistory?: IRReport[];
  latestSkill?: SkillAssessment | null;
  attendanceRecs?: AttendanceRecord[];
  wellnessRecs?: WellnessRecord[];
  rpeRecs?: RPERecord[];
  matchPerf?: PlayerMatchPerf[];
}

const METRICS = [
  { key:'speed30',  field:'Speed30',     label:'ความเร็ว 30 ม.',   unit:'s',    hi:false, icon:'⚡' },
  { key:'cmj',      field:'CMJ',         label:'พลังกระโดด (CMJ)', unit:'cm',   hi:true,  icon:'↑' },
  { key:'agility',  field:'Agility',     label:'ความคล่องตัว',     unit:'s',    hi:false, icon:'↗' },
  { key:'situp',    field:'Situp',       label:'ลุก-นั่ง',          unit:'reps', hi:true,  icon:'💪' },
  { key:'longjump', field:'LongJump',    label:'กระโดดไกล',         unit:'cm',   hi:true,  icon:'→' },
  { key:'yoyo',     field:'YoYo',        label:'วิ่งรับ (Shuttle)', unit:'m',    hi:true,  icon:'♥' },
  { key:'pushup',   field:'Pushup',      label:'วิดพื้น',            unit:'reps', hi:true,  icon:'▲' },
  { key:'sitreach', field:'SitAndReach', label:'ความยืดหยุ่น',      unit:'cm',   hi:true,  icon:'~' },
] as const;

const SKILL_CATS = [
  { key:'scoreBallControl', label:'Ball Control / ควบคุมบอล', color:'#38bdf8' },
  { key:'scorePassing',     label:'Passing / การส่งบอล',       color:'#34d399' },
  { key:'scoreDribbling',   label:'Dribbling / การเลี้ยงบอล',  color:'#f59e0b' },
  { key:'scoreShooting',    label:'Shooting / การยิง',          color:'#f87171' },
  { key:'scoreTactical',    label:'Tactical IQ / ยุทธวิธี',     color:'#a78bfa' },
] as const;

function calcAge(dob: string) {
  if (!dob || dob === '-') return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / 31557600000);
  return age >= 0 && age <= 120 ? age : null;
}

function ratingLabel(r: number) {
  if (r >= 80) return { th:'ยอดเยี่ยม', en:'Elite',   color:'#10b981' };
  if (r >= 65) return { th:'ดี',         en:'Good',    color:'#38bdf8' };
  if (r >= 50) return { th:'ปานกลาง',   en:'Average', color:'#f59e0b' };
  if (r >= 35) return { th:'พัฒนาได้',  en:'Fair',    color:'#f97316' };
  return              { th:'ต้องพัฒนา', en:'Poor',    color:'#ef4444' };
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ height:6, borderRadius:6, background:'#e2e8f0', overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', borderRadius:6, background:color, width:`${Math.min(100,(value/max)*100)}%` }}/>
    </div>
  );
}

function SectionTitle({ icon, title, color = '#38bdf8' }: { icon: string; title: string; color?: string }) {
  return (
    <div style={{ fontWeight:800, fontSize:'1rem', color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ width:4, height:16, background:color, borderRadius:2, display:'inline-block' }}/>
      <i className={`bi ${icon}`} style={{ color, fontSize:'0.95rem' }}/> {title}
    </div>
  );
}

export default function ParentReport({ athlete: a, user, onClose, irHistory = [], latestSkill, attendanceRecs = [], wellnessRecs = [], rpeRecs = [], matchPerf = [] }: Props) {
  const age      = calcAge(a.DOB);
  const rating   = Number(a.Latest?.Rating) || 0;
  const rl       = ratingLabel(rating);
  const lastTest = a.History?.length ? a.History[a.History.length - 1]?.Timestamp?.split(' ')[0] || '—' : '—';
  const printDate = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  // Attendance stats
  const attTotal   = attendanceRecs.length;
  const attPresent = attendanceRecs.filter(r => r.status === 'present').length;
  const attLate    = attendanceRecs.filter(r => r.status === 'late').length;
  const attAbsent  = attendanceRecs.filter(r => r.status === 'absent').length;
  const attRate    = attTotal ? Math.round((attPresent + attLate) / attTotal * 100) : null;

  // Wellness avg
  const wellAvg = wellnessRecs.length
    ? Math.round(wellnessRecs.slice(0,10).reduce((s,r) => s + (r.wellnessScore||0), 0) / Math.min(wellnessRecs.length,10))
    : null;

  // Training Load
  const rpeAvg = rpeRecs.length
    ? Math.round(rpeRecs.slice(0,10).reduce((s,r) => s + (r.rpe||0), 0) / Math.min(rpeRecs.length,10) * 10) / 10
    : null;
  const avgLoad = rpeRecs.length
    ? Math.round(rpeRecs.slice(0,10).reduce((s,r) => s + (r.trainingLoad||0), 0) / Math.min(rpeRecs.length,10))
    : null;

  // Match stats
  const apps    = matchPerf.length;
  const goals   = matchPerf.reduce((s,r) => s + (r.goals||0), 0);
  const assists = matchPerf.reduce((s,r) => s + (r.assists||0), 0);
  const mins    = matchPerf.reduce((s,r) => s + (r.minutesPlayed||0), 0);
  const ycards  = matchPerf.reduce((s,r) => s + (r.yellowCards||0), 0);
  const rcards  = matchPerf.reduce((s,r) => s + (r.redCards||0), 0);
  const matchRatings = matchPerf.filter(r => r.rating > 0).map(r => r.rating);
  const avgMatchRating = matchRatings.length ? (matchRatings.reduce((s,r)=>s+r,0)/matchRatings.length).toFixed(1) : null;

  // Latest IR
  const latestIR = irHistory[0] || null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-page { box-shadow: none !important; border: none !important; }
          .page-break { page-break-before: always; }
        }
        .report-page { max-width: 800px; margin: 0 auto; background: white; font-family: 'Prompt', sans-serif; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, background:'#0f172a', padding:'10px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'white', fontWeight:700, fontSize:'0.9rem' }}>
          <i className="bi bi-file-earmark-person me-2"/>Parent Report — {a.Name}
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => window.print()} style={{ padding:'7px 16px', borderRadius:8, background:'#38bdf8', border:'none', fontWeight:700, cursor:'pointer', color:'#0f172a', fontSize:'0.85rem' }}>
            <i className="bi bi-printer me-1"/>พิมพ์ / PDF
          </button>
          <button onClick={onClose} style={{ padding:'7px 12px', borderRadius:8, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', cursor:'pointer', fontSize:'0.85rem' }}>
            <i className="bi bi-x-lg"/>
          </button>
        </div>
      </div>
      <div style={{ paddingTop:60 }} className="no-print"/>

      <div className="report-page" style={{ padding:'32px 40px', boxShadow:'0 4px 40px rgba(0,0,0,0.12)' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24, paddingBottom:20, borderBottom:'3px solid #0f172a' }}>
          {a.PhotoUrl
            ? <img src={a.PhotoUrl} alt="" style={{ width:80, height:80, borderRadius:12, objectFit:'cover', objectPosition:'top', flexShrink:0 }}/>
            : <div style={{ width:80, height:80, borderRadius:12, background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'2rem', color:'white', flexShrink:0 }}>{(a.Name||'?')[0]}</div>
          }
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#0f172a' }}>{a.Name}</div>
            {a.Nickname && <div style={{ fontSize:'0.9rem', color:'#64748b', fontStyle:'italic' }}>"{a.Nickname}"</div>}
            <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap', fontSize:'0.82rem', color:'#475569' }}>
              {a.Team && <span><strong>รุ่น:</strong> {a.Team}</span>}
              {a.Position && <span><strong>ตำแหน่ง:</strong> {a.Position}</span>}
              {age !== null && <span><strong>อายุ:</strong> {age} ปี</span>}
              {a.Club && <span><strong>สโมสร:</strong> {a.Club}</span>}
              {a.DomFoot && <span><strong>เท้าถนัด:</strong> {a.DomFoot}</span>}
            </div>
          </div>
          {user.logoUrl
            ? <img src={user.logoUrl} alt="" style={{ width:56, height:56, objectFit:'contain', flexShrink:0 }}/>
            : <div style={{ textAlign:'right', flexShrink:0 }}><div style={{ fontWeight:900, fontSize:'0.75rem', color:'#38bdf8', letterSpacing:2 }}>ISP</div><div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>Sports Performance</div></div>
          }
        </div>

        {/* ── Overall Rating ── */}
        <div style={{ display:'flex', gap:16, marginBottom:24, padding:'16px 20px', background:rl.color+'15', borderRadius:12, border:`2px solid ${rl.color}30` }}>
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div style={{ fontSize:'3rem', fontWeight:900, color:rl.color, lineHeight:1 }}>{rating || '—'}</div>
            <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>Overall</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:'1.1rem', color:rl.color }}>{rl.th} — {rl.en}</div>
            <div style={{ fontSize:'0.78rem', color:'#64748b', marginTop:4 }}>
              ผลทดสอบล่าสุด: {lastTest} · ทดสอบทั้งหมด {a.History?.length || 0} ครั้ง
            </div>
            <div style={{ height:8, borderRadius:8, background:'rgba(0,0,0,0.08)', marginTop:8, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:8, background:rl.color, width:`${rating}%`, transition:'width 0.5s' }}/>
            </div>
          </div>
        </div>

        {/* ── Quick Stats Row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:24 }}>
          {attRate !== null && (
            <div style={{ background:'#f0fdf4', borderRadius:10, padding:'12px 14px', textAlign:'center', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#10b981' }}>{attRate}%</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>การเข้าซ้อม</div>
            </div>
          )}
          {wellAvg !== null && (
            <div style={{ background:'#fef3c7', borderRadius:10, padding:'12px 14px', textAlign:'center', border:'1px solid #fde68a' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#d97706' }}>{wellAvg}</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>Wellness Score</div>
            </div>
          )}
          {apps > 0 && (
            <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px', textAlign:'center', border:'1px solid #bfdbfe' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#2563eb' }}>{apps}</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>ลงแข่ง (นัด)</div>
            </div>
          )}
          {apps > 0 && (
            <div style={{ background:'#fdf2f8', borderRadius:10, padding:'12px 14px', textAlign:'center', border:'1px solid #fbcfe8' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#be185d' }}>{goals}G / {assists}A</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>Goals / Assists</div>
            </div>
          )}
          {latestIR && (
            <div style={{ background:'#f5f3ff', borderRadius:10, padding:'12px 14px', textAlign:'center', border:'1px solid #ddd6fe' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#7c3aed' }}>{latestIR.OverallIRScore || '—'}</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>IDP Score</div>
            </div>
          )}
        </div>

        {/* ── Physical Metrics ── */}
        <div style={{ marginBottom:24 }}>
          <SectionTitle icon="bi-activity" title="ผลการทดสอบสมรรถภาพ" color="#38bdf8"/>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['การทดสอบ','ผลล่าสุด','คะแนน','ระดับ'].map(h => (
                  <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontWeight:700, color:'#64748b', borderBottom:'2px solid #e2e8f0', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => {
                const raw = String(a.Latest?.[m.field as keyof typeof a.Latest] || '');
                const val = parseFloat(raw);
                const hasVal = !isNaN(val) && val > 0;
                const score = hasVal ? getScorePoint(m.key, raw, a.DOB || '', a.Position || '') : 0;
                const sc = score > 0 ? SCORE_COLORS[score] : null;
                return (
                  <tr key={m.key} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'8px 12px', fontWeight:600 }}><span style={{ marginRight:6 }}>{m.icon}</span>{m.label}</td>
                    <td style={{ padding:'8px 12px', fontWeight:700, color:hasVal?'#0f172a':'#94a3b8' }}>{hasVal ? `${val} ${m.unit}` : '—'}</td>
                    <td style={{ padding:'8px 12px' }}>{score > 0 && <span style={{ fontWeight:900, fontSize:'1rem', color:sc?.color }}>{score}/5</span>}</td>
                    <td style={{ padding:'8px 12px' }}>{sc && <span style={{ background:sc.bg, color:sc.color, borderRadius:6, padding:'2px 8px', fontSize:'0.72rem', fontWeight:700 }}>{sc.labelTH}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Body Composition ── */}
        {(a.Latest?.Height || a.Latest?.Weight) && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-person-fill" title="ข้อมูลร่างกาย" color="#34d399"/>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                { label:'ส่วนสูง', val:a.Latest?.Height, unit:'cm' },
                { label:'น้ำหนัก', val:a.Latest?.Weight, unit:'kg' },
                { label:'Body Fat', val:a.Latest?.Fat, unit:'%' },
                { label:'กล้ามเนื้อ', val:a.Latest?.Muscle, unit:'%' },
                { label:'BMI', val:a.Latest?.BMI, unit:'' },
              ].filter(x=>x.val).map(x=>(
                <div key={x.label} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 16px', textAlign:'center', minWidth:90, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:900, fontSize:'1.2rem', color:'#0f172a' }}>{x.val}{x.unit && ` ${x.unit}`}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Test History ── */}
        {a.History && a.History.length > 1 && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-clock-history" title="ประวัติผลทดสอบ (3 ครั้งล่าสุด)" color="#94a3b8"/>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['วันที่','Rating','ความเร็ว','CMJ','Yo-Yo'].map(h => (
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', fontSize:'0.7rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.History.slice(-3).reverse().map((h, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'6px 10px', color:'#475569' }}>{h.Timestamp?.split(' ')[0] || '—'}</td>
                    <td style={{ padding:'6px 10px', fontWeight:700, color:ratingLabel(Number(h.Rating)||0).color }}>{h.Rating || '—'}</td>
                    <td style={{ padding:'6px 10px' }}>{h.Speed30 ? `${h.Speed30}s` : '—'}</td>
                    <td style={{ padding:'6px 10px' }}>{h.CMJ ? `${h.CMJ}cm` : '—'}</td>
                    <td style={{ padding:'6px 10px' }}>{h.YoYo ? `${h.YoYo}m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Skill Assessment ── */}
        {latestSkill && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-bullseye" title="ผลประเมินทักษะ (Skill Assessment)" color="#f59e0b"/>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:10 }}>
              ประเมินเมื่อ: {latestSkill.assessedAt?.split('T')[0] || '—'} · โดย: {latestSkill.assessedBy || '—'} · Season: {latestSkill.season || '—'}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {SKILL_CATS.map(cat => {
                const score = Number(latestSkill[cat.key as keyof SkillAssessment]) || 0;
                return (
                  <div key={cat.key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:180, fontSize:'0.78rem', fontWeight:600, color:'#374151', flexShrink:0 }}>{cat.label}</div>
                    <ScoreBar value={score} max={100} color={cat.color}/>
                    <div style={{ width:36, textAlign:'right', fontWeight:900, fontSize:'0.88rem', color:cat.color, flexShrink:0 }}>{score}</div>
                  </div>
                );
              })}
            </div>
            {latestSkill.notes && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'#f8fafc', borderRadius:8, fontSize:'0.78rem', color:'#475569', borderLeft:'3px solid #f59e0b' }}>
                <strong>หมายเหตุ:</strong> {latestSkill.notes}
              </div>
            )}
          </div>
        )}

        {/* ── Attendance ── */}
        {attTotal > 0 && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-check2-square" title="สถิติการเข้าซ้อม" color="#10b981"/>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
              {[
                { label:'ทั้งหมด', val:attTotal, color:'#64748b', bg:'#f8fafc' },
                { label:'มาซ้อม', val:attPresent, color:'#10b981', bg:'#f0fdf4' },
                { label:'สาย', val:attLate, color:'#d97706', bg:'#fffbeb' },
                { label:'ขาด', val:attAbsent, color:'#dc2626', bg:'#fef2f2' },
                { label:'อัตราการมา', val:`${attRate}%`, color:'#2563eb', bg:'#eff6ff' },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'10px 16px', textAlign:'center', minWidth:80, border:`1px solid ${s.color}30` }}>
                  <div style={{ fontSize:'1.3rem', fontWeight:900, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Wellness ── */}
        {wellnessRecs.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-heart-pulse-fill" title="สุขภาวะ (Wellness)" color="#f87171"/>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:10 }}>ค่าเฉลี่ย {Math.min(wellnessRecs.length,10)} บันทึกล่าสุด</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { label:'Wellness Score', val:wellAvg, unit:'', color:'#f59e0b' },
                { label:'ความเหนื่อยล้า', val:wellnessRecs.length ? (wellnessRecs.slice(0,5).reduce((s,r)=>s+(r.fatigue||0),0)/Math.min(wellnessRecs.length,5)).toFixed(1) : null, unit:'/5', color:'#f87171' },
                { label:'คุณภาพการนอน', val:wellnessRecs.length ? (wellnessRecs.slice(0,5).reduce((s,r)=>s+(r.sleepQuality||0),0)/Math.min(wellnessRecs.length,5)).toFixed(1) : null, unit:'/5', color:'#38bdf8' },
                { label:'อารมณ์', val:wellnessRecs.length ? (wellnessRecs.slice(0,5).reduce((s,r)=>s+(r.mood||0),0)/Math.min(wellnessRecs.length,5)).toFixed(1) : null, unit:'/5', color:'#34d399' },
              ].filter(x=>x.val!=null).map(x=>(
                <div key={x.label} style={{ background:'#fef9ec', borderRadius:10, padding:'10px 14px', textAlign:'center', minWidth:100, border:'1px solid #fde68a' }}>
                  <div style={{ fontSize:'1.3rem', fontWeight:900, color:x.color }}>{x.val}{x.unit}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Training Load (RPE) ── */}
        {rpeRecs.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-lightning-charge-fill" title="Training Load (RPE)" color="#a78bfa"/>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { label:'ค่าเฉลี่ย RPE', val:rpeAvg, unit:'/10', color:'#7c3aed' },
                { label:'Avg Training Load', val:avgLoad, unit:'AU', color:'#a78bfa' },
                { label:'จำนวน Session', val:rpeRecs.length, unit:'', color:'#64748b' },
              ].filter(x=>x.val!=null).map(x=>(
                <div key={x.label} style={{ background:'#f5f3ff', borderRadius:10, padding:'10px 14px', textAlign:'center', minWidth:100, border:'1px solid #ddd6fe' }}>
                  <div style={{ fontSize:'1.3rem', fontWeight:900, color:x.color }}>{x.val}{x.unit}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Match Performance ── */}
        {apps > 0 && (
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-trophy-fill" title="สถิติการแข่งขัน" color="#f59e0b"/>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
              {[
                { label:'ลงสนาม', val:apps, unit:'นัด', color:'#2563eb' },
                { label:'นาทีรวม', val:mins, unit:'นาที', color:'#475569' },
                { label:'ประตู', val:goals, unit:'', color:'#10b981' },
                { label:'Assists', val:assists, unit:'', color:'#38bdf8' },
                { label:'ใบเหลือง', val:ycards, unit:'', color:'#f59e0b' },
                { label:'ใบแดง', val:rcards, unit:'', color:'#dc2626' },
                ...(avgMatchRating ? [{ label:'Rating เฉลี่ย', val:avgMatchRating, unit:'/10', color:'#7c3aed' }] : []),
              ].map(x=>(
                <div key={x.label} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px', textAlign:'center', minWidth:80, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:'1.3rem', fontWeight:900, color:x.color }}>{x.val}{x.unit&&` ${x.unit}`}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{x.label}</div>
                </div>
              ))}
            </div>
            {/* Recent matches */}
            {matchPerf.slice(0,5).length > 0 && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['วันที่','คู่แข่ง','นาที','G','A','Rating'].map(h=>(
                      <th key={h} style={{ padding:'5px 10px', textAlign:'left', fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', fontSize:'0.7rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchPerf.slice(0,5).map((r,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'5px 10px', color:'#475569' }}>{r.matchDate||'—'}</td>
                      <td style={{ padding:'5px 10px', fontWeight:600 }}>{r.opponent||'—'}</td>
                      <td style={{ padding:'5px 10px' }}>{r.minutesPlayed||0}'</td>
                      <td style={{ padding:'5px 10px', fontWeight:700, color:'#10b981' }}>{r.goals||0}</td>
                      <td style={{ padding:'5px 10px', fontWeight:700, color:'#38bdf8' }}>{r.assists||0}</td>
                      <td style={{ padding:'5px 10px', fontWeight:700, color:'#7c3aed' }}>{r.rating||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── IDP / Individual Development Plan ── */}
        {latestIR && (()=>{
          const pG=(p:number)=>{
            if(p>=90)return{emoji:'🌟',th:'ยอดเยี่ยม',bg:'#f0fdf4',border:'#bbf7d0',color:'#15803d'};
            if(p>=75)return{emoji:'✅',th:'ดี',bg:'#eff6ff',border:'#bfdbfe',color:'#1d4ed8'};
            if(p>=50)return{emoji:'👍',th:'ปานกลาง',bg:'#fffbeb',border:'#fde68a',color:'#b45309'};
            if(p>=30)return{emoji:'⚠️',th:'ต้องพัฒนา',bg:'#fff7ed',border:'#fed7aa',color:'#c2410c'};
            return     {emoji:'🔴',th:'ต่ำมาก',bg:'#fef2f2',border:'#fecaca',color:'#dc2626'};
          };
          const iG=(v:number)=>{
            if(v>=5)return{emoji:'🌟',label:'ยอดเยี่ยม',color:'#15803d'};
            if(v>=4)return{emoji:'✅',label:'ดี',color:'#1d4ed8'};
            if(v>=3)return{emoji:'👍',label:'ปานกลาง',color:'#b45309'};
            if(v>=2)return{emoji:'⚠️',label:'พัฒนาได้',color:'#c2410c'};
            if(v>=1)return{emoji:'🔴',label:'ต้องปรับ',color:'#dc2626'};
            return     {emoji:'—',label:'ยังไม่ประเมิน',color:'#94a3b8'};
          };
          const overall=Number(latestIR.OverallIRScore)||0;
          const og=pG(overall);
          const fmtDate=(ts:string)=>{try{return new Date(ts).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});}catch{return ts.split('T')[0];}};
          return(
          <div style={{ marginBottom:24 }}>
            <SectionTitle icon="bi-clipboard2-check" title="รายงานพัฒนาการรายบุคคล (IDP)" color="#7c3aed"/>
            {/* Session info */}
            <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:12, display:'flex', flexWrap:'wrap', gap:8 }}>
              {latestIR.Coach&&<span>👤 โค้ช: {latestIR.Coach}</span>}
              {latestIR.Season&&<span>📅 {latestIR.Season}</span>}
              {latestIR.Period&&<span>⏱ {latestIR.Period}</span>}
              {latestIR.Timestamp&&<span style={{marginLeft:'auto'}}>📆 {fmtDate(String(latestIR.Timestamp))}</span>}
            </div>

            {/* Overall banner */}
            <div style={{ background:og.bg, border:`2px solid ${og.border}`, borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:'2.4rem', lineHeight:1 }}>{og.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'1rem', fontWeight:800, color:og.color }}>{a.Name?.split(' ')[0]||'นักกีฬา'} อยู่ในระดับ &ldquo;{og.th}&rdquo;</div>
                <div style={{ fontSize:'0.75rem', color:'#475569', marginTop:3 }}>คะแนนรวมทุกด้าน {overall}%</div>
              </div>
              <div style={{ textAlign:'center', background:'white', borderRadius:10, padding:'8px 12px', border:`1px solid ${og.border}` }}>
                <div style={{ fontSize:'1.6rem', fontWeight:900, color:og.color, lineHeight:1 }}>{overall}</div>
                <div style={{ fontSize:'0.58rem', color:'#94a3b8', fontWeight:700 }}>/ 100</div>
              </div>
            </div>

            {/* 3 area cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
              {[
                {key:'b',label:'🧠 พฤติกรรม',desc:'วินัย ความพยายาม ทัศนคติ',pct:Number(latestIR.BehaviourScore)||0,color:'#818cf8'},
                {key:'l',label:'🌿 วิถีชีวิต', desc:'การนอน อาหาร สุขภาพ',     pct:Number(latestIR.LifestyleScore)||0, color:'#34d399'},
                {key:'t',label:'⚽ ทักษะ',    desc:'เทคนิค กลยุทธ์ สมรรถภาพ', pct:Number(latestIR.TechnicalScore)||0,color:'#f472b6'},
              ].map(c=>{
                const g=pG(c.pct);
                return(
                  <div key={c.key} style={{ background:'white', border:`2px solid ${g.border}`, borderRadius:12, padding:12, textAlign:'center' }}>
                    <div style={{ fontSize:'1.4rem', marginBottom:3 }}>{g.emoji}</div>
                    <div style={{ fontWeight:800, fontSize:'0.82rem', color:'#0f172a', marginBottom:2 }}>{c.label}</div>
                    <div style={{ fontSize:'0.6rem', color:'#94a3b8', marginBottom:6 }}>{c.desc}</div>
                    <div style={{ fontSize:'1.4rem', fontWeight:900, color:g.color, lineHeight:1 }}>{c.pct}%</div>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, color:g.color, marginTop:2 }}>{g.th}</div>
                    <div style={{ marginTop:6, background:'#f1f5f9', borderRadius:20, height:5, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${c.pct}%`, background:c.color, borderRadius:20 }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail rows by section */}
            {[
              { sLabel:'🧠 พฤติกรรม', sColor:'#818cf8', items:[
                {label:'การตรงต่อเวลา',val:latestIR.B_OnTime},{label:'ความมุ่งมั่นพยายาม',val:latestIR.B_Effort},
                {label:'การทำงานเป็นทีม',val:latestIR.B_Teamwork},{label:'การให้เกียรติผู้อื่น',val:latestIR.B_Respect},
                {label:'การเข้าร่วมฝึกซ้อม',val:latestIR.B_Attendance},{label:'การมีส่วนร่วม',val:latestIR.B_Participation},
                {label:'พัฒนาการที่เห็นได้ชัด',val:latestIR.B_Improvement},
              ]},
              { sLabel:'🌿 วิถีชีวิต', sColor:'#34d399', items:[
                {label:'การนอนหลับพักผ่อน',val:latestIR.L_Sleep},{label:'การดื่มน้ำเพียงพอ',val:latestIR.L_Hydration},
                {label:'การรับประทานอาหาร',val:latestIR.L_Diet},{label:'การใช้โทรศัพท์/เกม',val:latestIR.L_ScreenTime},
              ]},
              { sLabel:'⚽ ทักษะฟุตบอล', sColor:'#f472b6', items:[
                {label:'การเคลื่อนไหวร่างกาย',val:latestIR.T_Motricity},{label:'ทักษะเทคนิคลูกบอล',val:latestIR.T_Technical},
                {label:'การอ่านเกมและยุทธวิธี',val:latestIR.T_Tactic},{label:'พื้นฐานเกมรุก',val:latestIR.T_OffFundam},
                {label:'พื้นฐานเกมรับ',val:latestIR.T_DefFundam},{label:'สมรรถภาพทางกาย',val:latestIR.T_Fitness},
              ]},
            ].map(sec=>(
              <div key={sec.sLabel} style={{ marginBottom:12, background:'#f8fafc', border:`1px solid ${sec.sColor}40`, borderRadius:12, padding:'12px 14px', borderTop:`3px solid ${sec.sColor}` }}>
                <div style={{ fontWeight:800, fontSize:'0.88rem', color:'#0f172a', marginBottom:10 }}>{sec.sLabel}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:6 }}>
                  {sec.items.map(x=>{
                    const ig=iG(Number(x.val)||0);
                    const v=Number(x.val)||0;
                    return(
                      <div key={x.label} style={{ background:'white', borderRadius:8, padding:'7px 10px', border:'1px solid #f1f5f9' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:v>0?4:0 }}>
                          <div style={{ fontWeight:600, fontSize:'0.75rem', color:'#334155', flex:1 }}>{x.label}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                            <span style={{ fontSize:'0.85rem' }}>{ig.emoji}</span>
                            <span style={{ fontSize:'0.65rem', fontWeight:700, color:ig.color }}>{v>0?ig.label:'—'}</span>
                          </div>
                        </div>
                        {v>0&&<div style={{ display:'flex', gap:2 }}>{[1,2,3,4,5].map(n=><div key={n} style={{ flex:1, height:4, borderRadius:10, background:v>=n?sec.sColor:'#e2e8f0' }}/>)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {latestIR.GoodLevel && <div style={{ marginBottom:8, padding:'8px 12px', background:'#f0fdf4', borderRadius:8, fontSize:'0.78rem', color:'#166534', borderLeft:'3px solid #10b981' }}><strong>จุดแข็ง:</strong> {latestIR.GoodLevel}</div>}
            {latestIR.ToImprove && <div style={{ marginBottom:8, padding:'8px 12px', background:'#fef9ec', borderRadius:8, fontSize:'0.78rem', color:'#92400e', borderLeft:'3px solid #f59e0b' }}><strong>สิ่งที่ต้องพัฒนา:</strong> {latestIR.ToImprove}</div>}
            {latestIR.Comments && <div style={{ marginBottom:8, padding:'8px 12px', background:'#f5f3ff', borderRadius:8, fontSize:'0.78rem', color:'#4c1d95', borderLeft:'3px solid #7c3aed' }}><strong>ความคิดเห็นโค้ช:</strong> {latestIR.Comments}</div>}
            {/* Section-specific comments */}
            {(latestIR.BehaviourComment||latestIR.LifestyleComment||latestIR.TechnicalComment)&&(
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                {latestIR.BehaviourComment&&<div style={{ padding:'8px 12px', background:'#faf5ff', borderRadius:8, fontSize:'0.78rem', color:'#6d28d9', borderLeft:'3px solid #a78bfa' }}><strong>💬 พฤติกรรม:</strong> {String(latestIR.BehaviourComment)}</div>}
                {latestIR.LifestyleComment&&<div style={{ padding:'8px 12px', background:'#f0fdf4', borderRadius:8, fontSize:'0.78rem', color:'#065f46', borderLeft:'3px solid #6ee7b7' }}><strong>💬 วิถีชีวิต:</strong> {String(latestIR.LifestyleComment)}</div>}
                {latestIR.TechnicalComment&&<div style={{ padding:'8px 12px', background:'#f0f9ff', borderRadius:8, fontSize:'0.78rem', color:'#0369a1', borderLeft:'3px solid #7dd3fc' }}><strong>💬 เทคนิค:</strong> {String(latestIR.TechnicalComment)}</div>}
              </div>
            )}
            {/* IDP Goals */}
            {(latestIR.IdpGoalShort||latestIR.IdpGoalLong||latestIR.IdpAction||latestIR.IdpDream)&&(
              <div style={{ marginTop:12, background:'#0f172a', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#38bdf8', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>🎯 เป้าหมายพัฒนาการ (IDP Goals)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                  {[
                    {label:'เป้าหมายระยะสั้น', val:latestIR.IdpGoalShort, color:'#38bdf8'},
                    {label:'เป้าหมายระยะยาว', val:latestIR.IdpGoalLong,  color:'#818cf8'},
                    {label:'แผนปฏิบัติ',       val:latestIR.IdpAction,    color:'#34d399'},
                    {label:'ความฝัน',           val:latestIR.IdpDream,     color:'#f472b6'},
                  ].filter(x=>x.val).map(x=>(
                    <div key={x.label} style={{ background:'rgba(255,255,255,0.07)', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ fontSize:'0.6rem', fontWeight:700, color:x.color, marginBottom:3 }}>{x.label}</div>
                      <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.85)', lineHeight:1.4 }}>{String(x.val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ── Footer ── */}
        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.7rem', color:'#94a3b8' }}>
          <span>รายงานฉบับนี้ออกโดย {user.displayName || user.username} · {printDate}</span>
          <span style={{ fontWeight:700, letterSpacing:1 }}>ISP Improve Sports Performance</span>
        </div>
      </div>
    </>
  );
}
