'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Athlete, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { athletes: Athlete[]; user: User; onNavigate: (p: Page) => void; }

interface CalEvent {
  id: string;
  eventDate: string;
  title: string;
  eventType: 'training'|'match'|'test'|'other';
  teamName: string;
  venue: string;
  notes: string;
  createdBy: string;
}

const TYPE_CFG = {
  training: { label:'ฝึกซ้อม',  color:'#38bdf8', icon:'bi-activity' },
  match:    { label:'แข่งขัน',  color:'#f59e0b', icon:'bi-shield-check' },
  test:     { label:'ทดสอบ',    color:'#10b981', icon:'bi-clipboard-check' },
  other:    { label:'อื่นๆ',    color:'#94a3b8', icon:'bi-calendar-event' },
} as const;

const TEAMS = ['','U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];

const TEAM_COLORS: Record<string, string> = {
  U8:'#6366f1', U9:'#8b5cf6', U10:'#a855f7', U11:'#ec4899', U12:'#f43f5e',
  U13:'#ef4444', U14:'#f97316', U15:'#f59e0b', U16:'#84cc16', U17:'#10b981',
  U18:'#06b6d4', Senior:'#3b82f6',
};

function evColor(ev: CalEvent): string {
  if (ev.teamName && TEAM_COLORS[ev.teamName]) return TEAM_COLORS[ev.teamName];
  return TYPE_CFG[ev.eventType]?.color || '#94a3b8';
}
const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtDateTH(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'2-digit' });
}

const blankForm = () => ({ title:'', eventType:'training' as CalEvent['eventType'], teamName:'', venue:'', notes:'', eventDate:'' });

export default function CalendarPage({ athletes, user, onNavigate }: Props) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTeam, setFilterTeam] = useState('ALL');

  const teamOptions = useMemo(() =>
    ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort()],
    [athletes]);

  // Day panel state
  const [dayPanelDate, setDayPanelDate]   = useState<string|null>(null);
  const [showAddForm,  setShowAddForm]    = useState(false);
  const [form, setForm]  = useState(blankForm());
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const ym = `${year}-${String(month+1).padStart(2,'0')}`;
    try {
      const d = await callGAS('getCalendarEvents', { yearMonth: ym, clubId: user.clubId||'' }) as CalEvent[];
      setEvents(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month, user.clubId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() =>
    filterTeam === 'ALL' ? events : events.filter(e => !e.teamName || e.teamName === filterTeam),
    [events, filterTeam]);

  const byDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    filteredEvents.forEach(e => {
      const d = e.eventDate?.split('T')[0]?.split('-')[2];
      if (d) { if (!map[d]) map[d] = []; map[d].push(e); }
    });
    return map;
  }, [filteredEvents]);

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  /* ── open day panel ── */
  const openDay = (day: number) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setDayPanelDate(dateStr);
    setShowAddForm(false);
    setForm({ ...blankForm(), eventDate: dateStr });
  };

  const closePanel = () => { setDayPanelDate(null); setShowAddForm(false); };

  /* ── save new event ── */
  const handleSave = async () => {
    if (!form.title.trim()) { showToast('กรุณากรอกชื่อกิจกรรม','error'); return; }
    setSaving(true);
    try {
      const res = await callGAS('saveCalendarEvent', {
        ...form, clubId: user.clubId||'', createdBy: user.displayName||user.username,
      }) as { status:string; message:string };
      if (res.status === 'success') {
        showToast('บันทึกสำเร็จ','success');
        setShowAddForm(false);
        setForm({ ...blankForm(), eventDate: dayPanelDate||'' });
        await loadEvents();
      } else showToast(res.message,'error');
    } catch { showToast('Connection error','error'); }
    finally { setSaving(false); }
  };

  /* ── delete event ── */
  const handleDelete = async (id: string) => {
    if (!confirm('ลบกิจกรรมนี้?')) return;
    try {
      await callGAS('deleteCalendarEvent', { id });
      showToast('ลบสำเร็จ','success');
      loadEvents();
    } catch { showToast('Error','error'); }
  };

  const prevMonth = () => { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  /* ── events for the open day panel ── */
  const dayEvents = useMemo(() => {
    if (!dayPanelDate) return [];
    const key = dayPanelDate.split('-')[2];
    return byDay[key] || [];
  }, [dayPanelDate, byDay]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">ตารางซ้อม / แข่งขัน</h2>
          <p className="page-subtitle">วางแผนกิจกรรมทีม · ฝึกซ้อม · แข่งขัน · ทดสอบ</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select className="form-select" style={{ width:'auto' }} value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
            {teamOptions.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกรุ่น':t}</option>)}
          </select>
          <button className="btn-primary" onClick={() => openDay(today.getDate())}>
            <i className="bi bi-plus-circle me-1"/>เพิ่มกิจกรรม
          </button>
        </div>
      </div>

      {/* Team color legend */}
      {athletes.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10, padding:'8px 4px' }}>
          {Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort().map(t => (
            <span key={t} style={{ display:'flex', alignItems:'center', gap:4, background:(TEAM_COLORS[t]||'#94a3b8')+'18', border:`1px solid ${TEAM_COLORS[t]||'#94a3b8'}40`, borderRadius:20, padding:'3px 10px', fontSize:'0.68rem', fontWeight:800, color:TEAM_COLORS[t]||'#94a3b8' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:TEAM_COLORS[t]||'#94a3b8', flexShrink:0 }}/>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Month nav */}
      <div className="surface" style={{ marginBottom:16, padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button className="btn-outline" style={{ padding:'6px 10px' }} onClick={prevMonth}><i className="bi bi-chevron-left"/></button>
        <div style={{ flex:1, textAlign:'center', fontWeight:800, fontSize:'1.2rem' }}>{MONTH_TH[month]} {year+543}</div>
        <button className="btn-outline" style={{ padding:'6px 10px' }} onClick={nextMonth}><i className="bi bi-chevron-right"/></button>
        <button className="btn-outline btn-sm" onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth());}}>วันนี้</button>
      </div>

      {/* Calendar grid */}
      <div className="surface" style={{ padding:12, marginBottom:16 }}>
        {/* DOW headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {DOW.map((d,i)=>(
            <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', fontWeight:700, color:i===0||i===6?'#ef4444':'var(--text-muted)', padding:'4px 0' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:days}).map((_,i)=>{
            const day = i+1;
            const key = String(day).padStart(2,'0');
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${key}`;
            const dayEvs = byDay[key]||[];
            const isToday = dateStr === todayKey;
            const isSelected = dateStr === dayPanelDate;
            return (
              <div key={day} onClick={()=>openDay(day)} style={{
                minHeight:72, padding:4, borderRadius:8,
                border: isSelected ? '2px solid #38bdf8' : isToday ? '2px solid #38bdf880' : '1px solid var(--border)',
                background: isSelected ? 'rgba(56,189,248,0.10)' : isToday ? 'rgba(56,189,248,0.04)' : 'var(--bg)',
                cursor:'pointer', transition:'all 0.12s',
              }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(56,189,248,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background=isSelected?'rgba(56,189,248,0.10)':isToday?'rgba(56,189,248,0.04)':'var(--bg)')}>
                <div style={{ fontWeight:isToday?900:600, fontSize:'0.8rem', color:isToday?'#38bdf8':'var(--text-main)', marginBottom:3 }}>{day}</div>
                {dayEvs.slice(0,3).map((ev,j)=>{
                  const c = evColor(ev);
                  return (
                    <div key={j} style={{ background:c+'28', color:c, borderRadius:4, padding:'1px 5px', fontSize:'0.6rem', fontWeight:700, marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', borderLeft:`2px solid ${c}` }}>
                      {ev.teamName ? `[${ev.teamName}] ` : ''}{ev.title}
                    </div>
                  );
                })}
                {dayEvs.length>3&&<div style={{ fontSize:'0.58rem', color:'var(--text-muted)' }}>+{dayEvs.length-3} เพิ่มเติม</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month event list */}
      <div className="surface" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem' }}>
          <i className="bi bi-calendar-check me-2" style={{ color:'#38bdf8' }}/>กิจกรรมในเดือนนี้ ({events.length})
        </div>
        {loading && <div style={{textAlign:'center',padding:24}}><div className="spinner-ring"/></div>}
        {!loading && events.length===0 && (
          <div style={{textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:'0.85rem'}}>ยังไม่มีกิจกรรม — คลิกวันในปฏิทินเพื่อเพิ่ม</div>
        )}
        {[...filteredEvents].sort((a,b)=>a.eventDate.localeCompare(b.eventDate)).map(ev=>{
          const tc = TYPE_CFG[ev.eventType]||TYPE_CFG.other;
          const c  = evColor(ev);
          return (
            <div key={ev.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer', borderLeft:`3px solid ${c}` }}
              onClick={()=>openDay(parseInt(ev.eventDate.split('-')[2]))}>
              <div style={{ width:36, height:36, borderRadius:10, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`bi ${tc.icon}`} style={{ color:c }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'0.85rem' }}>{ev.title}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>
                  {new Date(ev.eventDate+'T12:00:00').toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}
                  {ev.teamName&&` · ${ev.teamName}`}{ev.venue&&` · ${ev.venue}`}
                </div>
              </div>
              {ev.teamName && <span style={{ background:c+'18', color:c, borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:800, flexShrink:0 }}>{ev.teamName}</span>}
              <span style={{ background:tc.color+'18', color:tc.color, borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:700, flexShrink:0 }}>{tc.label}</span>
              <button onClick={e=>{e.stopPropagation();handleDelete(ev.id);}} style={{ padding:'4px 8px', border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', flexShrink:0 }}>
                <i className="bi bi-trash"/>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── DAY PANEL MODAL ── */}
      {dayPanelDate && (
        <div className="modal-overlay" onClick={closePanel}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{ maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>

            {/* Panel header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexShrink:0 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'rgba(56,189,248,0.12)', border:'1.5px solid rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className="bi bi-calendar3" style={{ color:'#38bdf8', fontSize:'1.1rem' }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text-main)' }}>{fmtDateTH(dayPanelDate)}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{dayEvents.length} กิจกรรม</div>
              </div>
              <button onClick={closePanel} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.4rem', color:'#94a3b8', lineHeight:1 }}>×</button>
            </div>

            {/* Event list */}
            <div style={{ flex:1, overflowY:'auto', marginBottom:16 }}>
              {dayEvents.length === 0 && !showAddForm && (
                <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text-muted)' }}>
                  <i className="bi bi-calendar-x" style={{ fontSize:'2.5rem', display:'block', marginBottom:10, color:'#e2e8f0' }}/>
                  <p style={{ margin:0, fontSize:'0.875rem' }}>ยังไม่มีกิจกรรมในวันนี้</p>
                </div>
              )}
              {dayEvents.map(ev => {
                const tc = TYPE_CFG[ev.eventType]||TYPE_CFG.other;
                const c  = evColor(ev);
                return (
                  <div key={ev.id} style={{ display:'flex', gap:12, padding:'12px 14px', marginBottom:8, background:'var(--bg)', borderRadius:12, border:`1.5px solid ${c}40`, borderLeft:`4px solid ${c}` }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={`bi ${tc.icon}`} style={{ color:c, fontSize:'1rem' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.875rem', marginBottom:2 }}>{ev.title}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:ev.notes?4:0 }}>
                        {ev.teamName && <span style={{ background:c+'18', color:c, borderRadius:5, padding:'1px 7px', fontSize:'0.65rem', fontWeight:800 }}>{ev.teamName}</span>}
                        <span style={{ background:tc.color+'18', color:tc.color, borderRadius:5, padding:'1px 7px', fontSize:'0.65rem', fontWeight:700 }}>{tc.label}</span>
                        {ev.venue    && <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}><i className="bi bi-geo-alt me-1"/>{ev.venue}</span>}
                        {ev.createdBy&& <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}><i className="bi bi-person me-1"/>{ev.createdBy}</span>}
                      </div>
                      {ev.notes && <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', borderLeft:`3px solid ${c}55`, paddingLeft:8, fontStyle:'italic' }}>{ev.notes}</div>}
                    </div>
                    <button onClick={()=>handleDelete(ev.id)} style={{ alignSelf:'flex-start', padding:'4px 8px', border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', borderRadius:7, cursor:'pointer', fontSize:'0.72rem', flexShrink:0 }}>
                      <i className="bi bi-trash"/>
                    </button>
                  </div>
                );
              })}

              {/* Inline add form */}
              {showAddForm && (
                <div style={{ background:'var(--bg)', borderRadius:12, border:'1.5px solid rgba(56,189,248,0.3)', padding:'14px 16px', marginTop:8 }}>
                  <div style={{ fontWeight:700, fontSize:'0.875rem', color:'#38bdf8', marginBottom:12 }}>
                    <i className="bi bi-plus-circle me-1"/>เพิ่มกิจกรรมใหม่
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div>
                      <label className="form-label">ชื่อกิจกรรม *</label>
                      <input className="form-control" value={form.title} placeholder="เช่น ซ้อมเช้า, แข่งขันลีก..."
                        onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                        onKeyDown={e=>e.key==='Enter'&&handleSave()}
                        autoFocus/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label className="form-label">ประเภท</label>
                        <select className="form-select" value={form.eventType} onChange={e=>setForm(f=>({...f,eventType:e.target.value as CalEvent['eventType']}))}>
                          {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">รุ่น</label>
                        <select className="form-select" value={form.teamName} onChange={e=>setForm(f=>({...f,teamName:e.target.value}))}>
                          {TEAMS.map(t=><option key={t} value={t}>{t||'ทุกรุ่น'}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">สถานที่</label>
                      <input className="form-control" value={form.venue} placeholder="สนาม / สถานที่"
                        onChange={e=>setForm(f=>({...f,venue:e.target.value}))}/>
                    </div>
                    <div>
                      <label className="form-label">หมายเหตุ</label>
                      <textarea className="form-control" rows={2} value={form.notes}
                        onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn-outline" style={{ flex:1 }} onClick={()=>setShowAddForm(false)}>ยกเลิก</button>
                      <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={handleSave} disabled={saving}>
                        {saving
                          ? <span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/>
                          : <><i className="bi bi-floppy me-1"/>บันทึก</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            {!showAddForm && (
              <div style={{ flexShrink:0, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={()=>{ setForm({...blankForm(), eventDate:dayPanelDate||''}); setShowAddForm(true); }}>
                  <i className="bi bi-plus-circle me-2"/>เพิ่มกิจกรรมในวันนี้
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
