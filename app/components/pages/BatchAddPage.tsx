'use client';
import { useState } from 'react';
import { User, Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { onSuccess: () => void; user: User; athletes: Athlete[]; }

const POSITIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const TODAY = new Date().toISOString().split('T')[0];

type Row = { name: string; nickname: string; dob: string; team: string; position: string; club: string; province: string; domFoot: string; };
const blankRow = (): Row => ({ name: '', nickname: '', dob: '', team: '', position: 'Forward', club: '', province: '', domFoot: 'Right' });

export default function BatchAddPage({ onSuccess, user, athletes }: Props) {
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

    // Check duplicates within form
    const names = valid.map(r => r.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) { showToast('มีชื่อซ้ำกันในฟอร์ม', 'error'); return; }

    setSaving(true);
    setResults([]);
    const res: { name: string; ok: boolean; msg: string }[] = [];
    for (const row of valid) {
      try {
        const r = await callGAS('saveAthlete', {
          ...row,
          clubId: user.role !== 'admin' ? (user.clubId || '') : '',
          photoBase64: '', photoMimeType: '',
        }) as { status: string; message: string };
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
      <div className="page-header">
        <div>
          <h2 className="page-title">เพิ่มนักกีฬาหลายคน</h2>
          <p className="page-subtitle">กรอกข้อมูลได้หลายแถวพร้อมกัน · บันทึกทีเดียวทั้งหมด</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={addRow}><i className="bi bi-plus-circle me-1" />เพิ่มแถว</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> กำลังบันทึก...</> : <><i className="bi bi-floppy me-1" />บันทึกทั้งหมด ({rows.filter(r => r.name.trim()).length} คน)</>}
          </button>
        </div>
      </div>

      {/* Results */}
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

      {/* Table */}
      <div className="surface" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['#', 'ชื่อ-นามสกุล *', 'ชื่อเล่น', 'วันเกิด', 'รุ่นอายุ', 'ตำแหน่ง', 'สโมสร/รร.', 'เท้าถนัด', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const hasResult = results.find(r => r.name === row.name);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: hasResult ? (hasResult.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)') : 'transparent' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 700, width: 32 }}>{i + 1}</td>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="form-control" style={{ minWidth: 160 }} value={row.name} placeholder="ชื่อ-นามสกุล" onChange={e => setCell(i, 'name', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="form-control" style={{ minWidth: 100 }} value={row.nickname} placeholder="ชื่อเล่น" onChange={e => setCell(i, 'nickname', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input type="date" className="form-control" style={{ minWidth: 140 }} value={row.dob} max={TODAY} onChange={e => setCell(i, 'dob', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <select className="form-select" style={{ minWidth: 90 }} value={row.team} onChange={e => setCell(i, 'team', e.target.value)}>
                      <option value="">-</option>
                      {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <select className="form-select" style={{ minWidth: 110 }} value={row.position} onChange={e => setCell(i, 'position', e.target.value)}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input className="form-control" style={{ minWidth: 120 }} value={row.club} placeholder="สโมสร / โรงเรียน" onChange={e => setCell(i, 'club', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <select className="form-select" style={{ minWidth: 80 }} value={row.domFoot} onChange={e => setCell(i, 'domFoot', e.target.value)}>
                      <option>Right</option><option>Left</option><option>Both</option>
                    </select>
                  </td>
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
