'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Athlete, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { athletes: Athlete[]; user: User; onNavigate: (p: Page) => void; }

interface Event {
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

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

export default function CalendarPage({ athletes, user, onNavigate }: Props) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number|null>(null);
  const [form, setForm] = useState({ title:'', eventType:'training' as Event['eventType'], teamName:'', venue:'', notes:'', eventDate:'' });
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const ym = `${year}-${String(month+1).padStart(2,'0')}`;
    try {
      const d = await callGAS('getCalendarEvents', { yearMonth: ym, clubId: user.clubId||'' }) as Event[];
      setEvents(Array.isArray(d) ? d : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [year, month, user.clubId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const byDay = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach(e => {
      const d = e.eventDate?.split('T')[0]?.split('-')[2];
      if (d) { if (!map[d]) map[d] = []; map[d].push(e); }
    });
    return map;
  }, [events]);

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];

  const openAdd = (day: number) => {
    setSelectedDay(day);
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setForm(f => ({ ...f, eventDate: dateStr, title:'', notes:'', venue:'', teamName:'' }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('กรุณากรอกชื่อกิจกรรม', 'error'); return; }
    setSaving(true);
    try {
      const res = await callGAS('saveCalendarEvent', { ...form, clubId: user.clubId||'', createdBy: user.displayName||user.username }) as { status:string; message:string };
      if (res.status === 'success') { showToast('บันทึกสำเร็จ', 'success'); setShowForm(false); loadEvents(); }
      else showToast(res.message, 'error');
    } catch { showToast('Connection error','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบกิจกรรมนี้?')) return;
    try {
      await callGAS('deleteCalendarEvent', { id });
      showToast('ลบสำเร็จ','success');
      loadEvents();
    } catch { showToast('Error','error'); }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">ตารางซ้อม / แข่งขัน</h2>
          <p className="page-subtitle">วางแผนกิจกรรมทีม · ฝึกซ้อม · แข่งขัน · ทดสอบ</p>
        </div>
        <button className="btn-primary" onClick={() => { setSelectedDay(today.getDate()); openAdd(today.getDate()); }}>
          <i className="bi bi-plus-circle me-1"/>เพิ่มกิจกรรม
        </button>
      </div>

      {/* Month nav */}
      <div className="surface" style={{ marginBottom:16, padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button className="btn-outline" style={{ padding:'6px 10px' }} onClick={prevMonth}><i className="bi bi-chevron-left"/></button>
        <div style={{ flex:1, textAlign:'center', fontWeight:800, fontSize:'1.2rem' }}>{MONTH_TH[month]} {year + 543}</div>
        <button className="btn-outline" style={{ padding:'6px 10px' }} onClick={nextMonth}><i className="bi bi-chevron-right"/></button>
        <button className="btn-outline btn-sm" onClick={()=>{ setYear(today.getFullYear()); setMonth(today.getMonth()); }}>วันนี้</button>
      </div>

      {/* Calendar grid */}
      <div className="surface" style={{ padding:12, marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
          {DOW.map((d,i) => (
            <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', fontWeight:700, color: i===0||i===6 ? '#ef4444' : 'var(--text-muted)', padding:'4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`}/>)}
          {Array.from({length: days}).map((_,i) => {
            const day = i + 1;
            const key = String(day).padStart(2,'0');
            const dayEvents = byDay[key] || [];
            const isToday = `${year}-${String(month+1).padStart(2,'0')}-${key}` === todayKey;
            return (
              <div key={day} onClick={() => openAdd(day)} style={{
                minHeight:70, padding:4, borderRadius:8, border: isToday ? '2px solid #38bdf8' : '1px solid var(--border)',
                background: isToday ? 'rgba(56,189,248,0.06)' : 'var(--bg)', cursor:'pointer',
                transition:'background 0.1s',
              }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(56,189,248,0.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background=isToday?'rgba(56,189,248,0.06)':'var(--bg)')}>
                <div style={{ fontWeight: isToday ? 900 : 600, fontSize:'0.8rem', color: isToday ? '#38bdf8' : 'var(--text-main)', marginBottom:3 }}>{day}</div>
                {dayEvents.slice(0,3).map((ev,j) => {
                  const tc = TYPE_CFG[ev.eventType]||TYPE_CFG.other;
                  return (
                    <div key={j} style={{ background: tc.color+'22', color: tc.color, borderRadius:4, padding:'1px 5px', fontSize:'0.6rem', fontWeight:700, marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                      onClick={e=>{ e.stopPropagation(); }}>
                      {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <div style={{ fontSize:'0.58rem', color:'var(--text-muted)' }}>+{dayEvents.length-3}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      <div className="surface" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem' }}>
          <i className="bi bi-calendar-check me-2" style={{ color:'#38bdf8' }}/>กิจกรรมในเดือนนี้ ({events.length})
        </div>
        {loading && <div style={{textAlign:'center',padding:24}}><div className="spinner-ring"/></div>}
        {!loading && events.length === 0 && <div style={{textAlign:'center',padding:32,color:'var(--text-muted)',fontSize:'0.85rem'}}>ยังไม่มีกิจกรรม — คลิกวันในปฏิทินเพื่อเพิ่ม</div>}
        {events.sort((a,b)=>a.eventDate.localeCompare(b.eventDate)).map(ev => {
          const tc = TYPE_CFG[ev.eventType]||TYPE_CFG.other;
          return (
            <div key={ev.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:36, height:36, borderRadius:10, background: tc.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`bi ${tc.icon}`} style={{ color: tc.color }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'0.85rem' }}>{ev.title}</div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>
                  {new Date(ev.eventDate).toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}
                  {ev.teamName && ` · ${ev.teamName}`}
                  {ev.venue && ` · ${ev.venue}`}
                </div>
              </div>
              <span style={{ background: tc.color+'18', color: tc.color, borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:700 }}>{tc.label}</span>
              <button onClick={() => handleDelete(ev.id)} style={{ padding:'4px 8px', border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', flexShrink:0 }}>
                <i className="bi bi-trash"/>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add event modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ fontWeight:800, fontSize:'1rem', marginBottom:16 }}>
              <i className="bi bi-calendar-plus me-2" style={{ color:'#38bdf8' }}/>เพิ่มกิจกรรม — {form.eventDate}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <label className="form-label">ชื่อกิจกรรม *</label>
                <input className="form-control" value={form.title} placeholder="เช่น ซ้อมเช้า, แข่งขันลีก..." onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label className="form-label">ประเภท</label>
                  <select className="form-select" value={form.eventType} onChange={e=>setForm(f=>({...f,eventType:e.target.value as Event['eventType']}))}>
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
                <input className="form-control" value={form.venue} placeholder="สนาม / สถานที่" onChange={e=>setForm(f=>({...f,venue:e.target.value}))}/>
              </div>
              <div>
                <label className="form-label">หมายเหตุ</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button className="btn-outline" style={{ flex:1 }} onClick={()=>setShowForm(false)}>ยกเลิก</button>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/> : <><i className="bi bi-floppy me-1"/>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
