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
        <select className="form-select" value={form.playerId} onChange={e => set('playerId', e.target.value)} required>
          <option value="">— เลือกนักกีฬา —</option>
          {athletes.map(a => <option key={a.PlayerID} value={a.PlayerID}>{a.Name} ({a.Team || '—'})</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
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
            <div className="section-hd"><i className="bi bi-arrow-left-right" /> Arrowhead Agility Test</div>
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
  const [data, setData] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [total, setTotal] = useState(0);

  const setCell = (pid: string, field: string, val: string) =>
    setData(d => ({ ...d, [pid]: { ...(d[pid] || {}), [field]: val } }));

  const readyCount = Object.entries(data).filter(([, v]) => Object.values(v).some(x => x !== '')).length;

  const handleSave = async () => {
    const rows = Object.entries(data).filter(([, v]) => Object.values(v).some(x => x !== ''));
    if (!rows.length) { showToast('ยังไม่มีข้อมูลที่กรอก', 'error'); return; }
    if (!confirm(`บันทึกข้อมูล ${rows.length} คน?`)) return;

    setSaving(true);
    setSaved(0);
    setTotal(rows.length);

    let ok = 0;
    for (const [pid, fields] of rows) {
      const yoyoDist = calcYoyoDist(fields.yoyoLevel || '', fields.yoyoShuttle || '');
      try {
        await callGAS('saveTest', {
          playerId: pid,
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

  return (
    <div>
      <div style={{ background:'#dbeafe', border:'1px solid #bfdbfe', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:20, fontSize:'0.85rem', color:'#1e40af' }}>
        <i className="bi bi-info-circle-fill" /> กรอกเฉพาะช่องที่มีข้อมูล ช่องที่ว่างจะไม่ถูกบันทึก
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="roster-table">
          <thead>
            <tr>
              <th>นักกีฬา</th>
              {BULK_FIELDS.map(f => <th key={f.k}>{f.label}</th>)}
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a, i) => {
              const hasData = BULK_FIELDS.some(f => data[a.PlayerID]?.[f.k]);
              return (
                <tr key={a.PlayerID} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.Name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.Team || '—'}</div>
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
                  <td style={{ textAlign: 'center' }}>
                    {hasData
                      ? <span style={{ fontSize:'0.7rem', color:'#22c55e', fontWeight:700 }}>✓ มีข้อมูล</span>
                      : <span style={{ fontSize:'0.7rem', color:'#94a3b8' }}>ว่าง</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {saving && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 16px', marginTop:16, fontSize:'0.875rem', color:'#166534' }}>
          <span className="spinner-ring" style={{ width:16, height:16, borderWidth:2, display:'inline-block', marginRight:8, verticalAlign:'middle' }} />
          กำลังบันทึก {saved}/{total} คน...
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, flexWrap:'wrap', gap:12 }}>
        <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
          <span style={{ fontWeight:700, color:'#0f172a' }}>{readyCount}</span> คนพร้อมบันทึก
        </div>
        <button className="btn-primary" style={{ background:'#0f172a', padding:'12px 36px' }} onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> กำลังบันทึก…</> : <><i className="bi bi-save2"/> บันทึกทั้งหมด</>}
        </button>
      </div>
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
