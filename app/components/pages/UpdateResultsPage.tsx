'use client';

import { useState, useRef } from 'react';
import { Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import { calcYoyoDist, calcVo2 } from '@/lib/devData';

interface Props { athletes: Athlete[]; onSuccess: () => void; }

function deriveBMI(h: string, w: string): string {
  const hn = parseFloat(h), wn = parseFloat(w);
  if (!hn || !wn) return '';
  return (wn / Math.pow(hn / 100, 2)).toFixed(2);
}
function derivePP(cmj: string, w: string): string {
  const c = parseFloat(cmj), wn = parseFloat(w);
  if (!c || !wn) return '';
  const pp = 60.7 * c + 45.3 * wn - 2055;
  return pp > 0 ? String(Math.round(pp)) : '0';
}

const METRIC_KEYS = ['speed30','cmj','agility','situp','longjump','yoyo','pushup','sitreach'] as const;
const METRIC_LABELS: Record<string, string> = {
  speed30:'Speed 30m', cmj:'CMJ', agility:'Agility', situp:'Sit-up',
  longjump:'Long Jump', yoyo:'Yo-Yo', pushup:'Push-up', sitreach:'Sit & Reach',
};

// ─── Single Update ────────────────────────────────────────────────────────────
function SingleTab({ athletes, onSuccess }: Props) {
  const [form, setForm] = useState({
    playerId: '', height: '', weight: '', fat: '', muscle: '',
    cmj: '', speed30: '', agiL: '', agiR: '',
    yoyoLevel: '', yoyoShuttle: '', situp: '', longJump: '', pushup: '', sitReach: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const bmi      = deriveBMI(form.height, form.weight);
  const pp       = derivePP(form.cmj, form.weight);
  const yoyoDist = calcYoyoDist(form.yoyoLevel, form.yoyoShuttle);
  const yoyo     = yoyoDist > 0 ? String(yoyoDist) : '';
  const vo2      = yoyoDist > 0 ? calcVo2(yoyoDist) : '';
  const agiTotal = form.agiL && form.agiR
    ? (parseFloat(form.agiL) + parseFloat(form.agiR)).toFixed(2)
    : '';

  const athlete    = athletes.find(a => a.PlayerID === form.playerId);
  const dob        = athlete?.DOB || '';
  const liveScores: Record<string, number> = {};
  METRIC_KEYS.forEach(k => {
    const v = k === 'agility' ? agiTotal
            : k === 'yoyo'    ? yoyo
            : k === 'longjump' ? form.longJump
            : k === 'sitreach' ? form.sitReach
            : (form as Record<string,string>)[k] || '';
    liveScores[k] = getScorePoint(k, v, dob);
  });
  const validScores = Object.values(liveScores).filter(s => s > 0);
  const rating = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / (validScores.length * 5) * 100)
    : 0;

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.playerId) { showToast('กรุณาเลือกนักกีฬา', 'error'); return; }
    // Range validation
    const checks: [string, string, number, number][] = [
      ['ส่วนสูง', form.height, 50, 250],
      ['น้ำหนัก', form.weight, 10, 250],
      ['Body Fat', form.fat, 1, 60],
      ['Muscle', form.muscle, 10, 80],
      ['CMJ', form.cmj, 1, 150],
      ['Speed 30m', form.speed30, 2, 20],
      ['Agility L', form.agiL, 2, 30],
      ['Agility R', form.agiR, 2, 30],
      ['Sit-up', form.situp, 1, 200],
      ['Long Jump', form.longJump, 10, 450],
      ['Push-up', form.pushup, 1, 200],
      ['Sit & Reach', form.sitReach, -30, 60],
    ];
    for (const [label, val, min, max] of checks) {
      if (val === '' || val === undefined) continue;
      const n = parseFloat(String(val));
      if (isNaN(n) || n < min || n > max) {
        showToast(`${label}: ค่าควรอยู่ระหว่าง ${min}–${max}`, 'error'); return;
      }
    }
    setSaving(true);
    try {
      const res = await callGAS('saveTest', {
        playerId: form.playerId,
        height: form.height, weight: form.weight, fat: form.fat, muscle: form.muscle,
        cmj: form.cmj,
        speed30: form.speed30, agiL: form.agiL, agiR: form.agiR,
        yoyoLevel: form.yoyoLevel, yoyoShuttle: form.yoyoShuttle,
        yoyo, vo2max: vo2,
        situp: form.situp, longJump: form.longJump, pushup: form.pushup, sitReach: form.sitReach,
      }) as { status: string; message: string };
      if (res.status === 'success') {
        showToast(res.message, 'success');
        const pid = form.playerId;
        setTimeout(() => {
          onSuccess();
          setForm({ playerId: pid, height: '', weight: '', fat: '', muscle: '', cmj: '', speed30: '', agiL: '', agiR: '', yoyoLevel: '', yoyoShuttle: '', situp: '', longJump: '', pushup: '', sitReach: '' });
        }, 1200);
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('Connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="surface mb-4">
        <div className="section-hd"><i className="bi bi-person" /> Select Athlete</div>
        <select className="form-select" value={form.playerId} onChange={e => {
            const pid = e.target.value;
            const a = athletes.find(x => x.PlayerID === pid);
            setForm(f => ({
              ...f,
              playerId: pid,
              height:  String(a?.Latest?.Height  || ''),
              weight:  String(a?.Latest?.Weight  || ''),
              fat:     String(a?.Latest?.Fat     || ''),
              muscle:  String(a?.Latest?.Muscle  || ''),
            }));
          }} required>
          <option value="">— เลือกนักกีฬา —</option>
          {athletes.map(a => <option key={a.PlayerID} value={a.PlayerID}>{a.Name} ({a.Team || '—'})</option>)}
        </select>
      </div>

      <div className="grid-form-side">
        <div>
          {/* Body Composition */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-person-fill" /> Body Composition</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[{ k:'height', label:'Height (cm)' },{ k:'weight', label:'Weight (kg)' },{ k:'fat', label:'Body Fat (%)' },{ k:'muscle', label:'Muscle (%)' }].map(f => (
                <div key={f.k} style={{ flex: '1 1 140px' }}>
                  <label className="form-label">{f.label}</label>
                  <input type="number" step="0.1" className="form-control" value={(form as Record<string,string>)[f.k]} onChange={e => set(f.k, e.target.value)} />
                </div>
              ))}
              <div style={{ flex: '1 1 140px' }}>
                <label className="form-label">BMI (auto)</label>
                <div style={{ background: '#3b0743', borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#00ff88', fontSize: '1.1rem' }}>{bmi || '0.00'}</div>
              </div>
            </div>
          </div>

          {/* Speed & Power */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-stopwatch" /> Speed & Power</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: '1 1 160px' }}>
                <label className="form-label">Speed 30m (s)</label>
                <input type="number" step="0.01" className="form-control" value={form.speed30} onChange={e => set('speed30', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="form-label">CMJ (cm)</label>
                <input type="number" step="0.1" className="form-control" style={{ border: '2px solid #818cf8' }} value={form.cmj} onChange={e => set('cmj', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="form-label">Peak Power (auto)</label>
                <div style={{ background: '#f0f7ff', borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0369a1', fontSize: '1rem', border: '1px solid #bae6fd' }}>
                  {pp ? `${Number(pp).toLocaleString()} W` : '0 W'}
                </div>
              </div>
            </div>
          </div>

          {/* Agility */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-arrow-left-right" /> Illinois Agility Test (L+R)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: '1 1 140px' }}>
                <label className="form-label">หมุนซ้าย (s)</label>
                <input type="number" step="0.01" className="form-control" value={form.agiL} onChange={e => set('agiL', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="form-label">หมุนขวา (s)</label>
                <input type="number" step="0.01" className="form-control" value={form.agiR} onChange={e => set('agiR', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="form-label" style={{ color: '#ef4444' }}>รวม (อัตโนมัติ)</label>
                <div style={{ background: '#e2e8f0', borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#581c87', fontSize: '1.1rem' }}>
                  {agiTotal || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Yo-Yo */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-heart-pulse-fill" style={{ color: '#ef4444' }} /> Yo-Yo IR Level 1</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: '1 1 130px' }}>
                <label className="form-label">Level</label>
                <select className="form-select" value={form.yoyoLevel} onChange={e => set('yoyoLevel', e.target.value)}>
                  <option value="">- เลือก -</option>
                  {[5,9,11,12,13,14,15,16,17,18,19,20,21,22,23].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label className="form-label">Shuttle</label>
                <select className="form-select" value={form.yoyoShuttle} onChange={e => set('yoyoShuttle', e.target.value)}>
                  <option value="">- เลือก -</option>
                  {[1,2,3,4,5,6,7,8].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label className="form-label" style={{ color: '#ef4444' }}>ระยะทาง (m)</label>
                <div style={{ background: '#e2e8f0', borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#581c87', fontSize: '1.1rem' }}>
                  {yoyo || '0'}
                </div>
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <label className="form-label" style={{ color: '#ef4444' }}>VO₂ MAX</label>
                <div style={{ background: '#fee2e2', borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>
                  {vo2 || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Strength & Flexibility */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-lightning-fill" /> Strength & Flexibility</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[
                { k:'situp',    label:'Sit-up (รอบ/40s)'   },
                { k:'longJump', label:'Long Jump (cm)'      },
                { k:'pushup',   label:'Push-up (รอบ/40s)'  },
                { k:'sitReach', label:'Sit & Reach (cm)'    },
              ].map(f => (
                <div key={f.k} style={{ flex: '1 1 160px' }}>
                  <label className="form-label">{f.label}</label>
                  <input type="number" step="0.1" className="form-control" value={(form as Record<string,string>)[f.k]} onChange={e => set(f.k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-100" style={{ justifyContent:'center', padding:14, fontSize:'1rem', background:'#3b0743' }} disabled={saving}>
            {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> Saving…</> : <><i className="bi bi-cloud-arrow-up"/> บันทึกผลการทดสอบ</>}
          </button>
        </div>

        {/* Live Score Preview */}
        <div className="surface" style={{ position: 'sticky', top: 20 }}>
          <div className="section-hd"><i className="bi bi-speedometer2" /> Live Score Preview</div>
          {!form.playerId
            ? <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>เลือกนักกีฬาก่อน</p>
            : (
              <>
                {METRIC_KEYS.map(k => {
                  const sc  = liveScores[k];
                  const col = sc > 0 ? SCORE_COLORS[sc] : null;
                  return (
                    <div key={k} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:'0.78rem', flex:1, fontWeight:600 }}>{METRIC_LABELS[k]}</div>
                      {col ? <span style={{ background:col.bg, color:col.color, borderRadius:5, padding:'2px 10px', fontSize:'0.75rem', fontWeight:700 }}>{sc}/5 {col.label}</span> : <span style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>—</span>}
                    </div>
                  );
                })}
                <div style={{ marginTop:16, background:'#0f172a', borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:2, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', marginBottom:4 }}>Overall Rating</div>
                  <div style={{ fontSize:'2.6rem', fontWeight:800, lineHeight:1, color:rating>=60?'#4ade80':rating>=40?'#facc15':'#f87171' }}>{rating}</div>
                </div>
              </>
            )}
        </div>
      </div>
    </form>
  );
}

// ─── Bulk Update ──────────────────────────────────────────────────────────────
const BULK_FIELDS = [
  { k:'height',       label:'Ht(cm)'    },
  { k:'weight',       label:'Wt(kg)'    },
  { k:'speed30',      label:'Speed(s)'  },
  { k:'cmj',          label:'CMJ(cm)'   },
  { k:'agiL',         label:'AgiL(s)'   },
  { k:'agiR',         label:'AgiR(s)'   },
  { k:'situp',        label:'Sit-up'    },
  { k:'pushup',       label:'Push-up'   },
  { k:'longJump',     label:'LJump(cm)' },
  { k:'sitReach',     label:'SitReach'  },
  { k:'yoyoLevel',    label:'YoYo Lv'   },
  { k:'yoyoShuttle',  label:'Shuttle'   },
];

function BulkTab({ athletes, onSuccess }: Props) {
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [data, setData]         = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(0);
  const [total, setTotal]       = useState(0);

  /* Filter panel state */
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPos,  setFilterPos]  = useState('');
  const [filterName, setFilterName] = useState('');
  const [checked, setChecked]       = useState<Set<string>>(new Set());

  const teams = Array.from(new Set(athletes.map(a => a.Team).filter(Boolean))).sort();
  const positions = ['Goalkeeper','Defender','Midfielder','Forward'];

  const filtered = athletes.filter(a => {
    if (filterTeam && a.Team !== filterTeam) return false;
    if (filterPos) {
      const p = (a.Position || '').toLowerCase();
      if (filterPos === 'Goalkeeper' && !p.includes('goal')) return false;
      if (filterPos === 'Defender'   && !p.includes('def') && !p.includes('back')) return false;
      if (filterPos === 'Midfielder' && !p.includes('mid')) return false;
      if (filterPos === 'Forward'    && !/forward|fwd|wing|striker/i.test(p)) return false;
    }
    if (filterName) {
      const q = filterName.toLowerCase();
      return (a.Name||'').toLowerCase().includes(q) || (a.Nickname||'').toLowerCase().includes(q);
    }
    return true;
  });

  /* Add checked athletes to test table */
  const addToTable = () => {
    if (!checked.size) { showToast('กรุณาเลือกนักกีฬาก่อน', 'error'); return; }
    const newIds = [...checked].filter(id => !tableIds.includes(id));
    setTableIds(prev => [...prev, ...newIds]);
    setData(prev => {
      const next = { ...prev };
      newIds.forEach(id => {
        const a = athletes.find(x => x.PlayerID === id);
        next[id] = {
          ...( next[id] || {} ),
          height: String(a?.Latest?.Height || ''),
          weight: String(a?.Latest?.Weight || ''),
        };
      });
      return next;
    });
    setChecked(new Set());
  };

  const removeFromTable = (pid: string) => {
    setTableIds(prev => prev.filter(id => id !== pid));
    setData(prev => { const n = { ...prev }; delete n[pid]; return n; });
  };

  const setCell = (pid: string, field: string, val: string) =>
    setData(d => ({ ...d, [pid]: { ...(d[pid] || {}), [field]: val } }));

  const tableAthletes = tableIds.map(id => athletes.find(a => a.PlayerID === id)).filter(Boolean) as Athlete[];
  const readyCount = tableAthletes.filter(a => BULK_FIELDS.some(f => data[a.PlayerID]?.[f.k])).length;

  const handleSave = async () => {
    const rows = tableAthletes.filter(a => BULK_FIELDS.some(f => data[a.PlayerID]?.[f.k]));
    if (!rows.length) { showToast('ยังไม่มีข้อมูลที่กรอก', 'error'); return; }
    if (!confirm(`บันทึกข้อมูล ${rows.length} คน?`)) return;
    setSaving(true); setSaved(0); setTotal(rows.length);
    let ok = 0;
    for (const a of rows) {
      const fields = data[a.PlayerID] || {};
      const yoyoDist = calcYoyoDist(fields.yoyoLevel || '', fields.yoyoShuttle || '');
      try {
        await callGAS('saveTest', {
          playerId: a.PlayerID,
          height: fields.height || '', weight: fields.weight || '',
          cmj: fields.cmj || '', speed30: fields.speed30 || '',
          agiL: fields.agiL || '', agiR: fields.agiR || '',
          situp: fields.situp || '', pushup: fields.pushup || '',
          longJump: fields.longJump || '', sitReach: fields.sitReach || '',
          yoyoLevel: fields.yoyoLevel || '', yoyoShuttle: fields.yoyoShuttle || '',
          yoyo: yoyoDist > 0 ? String(yoyoDist) : '',
          vo2max: yoyoDist > 0 ? calcVo2(yoyoDist) : '',
        });
        ok++;
      } catch { /* continue */ }
      setSaved(ok);
    }
    setSaving(false);
    showToast(`บันทึกสำเร็จ ${ok}/${rows.length} คน`, 'success');
    if (ok > 0) onSuccess();
  };

  const allFilteredChecked = filtered.length > 0 && filtered.every(a => checked.has(a.PlayerID));
  const toggleAll = () => {
    if (allFilteredChecked) setChecked(prev => { const n = new Set(prev); filtered.forEach(a => n.delete(a.PlayerID)); return n; });
    else setChecked(prev => { const n = new Set(prev); filtered.forEach(a => n.add(a.PlayerID)); return n; });
  };

  return (
    <div>
      {/* ── Step 1: เลือกนักกีฬา ── */}
      <div className="surface mb-4">
        <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:'#0f172a', color:'white', borderRadius:'50%', width:22, height:22, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:800 }}>1</span>
          เลือกนักกีฬาที่จะทดสอบ
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
          <select className="form-select" style={{ flex:'1 1 140px', maxWidth:180 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">— รุ่นทั้งหมด —</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" style={{ flex:'1 1 140px', maxWidth:180 }} value={filterPos} onChange={e => setFilterPos(e.target.value)}>
            <option value="">— ตำแหน่งทั้งหมด —</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="search-wrap" style={{ flex:'1 1 180px', maxWidth:260 }}>
            <i className="bi bi-search"/>
            <input className="form-control" placeholder="ค้นชื่อ..." value={filterName} onChange={e => setFilterName(e.target.value)} style={{ fontSize:'0.82rem' }}/>
          </div>
        </div>

        {/* Athlete list */}
        {filtered.length === 0
          ? <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-muted)', fontSize:'0.85rem' }}>ไม่พบนักกีฬา</div>
          : (
            <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginTop:4 }}>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
                <input type="checkbox" checked={allFilteredChecked} onChange={toggleAll}
                  style={{ accentColor:'var(--accent)', width:15, height:15, cursor:'pointer' }}/>
                <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>
                  เลือกทั้งหมด ({filtered.filter(a => !tableIds.includes(a.PlayerID)).length} คน)
                </span>
                <div style={{ flex:1 }}/>
                <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>แสดง {filtered.length} คน</span>
              </div>
              {/* Rows */}
              <div style={{ maxHeight:340, overflowY:'auto' }}>
                {filtered.map((a, i) => {
                  const isIn = tableIds.includes(a.PlayerID);
                  const isCk = checked.has(a.PlayerID);
                  const initials = (a.Name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
                  return (
                    <label key={a.PlayerID} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 14px',
                      borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none',
                      cursor: isIn ? 'default' : 'pointer',
                      background: isCk ? 'rgba(56,189,248,0.07)' : 'transparent',
                      opacity: isIn ? 0.4 : 1, transition:'background 0.1s',
                    }}>
                      <input type="checkbox" checked={isCk} disabled={isIn}
                        onChange={e => setChecked(prev => { const n = new Set(prev); e.target.checked ? n.add(a.PlayerID) : n.delete(a.PlayerID); return n; })}
                        style={{ accentColor:'var(--accent)', width:15, height:15, flexShrink:0, cursor: isIn ? 'default' : 'pointer' }}/>
                      {/* Avatar */}
                      <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:'linear-gradient(135deg,#a06a00,#f0d050)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {a.PhotoUrl
                          ? <img src={a.PhotoUrl} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} alt=""/>
                          : <span style={{ fontSize:'0.55rem', fontWeight:900, color:'rgba(0,0,0,0.5)' }}>{initials}</span>}
                      </div>
                      {/* Name */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'0.85rem', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.Name}</div>
                        {a.Nickname && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{a.Nickname}</div>}
                      </div>
                      {/* Team */}
                      {a.Team && <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--accent)', background:'rgba(56,189,248,0.1)', borderRadius:5, padding:'2px 8px', flexShrink:0 }}>{a.Team}</span>}
                      {/* Position */}
                      {a.Position && <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', flexShrink:0, minWidth:72, textAlign:'right' }}>{a.Position}</span>}
                      {isIn && <i className="bi bi-check-circle-fill" style={{ color:'#10b981', fontSize:'0.85rem', flexShrink:0 }}/>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

        {/* Add button */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
          <button
            className="btn-primary"
            style={{ background:'#0f172a', padding:'9px 22px', fontSize:'0.88rem', opacity: checked.size === 0 ? 0.5 : 1 }}
            onClick={addToTable}
            disabled={checked.size === 0}
          >
            <i className="bi bi-person-plus-fill" style={{ marginRight:6 }}/>
            เพิ่มเข้าตาราง ({checked.size} คน)
          </button>
        </div>
      </div>

      {/* ── Step 2: กรอกผล ── */}
      {tableIds.length > 0 && (
        <div className="surface" style={{ padding:0 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'#0f172a', color:'white', borderRadius:'50%', width:22, height:22, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:800 }}>2</span>
            <span style={{ fontWeight:700, fontSize:'0.9rem' }}>กรอกผลการทดสอบ</span>
            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginLeft:4 }}>{tableIds.length} คน · กรอกเฉพาะช่องที่มีข้อมูล</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th>นักกีฬา</th>
                  {BULK_FIELDS.map(f => <th key={f.k}>{f.label}</th>)}
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tableAthletes.map(a => {
                  const hasData = BULK_FIELDS.some(f => data[a.PlayerID]?.[f.k]);
                  return (
                    <tr key={a.PlayerID}>
                      <td style={{ textAlign:'left' }}>
                        <div style={{ fontWeight:600, fontSize:'0.85rem' }}>{a.Name}</div>
                        <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{a.Team || '—'}</div>
                      </td>
                      {BULK_FIELDS.map(f => (
                        <td key={f.k}>
                          {f.k === 'yoyoLevel' ? (
                            <select className="bulk-input" value={data[a.PlayerID]?.[f.k] || ''} onChange={e => setCell(a.PlayerID, f.k, e.target.value)}>
                              <option value="">-</option>
                              {[5,9,11,12,13,14,15,16,17,18,19,20,21,22,23].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          ) : f.k === 'yoyoShuttle' ? (
                            <select className="bulk-input" value={data[a.PlayerID]?.[f.k] || ''} onChange={e => setCell(a.PlayerID, f.k, e.target.value)}>
                              <option value="">-</option>
                              {[1,2,3,4,5,6,7,8].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          ) : (
                            <input className="bulk-input" type="number" step="0.01"
                              value={data[a.PlayerID]?.[f.k] || ''}
                              onChange={e => setCell(a.PlayerID, f.k, e.target.value)} />
                          )}
                        </td>
                      ))}
                      <td style={{ textAlign:'center' }}>
                        {hasData
                          ? <span style={{ fontSize:'0.7rem', color:'#22c55e', fontWeight:700 }}>✓</span>
                          : <span style={{ fontSize:'0.7rem', color:'#94a3b8' }}>ว่าง</span>}
                      </td>
                      <td>
                        <button onClick={() => removeFromTable(a.PlayerID)} title="นำออก"
                          style={{ padding:'3px 6px', border:'none', background:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.85rem' }}>
                          <i className="bi bi-x-circle"/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {saving && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 16px', margin:'12px 16px 0', fontSize:'0.875rem', color:'#166534' }}>
              <span className="spinner-ring" style={{ width:16, height:16, borderWidth:2, display:'inline-block', marginRight:8, verticalAlign:'middle' }} />
              กำลังบันทึก {saved}/{total} คน...
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
              <span style={{ fontWeight:700, color:'var(--text)' }}>{readyCount}</span> คนพร้อมบันทึก
            </div>
            <button className="btn-primary" style={{ background:'#0f172a', padding:'10px 28px' }} onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> กำลังบันทึก…</> : <><i className="bi bi-save2 me-1"/>บันทึกทั้งหมด</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSV Import ───────────────────────────────────────────────────────────────
function CSVTab({ athletes, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string).replace(/^﻿/, '');
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;
      const hdrs = lines[0].split(',').map(h => h.trim());
      setHeaders(hdrs);
      const rows = lines.slice(1, 51).map(l => {
        const vals = l.split(',');
        const obj: Record<string, string> = {};
        hdrs.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
        const matched = athletes.find(a => a.PlayerID === obj.PlayerID || a.Name === obj.Name);
        obj._matched = matched ? matched.Name : '';
        obj._playerId = matched ? matched.PlayerID : '';
        return obj;
      });
      setPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const downloadTemplate = () => {
    const hdrs = ['PlayerID','Name','Height','Weight','Muscle','Fat','Speed30','CMJ','AgiL','AgiR','Situp','Pushup','LongJump','SitReach','YoyoLevel','YoyoShuttle'];
    const ex = athletes[0] ? [athletes[0].PlayerID, athletes[0].Name,'170','65','50','15','4.20','35','8.50','8.70','35','20','210','10','14','3'] : ['ATH-001','ชื่อนักกีฬา','170','65','50','15','4.20','35','8.50','8.70','35','20','210','10','14','3'];
    const csv = hdrs.join(',') + '\n' + ex.join(',');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'UpdateResults_Template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const toSave = preview.filter(r => r._playerId);
    if (!toSave.length) { showToast('ไม่มีข้อมูลที่ตรงกับนักกีฬาในระบบ', 'error'); return; }
    if (!confirm(`บันทึกข้อมูล ${toSave.length} คน?`)) return;
    setSaving(true); setProgress(0);
    let ok = 0;
    for (const row of toSave) {
      const yoyoDist = calcYoyoDist(row.YoyoLevel || '', row.YoyoShuttle || '');
      try {
        await callGAS('saveTest', {
          playerId: row._playerId,
          height: row.Height||'', weight: row.Weight||'',
          muscle: row.Muscle||'', fat: row.Fat||'',
          cmj: row.CMJ||'', speed30: row.Speed30||'',
          agiL: row.AgiL||'', agiR: row.AgiR||'',
          situp: row.Situp||'', pushup: row.Pushup||'',
          longJump: row.LongJump||'', sitReach: row.SitReach||'',
          yoyoLevel: row.YoyoLevel||'', yoyoShuttle: row.YoyoShuttle||'',
          yoyo: yoyoDist > 0 ? String(yoyoDist) : '',
          vo2max: yoyoDist > 0 ? calcVo2(yoyoDist) : '',
        });
        ok++;
      } catch { /* continue */ }
      setProgress(ok);
    }
    setSaving(false);
    showToast(`นำเข้าสำเร็จ ${ok}/${toSave.length} คน`, 'success');
    if (ok > 0) onSuccess();
  };

  const matched = preview.filter(r => r._playerId).length;

  return (
    <div className="surface">
      <div className="section-hd"><i className="bi bi-file-earmark-spreadsheet" /> Import CSV</div>

      {/* Download template */}
      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'var(--radius-sm)', padding:16, marginBottom:24 }}>
        <div style={{ fontWeight:700, color:'#166534', marginBottom:8 }}><i className="bi bi-download" /> ดาวน์โหลด Template</div>
        <p style={{ fontSize:'0.85rem', color:'#15803d', marginBottom:12 }}>ดาวน์โหลดไฟล์ตัวอย่างเพื่อกรอกข้อมูลให้ถูกต้อง</p>
        <button className="btn-outline" style={{ borderColor:'#22c55e', color:'#166534' }} onClick={downloadTemplate}>
          <i className="bi bi-file-earmark-excel" /> Download Template (.csv)
        </button>
      </div>

      {/* Upload */}
      <div style={{ background:'white', border:'2px dashed #e2e8f0', borderRadius:'var(--radius-sm)', padding:32, textAlign:'center', marginBottom:20 }}>
        <i className="bi bi-cloud-upload" style={{ fontSize:'3rem', color:'#94a3b8', display:'block', marginBottom:12 }} />
        <div style={{ fontWeight:700, marginBottom:6 }}>วางไฟล์ที่นี่ หรือ</div>
        <label style={{ cursor:'pointer' }}>
          <span className="btn-primary" style={{ display:'inline-flex' }}><i className="bi bi-folder2-open" /> เลือกไฟล์</span>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleFile} />
        </label>
        <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:10 }}>รองรับ .csv เท่านั้น</div>
      </div>

      {preview.length > 0 && (
        <>
          <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:12 }}>
            พบ <strong style={{ color:'#0f172a' }}>{preview.length}</strong> แถว
            {' · '}ตรงกับนักกีฬา <strong style={{ color:'#22c55e' }}>{matched}</strong> คน
          </div>
          <div style={{ overflowX:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
              <thead>
                <tr style={{ background:'#0f172a', color:'white' }}>
                  <th style={{ padding:'8px 12px' }}>สถานะ</th>
                  {headers.slice(0, 8).map(h => <th key={h} style={{ padding:'8px 12px' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ background: row._playerId ? 'white' : '#fef2f2', borderBottom:'1px solid #e2e8f0' }}>
                    <td style={{ padding:'8px 12px' }}>
                      {row._playerId
                        ? <span style={{ color:'#22c55e', fontWeight:700 }}>✓ {row._matched}</span>
                        : <span style={{ color:'#ef4444', fontWeight:700 }}>✗ ไม่พบ</span>}
                    </td>
                    {headers.slice(0, 8).map(h => <td key={h} style={{ padding:'8px 12px' }}>{row[h] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {saving && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 16px', marginBottom:16, fontSize:'0.875rem', color:'#166534' }}>
              <span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,display:'inline-block',marginRight:8,verticalAlign:'middle' }}/>
              กำลังนำเข้า {progress}/{matched} คน...
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-outline" onClick={() => { setPreview([]); setHeaders([]); if (fileRef.current) fileRef.current.value=''; }}>
              <i className="bi bi-x" /> ยกเลิก
            </button>
            <button className="btn-primary" style={{ background:'#0f172a' }} onClick={handleImport} disabled={saving || matched === 0}>
              {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> Importing…</> : <><i className="bi bi-save2"/> นำเข้าข้อมูล ({matched} คน)</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UpdateResultsPage({ athletes, onSuccess }: Props) {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: 'กรอกทีละคน',    icon: 'bi-person'                    },
    { label: 'กรอกหลายคน',    icon: 'bi-people'                    },
    { label: 'Import CSV',     icon: 'bi-file-earmark-spreadsheet'  },
  ];
  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Update Results</h2><p className="page-subtitle">บันทึกผลการทดสอบสมรรถภาพนักกีฬา</p></div>
      </div>
      <div className="tab-switch mb-4">
        {tabs.map((t, i) => (
          <button key={i} className={`tab-btn${tab===i?' active':''}`} onClick={() => setTab(i)}>
            <i className={`bi ${t.icon}`} style={{ marginRight:6 }}/>{t.label}
          </button>
        ))}
      </div>
      {tab === 0 && <SingleTab athletes={athletes} onSuccess={onSuccess} />}
      {tab === 1 && <BulkTab   athletes={athletes} onSuccess={onSuccess} />}
      {tab === 2 && <CSVTab    athletes={athletes} onSuccess={onSuccess} />}
    </div>
  );
}
