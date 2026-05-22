'use client';
import { Athlete, User } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';

interface Props { athlete: Athlete; user: User; onClose: () => void; }

const METRICS = [
  { key:'speed30',  field:'Speed30',  label:'ความเร็ว 30 ม.',    unit:'s',   hi:false, icon:'⚡' },
  { key:'cmj',      field:'CMJ',      label:'พลังกระโดด (CMJ)',   unit:'cm',  hi:true,  icon:'↑' },
  { key:'agility',  field:'Agility',  label:'ความคล่องตัว',       unit:'s',   hi:false, icon:'↗' },
  { key:'situp',    field:'Situp',    label:'ลุก-นั่ง',           unit:'reps',hi:true,  icon:'💪' },
  { key:'longjump', field:'LongJump', label:'กระโดดไกล',          unit:'cm',  hi:true,  icon:'→' },
  { key:'yoyo',     field:'YoYo',     label:'วิ่งรับ (Shuttle)',  unit:'m',   hi:true,  icon:'♥' },
  { key:'pushup',   field:'Pushup',   label:'วิดพื้น',             unit:'reps',hi:true,  icon:'▲' },
  { key:'sitreach', field:'SitAndReach',label:'ความยืดหยุ่น',     unit:'cm',  hi:true,  icon:'~' },
] as const;

function calcAge(dob: string): number | null {
  if (!dob || dob === '-') return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / 31557600000);
  return age >= 0 && age <= 120 ? age : null;
}
function ratingLabel(r: number) {
  if (r >= 80) return { th: 'ยอดเยี่ยม', en: 'Elite', color: '#10b981' };
  if (r >= 65) return { th: 'ดี', en: 'Good', color: '#38bdf8' };
  if (r >= 50) return { th: 'ปานกลาง', en: 'Average', color: '#f59e0b' };
  if (r >= 35) return { th: 'พัฒนาได้', en: 'Fair', color: '#f97316' };
  return { th: 'ต้องพัฒนา', en: 'Poor', color: '#ef4444' };
}

export default function ParentReport({ athlete: a, user, onClose }: Props) {
  const age = calcAge(a.DOB);
  const rating = Number(a.Latest?.Rating) || 0;
  const rl = ratingLabel(rating);
  const lastTest = a.History?.length ? a.History[a.History.length - 1]?.Timestamp?.split(' ')[0] || '—' : '—';
  const printDate = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-page { box-shadow: none !important; border: none !important; }
        }
        .report-page { max-width: 720px; margin: 0 auto; background: white; font-family: 'Prompt', sans-serif; }
      `}</style>

      {/* Controls — hidden when printing */}
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

      <div style={{ paddingTop: 60 }} className="no-print"/>

      <div className="report-page" style={{ padding:'32px 40px', boxShadow:'0 4px 40px rgba(0,0,0,0.12)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, paddingBottom:20, borderBottom:'3px solid #0f172a' }}>
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
            </div>
          </div>
          {user.logoUrl
            ? <img src={user.logoUrl} alt="" style={{ width:56, height:56, objectFit:'contain', flexShrink:0 }}/>
            : <div style={{ textAlign:'right', flexShrink:0 }}><div style={{ fontWeight:900, fontSize:'0.75rem', color:'#38bdf8', letterSpacing:2 }}>ISP</div><div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>Sports Performance</div></div>
          }
        </div>

        {/* Overall Rating */}
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
            {/* Progress bar */}
            <div style={{ height:8, borderRadius:8, background:'rgba(0,0,0,0.08)', marginTop:8, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:8, background:rl.color, width:`${rating}%`, transition:'width 0.5s' }}/>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:4, height:16, background:'#38bdf8', borderRadius:2, display:'inline-block' }}/>ผลการทดสอบสมรรถภาพ
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['การทดสอบ','ผลล่าสุด','คะแนน','ระดับ'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#64748b', borderBottom:'2px solid #e2e8f0', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map(m => {
                const raw = String(a.Latest?.[m.field as keyof typeof a.Latest] || '');
                const val = parseFloat(raw);
                const hasVal = !isNaN(val) && val > 0;
                const score = hasVal ? getScorePoint(m.key, raw, a.DOB || '') : 0;
                const sc = score > 0 ? SCORE_COLORS[score] : null;
                return (
                  <tr key={m.key} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 12px', fontWeight:600 }}>
                      <span style={{ marginRight:6 }}>{m.icon}</span>{m.label}
                    </td>
                    <td style={{ padding:'9px 12px', fontWeight:700, color:hasVal?'#0f172a':'#94a3b8' }}>
                      {hasVal ? `${val} ${m.unit}` : '—'}
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      {score > 0 && <span style={{ fontWeight:900, fontSize:'1rem', color:sc?.color }}>{score}/5</span>}
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      {sc && <span style={{ background:sc.bg, color:sc.color, borderRadius:6, padding:'2px 8px', fontSize:'0.72rem', fontWeight:700 }}>{sc.labelTH}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Body Composition */}
        {(a.Latest?.Height || a.Latest?.Weight) && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontWeight:800, fontSize:'1rem', color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:4, height:16, background:'#34d399', borderRadius:2, display:'inline-block' }}/>ข้อมูลร่างกาย
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                { label:'ส่วนสูง', val:a.Latest?.Height, unit:'cm' },
                { label:'น้ำหนัก', val:a.Latest?.Weight, unit:'kg' },
                { label:'Body Fat', val:a.Latest?.Fat, unit:'%' },
                { label:'กล้ามเนื้อ', val:a.Latest?.Muscle, unit:'%' },
              ].filter(x=>x.val).map(x=>(
                <div key={x.label} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 16px', textAlign:'center', minWidth:90, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:900, fontSize:'1.2rem', color:'#0f172a' }}>{x.val}</div>
                  <div style={{ fontSize:'0.65rem', color:'#64748b', fontWeight:700 }}>{x.label} ({x.unit})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.7rem', color:'#94a3b8' }}>
          <span>รายงานฉบับนี้ออกโดย {user.displayName || user.username} · {printDate}</span>
          <span style={{ fontWeight:700, letterSpacing:1 }}>ISP Improve Sports Performance</span>
        </div>
      </div>
    </>
  );
}
