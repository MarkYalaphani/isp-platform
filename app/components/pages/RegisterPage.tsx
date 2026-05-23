'use client';

import { useState, useRef } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { onSuccess: () => void | Promise<void>; user: User; }

const POSITIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const PROVINCES = ['กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'];
const TODAY = new Date().toISOString().split('T')[0];

// ── Single Tab ──────────────────────────────────────────────────────────────
function SingleTab({ onSuccess, user }: { onSuccess: Props['onSuccess']; user: User }) {
  const [form, setForm] = useState({
    name: '', nickname: '', dob: '', team: '', position: 'Forward',
    club: '', province: '', domHand: 'Right', domFoot: 'Right',
    height: '', weight: '',
  });
  const [photo, setPhoto] = useState<{ base64: string; mime: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error'); if (fileRef.current) fileRef.current.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { showToast('ไฟล์รูปต้องไม่เกิน 5MB', 'error'); if (fileRef.current) fileRef.current.value = ''; return; }
    const reader = new FileReader();
    reader.onload = ev => { const r = ev.target?.result as string; setPhotoPreview(r); setPhoto({ base64: r, mime: file.type }); };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({ name: '', nickname: '', dob: '', team: '', position: 'Forward', club: '', province: '', domHand: 'Right', domFoot: 'Right', height: '', weight: '' });
    setPhoto(null); setPhotoPreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('กรุณากรอกชื่อ-นามสกุล', 'error'); return; }
    if (form.dob && form.dob > TODAY) { showToast('วันเกิดต้องไม่เป็นวันในอนาคต', 'error'); return; }
    setSaving(true);
    try {
      const res = await callGAS('saveAthlete', {
        name: form.name, nickname: form.nickname, dob: form.dob, team: form.team,
        position: form.position, club: form.club, province: form.province,
        domHand: form.domHand, domFoot: form.domFoot,
        clubId: user.role !== 'admin' ? (user.clubId || '') : '',
        photoBase64: photo?.base64 || '', photoMimeType: photo?.mime || '',
      }) as { status: string; message: string; playerId?: string };

      if (res.status === 'success') {
        // Save initial body composition if provided
        const pid = res.playerId;
        if (pid && (form.height || form.weight)) {
          try { await callGAS('saveTest', { playerId: pid, height: form.height, weight: form.weight }); } catch {}
        }
        showToast(res.message || 'บันทึกสำเร็จ!', 'success');
        resetForm();
        onSuccess();
      } else {
        showToast(res.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface" style={{ maxWidth: 800 }}>
      <form onSubmit={handleSubmit}>
        {/* Photo */}
        <div style={{ width: '100%', marginBottom: 20, background: 'rgba(56,189,248,0.05)', padding: 16, borderRadius: 12, border: '1px dashed var(--accent)' }}>
          <label className="form-label"><i className="bi bi-camera" /> รูปประจำตัว</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            {photoPreview
              ? <img src={photoPreview} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--border)' }} alt="" />
              : <div className="photo-placeholder" onClick={() => fileRef.current?.click()}><i className="bi bi-camera" /></div>}
            <div>
              <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}><i className="bi bi-upload" /> Upload Photo</button>
              {photoPreview && <button type="button" className="btn-outline btn-sm ms-2" onClick={() => { setPhoto(null); setPhotoPreview(''); }}><i className="bi bi-x" /></button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
          <div style={{ width: '100%' }}>
            <label className="form-label">ชื่อ-นามสกุล *</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">ชื่อเล่น</label>
            <input className="form-control" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">วันเกิด</label>
            <input type="date" className="form-control" value={form.dob} max={TODAY} onChange={e => set('dob', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label className="form-label">รุ่นอายุ</label>
            <select className="form-select" value={form.team} onChange={e => set('team', e.target.value)}>
              <option value="">- เลือก -</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">ตำแหน่ง</label>
            <select className="form-select" value={form.position} onChange={e => set('position', e.target.value)}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="form-label">เท้าถนัด</label>
            <select className="form-select" value={form.domFoot} onChange={e => set('domFoot', e.target.value)}>
              <option>Right</option><option>Left</option><option>Both</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="form-label">มือถนัด</label>
            <select className="form-select" value={form.domHand} onChange={e => set('domHand', e.target.value)}>
              <option>Right</option><option>Left</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">สโมสร/โรงเรียน</label>
            <input className="form-control" value={form.club} onChange={e => set('club', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">จังหวัด</label>
            <select className="form-select" value={form.province} onChange={e => set('province', e.target.value)}>
              <option value="">- เลือก -</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Body Composition */}
          <div style={{ width: '100%', marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              <i className="bi bi-person-fill me-1" />Body Composition (ไม่บังคับ)
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="form-label">ส่วนสูง (cm)</label>
                <input type="number" step="0.1" className="form-control" value={form.height} onChange={e => set('height', e.target.value)} placeholder="เช่น 168" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="form-label">น้ำหนัก (kg)</label>
                <input type="number" step="0.1" className="form-control" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="เช่น 58" />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-100" style={{ justifyContent: 'center', padding: 14, fontSize: '1rem' }} disabled={saving}>
          {saving ? <><span className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }} /> Saving...</> : <><i className="bi bi-person-plus" /> Register Athlete</>}
        </button>
      </form>
    </div>
  );
}

// ── Batch Tab ───────────────────────────────────────────────────────────────
type Row = { name: string; nickname: string; dob: string; team: string; position: string; club: string; province: string; domFoot: string; domHand: string; height: string; weight: string; };
const blankRow = (): Row => ({ name: '', nickname: '', dob: '', team: '', position: 'Forward', club: '', province: '', domFoot: 'Right', domHand: 'Right', height: '', weight: '' });

const BATCH_COLS: { key: keyof Row; label: string; width: number; type?: string; options?: string[] }[] = [
  { key: 'name',     label: 'ชื่อ-นามสกุล *', width: 160 },
  { key: 'nickname', label: 'ชื่อเล่น',        width: 100 },
  { key: 'dob',      label: 'วันเกิด',          width: 140, type: 'date' },
  { key: 'team',     label: 'รุ่น',             width: 90,  options: TEAMS },
  { key: 'position', label: 'ตำแหน่ง',          width: 110, options: POSITIONS },
  { key: 'club',     label: 'สโมสร/รร.',        width: 120 },
  { key: 'province', label: 'จังหวัด',           width: 130, options: PROVINCES },
  { key: 'domFoot',  label: 'เท้าถนัด',         width: 90,  options: ['Right','Left','Both'] },
  { key: 'domHand',  label: 'มือถนัด',           width: 90,  options: ['Right','Left'] },
  { key: 'height',   label: 'สูง (cm)',          width: 90,  type: 'number' },
  { key: 'weight',   label: 'หนัก (kg)',         width: 90,  type: 'number' },
];

function BatchTab({ onSuccess, user }: { onSuccess: Props['onSuccess']; user: User }) {
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()]);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);

  const setCell = (i: number, k: keyof Row, v: string) =>
    setRows(r => r.map((row, j) => j === i ? { ...row, [k]: v } : row));

  const addRow = () => setRows(r => [...r, blankRow()]);
  const removeRow = (i: number) => setRows(r => r.filter((_, j) => j !== i));

  const handleSave = async () => {
    const valid = rows.filter(r => r.name.trim());
    if (!valid.length) { showToast('กรุณากรอกชื่ออย่างน้อย 1 คน', 'error'); return; }
    const names = valid.map(r => r.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) { showToast('มีชื่อซ้ำกันในฟอร์ม', 'error'); return; }

    setSaving(true); setResults([]);
    const res: { name: string; ok: boolean; msg: string }[] = [];
    for (const row of valid) {
      try {
        const r = await callGAS('saveAthlete', {
          name: row.name, nickname: row.nickname, dob: row.dob, team: row.team,
          position: row.position, club: row.club, province: row.province,
          domFoot: row.domFoot, domHand: row.domHand,
          clubId: user.role !== 'admin' ? (user.clubId || '') : '',
          photoBase64: '', photoMimeType: '',
        }) as { status: string; message: string; playerId?: string };

        if (r.status === 'success' && r.playerId && (row.height || row.weight)) {
          try { await callGAS('saveTest', { playerId: r.playerId, height: row.height, weight: row.weight }); } catch {}
        }
        res.push({ name: row.name, ok: r.status === 'success', msg: r.message || (r.status === 'success' ? 'สำเร็จ' : 'ผิดพลาด') });
      } catch {
        res.push({ name: row.name, ok: false, msg: 'Connection error' });
      }
    }
    setResults(res);
    setSaving(false);
    const ok = res.filter(r => r.ok).length;
    if (ok > 0) {
      showToast(`เพิ่มสำเร็จ ${ok}/${valid.length} คน`, 'success');
      if (ok === valid.length) setTimeout(() => { setRows([blankRow(), blankRow(), blankRow()]); setResults([]); onSuccess(); }, 1800);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button className="btn-outline" onClick={addRow}><i className="bi bi-plus-circle me-1" />เพิ่มแถว</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> กำลังบันทึก...</>
            : <><i className="bi bi-floppy me-1" />บันทึกทั้งหมด ({rows.filter(r => r.name.trim()).length} คน)</>}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {results.map((r, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
              background: r.ok ? '#f0fdf4' : '#fef2f2', color: r.ok ? '#166534' : '#dc2626', border: `1px solid ${r.ok ? '#bbf7d0' : '#fecaca'}` }}>
              <i className={`bi bi-${r.ok ? 'check-circle-fill' : 'x-circle-fill'}`} />
              {r.name}: {r.msg}
            </span>
          ))}
        </div>
      )}

      <div className="surface" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>#</th>
              {BATCH_COLS.map(c => (
                <th key={c.key} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: c.key === 'height' || c.key === 'weight' ? '#0369a1' : 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {c.label}
                </th>
              ))}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const res = results.find(r => r.name === row.name);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: res ? (res.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)') : 'transparent' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 700, width: 32 }}>{i + 1}</td>
                  {BATCH_COLS.map(c => (
                    <td key={c.key} style={{ padding: '4px 6px' }}>
                      {c.options ? (
                        <select className="form-select" style={{ minWidth: c.width }} value={row[c.key]} onChange={e => setCell(i, c.key, e.target.value)}>
                          {c.key === 'team' && <option value="">-</option>}
                          {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          className="form-control"
                          type={c.type || 'text'}
                          step={c.type === 'number' ? '0.1' : undefined}
                          max={c.type === 'date' ? TODAY : undefined}
                          style={{ minWidth: c.width }}
                          value={row[c.key]}
                          placeholder={c.key === 'name' ? 'ชื่อ-นามสกุล' : c.key === 'club' ? 'สโมสร / โรงเรียน' : undefined}
                          onChange={e => setCell(i, c.key, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '4px 8px' }}>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} style={{ padding: '4px 8px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn-outline" onClick={addRow} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
        <i className="bi bi-plus-circle me-1" />เพิ่มแถว
      </button>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function RegisterPage({ onSuccess, user }: Props) {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Add Athlete</h2><p className="page-subtitle">ลงทะเบียนนักกีฬาใหม่</p></div>
      </div>
      <div className="tab-switch mb-4">
        <button className={`tab-btn${tab === 0 ? ' active' : ''}`} onClick={() => setTab(0)}>
          <i className="bi bi-person-plus" style={{ marginRight: 6 }} />เพิ่มทีละคน
        </button>
        <button className={`tab-btn${tab === 1 ? ' active' : ''}`} onClick={() => setTab(1)}>
          <i className="bi bi-people-fill" style={{ marginRight: 6 }} />เพิ่มหลายคน
        </button>
      </div>
      {tab === 0 && <SingleTab onSuccess={onSuccess} user={user} />}
      {tab === 1 && <BatchTab  onSuccess={onSuccess} user={user} />}
    </div>
  );
}
