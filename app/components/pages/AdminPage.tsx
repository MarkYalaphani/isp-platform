'use client';

import { useState, useEffect } from 'react';
import { UserRecord } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { callDB } from '@/lib/db';
import { showToast } from '@/lib/toast';
import { parseClubPages, loadClubPagesLocal, saveClubPagesLocal } from '@/lib/clubSettings';

const PAGE_FEATURES = [
  /* Overview */
  { id: 'dashboard',   labelTH: 'Dashboard',             icon: 'bi-grid-1x2',              desc: 'ภาพรวม KPI · Ranking · H2H',      cat: 'overview' },
  /* Athletes */
  { id: 'roster',      labelTH: 'Roster',                icon: 'bi-people',                desc: 'รายชื่อนักกีฬา · ค้นหา · ตาราง', cat: 'athlete' },
  { id: 'scout',       labelTH: 'Scout Report',          icon: 'bi-person-badge',          desc: 'รายงานรายบุคคล + FC26 Card',       cat: 'athlete' },
  { id: 'skill',       labelTH: 'Skill Assessment',      icon: 'bi-bullseye',              desc: 'ประเมิน 27 ทักษะฟุตบอล',           cat: 'athlete' },
  { id: 'attendance',  labelTH: 'Attendance',            icon: 'bi-check2-square',         desc: 'เช็คชื่อซ้อม · สถิติการมา',       cat: 'athlete' },
  { id: 'wellness',    labelTH: 'Wellness & Load',       icon: 'bi-heart-pulse-fill',      desc: 'สภาพนักกีฬา + RPE ความหนัก',      cat: 'athlete' },
  { id: 'ir',          labelTH: 'IDP',                   icon: 'bi-clipboard2-check',      desc: 'แผนพัฒนารายบุคคล + QR Self-fill', cat: 'athlete' },
  /* Analysis */
  { id: 'compare',     labelTH: 'Compare',               icon: 'bi-intersect',             desc: 'Radar Chart เปรียบเทียบตัวต่อตัว', cat: 'analysis' },
  { id: 'lineup',      labelTH: 'Line-Up',               icon: 'bi-diagram-3',             desc: 'จัดทีม Formation · พิมพ์ PDF',    cat: 'analysis' },
  { id: 'teamreport',  labelTH: 'Team Report',           icon: 'bi-bar-chart-line',        desc: 'รายงานสถิติทีมรวม',               cat: 'analysis' },
  /* Data Entry */
  { id: 'performance', labelTH: 'Update Results',        icon: 'bi-clipboard-data',        desc: 'อัพเดทผลการทดสอบ',               cat: 'data' },
  { id: 'quicktest',   labelTH: 'Quick Test',            icon: 'bi-lightning',             desc: 'บันทึกผลทดสอบด่วน',              cat: 'data' },
  { id: 'register',    labelTH: 'Add Athlete',           icon: 'bi-person-plus',           desc: 'เพิ่มนักกีฬาใหม่',               cat: 'data' },
  /* Media */
  { id: 'training',    labelTH: 'Video Training',        icon: 'bi-play-btn',              desc: 'คลังวิดีโอฝึกซ้อม',              cat: 'media' },
];

const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  overview:  { label: 'Overview',    icon: 'bi-bar-chart-fill',   color: '#38bdf8' },
  athlete:   { label: 'Athletes',    icon: 'bi-people-fill',      color: '#34d399' },
  analysis:  { label: 'Analysis',    icon: 'bi-graph-up',         color: '#818cf8' },
  data:      { label: 'Data Entry',  icon: 'bi-pencil-square',    color: '#f59e0b' },
  media:     { label: 'Media',       icon: 'bi-play-btn-fill',    color: '#f87171' },
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  admin:    { label: 'Admin',    bg: '#fef3c7', color: '#92400e' },
  club_pro: { label: 'Club Pro', bg: '#ede9fe', color: '#5b21b6' },
  club:     { label: 'Club',     bg: '#eff6ff', color: '#1d4ed8' },
};

type EditForm = { username: string; newPassword: string; role: string; displayName: string };

export default function AdminPage() {
  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const genClubId = (base = '') => {
    const b = base.trim().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);
    const suffix = Math.random().toString(36).slice(2,5).toUpperCase();
    return b ? `${b}-${suffix}` : `CLUB-${suffix}${Math.random().toString(36).slice(2,4).toUpperCase()}`;
  };
  const [addForm, setAddForm] = useState(() => ({
    username:'', password:'', role:'club', displayName:'', clubId: genClubId(),
  }));
  const [saving, setSaving]             = useState(false);
  const [editModal, setEditModal]       = useState<EditForm|null>(null);
  const [editSaving, setEditSaving]     = useState(false);

  // Global Club settings
  const [clubPages, setClubPages]       = useState<string[]>([]);
  const [clubSaving, setClubSaving]     = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try { const d = await callGAS('getUsers') as UserRecord[]; setUsers(Array.isArray(d)?d:[]); }
    finally { setLoadingUsers(false); }
  };

  const ALL_IDS = PAGE_FEATURES.map(p => p.id);

  const loadClubSettings = async () => {
    // 1. Load localStorage immediately (no flicker)
    const local = loadClubPagesLocal(ALL_IDS);
    if (local) setClubPages(local);

    // 2. Load from DB (Supabase) — source of truth
    try {
      const d = await callDB<{ pages?: string }>('getClubSettings');
      const merged = parseClubPages(d.pages ?? null, ALL_IDS);
      setClubPages(merged);
      saveClubPagesLocal(merged);
    } catch {
      if (!local) setClubPages(ALL_IDS);
    }
  };

  useEffect(() => { loadUsers(); loadClubSettings(); }, []);

  const handleSaveClubSettings = async () => {
    saveClubPagesLocal(clubPages); // localStorage ก่อน
    setClubSaving(true);
    try {
      const res = await callDB<{ status: string }>('saveClubSettings', { pages: clubPages.join(',') });
      if (res.status === 'success') {
        showToast(`บันทึกสิทธิ์เรียบร้อย (${clubPages.length}/${ALL_IDS.length} ฟีเจอร์)`, 'success');
      } else {
        showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
      }
    } catch (e: unknown) {
      showToast(`บันทึกไม่สำเร็จ: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally { setClubSaving(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username.trim() || !addForm.password.trim()) { showToast('Username และ Password จำเป็น', 'error'); return; }
    if (users.some(u => u.Username.toLowerCase() === addForm.username.trim().toLowerCase())) {
      showToast(`Username "${addForm.username}" มีอยู่แล้ว`, 'error'); return;
    }
    if (addForm.clubId && users.some(u => u.ClubID && u.ClubID === addForm.clubId.trim())) {
      showToast(`Club ID "${addForm.clubId}" ถูกใช้แล้ว — กด Generate ใหม่`, 'error'); return;
    }
    setSaving(true);
    try {
      const res = await callGAS('saveUser', addForm) as { status:string; message:string };
      if (res.status === 'success') {
        showToast(res.message, 'success');
        setAddForm({ username:'', password:'', role:'club', displayName:'', clubId: genClubId() });
        loadUsers();
      } else showToast(res.message, 'error');
    } finally { setSaving(false); }
  };

  const openEdit = (u: UserRecord) =>
    setEditModal({ username:u.Username, newPassword:'', role:u.Role||'club', displayName:u.DisplayName||'' });

  const handleEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      const res = await callGAS('updateUser', editModal) as { status:string; message:string };
      if (res.status === 'success') {
        showToast('บันทึกเรียบร้อย', 'success');
        loadUsers();
        setTimeout(() => setEditModal(null), 700);
      } else showToast(res.message||'เกิดข้อผิดพลาด', 'error');
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`ลบบัญชี "${username}" ใช่หรือไม่?`)) return;
    await callGAS('deleteUser', { username });
    loadUsers();
  };

  const togglePage = (id: string) =>
    setClubPages(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev, id]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">จัดการระบบ</h2>
          <p className="page-subtitle">จัดการบัญชีและสิทธิ์การใช้งานสำหรับ Club ทั้งหมด</p>
        </div>
        <button className="btn-outline btn-sm" onClick={loadUsers}><i className="bi bi-arrow-clockwise me-1"/>รีเฟรช</button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GLOBAL CLUB SETTINGS — applies to ALL Club users at once
      ════════════════════════════════════════════════════════════════ */}
      <div className="surface" style={{ marginBottom:28, border:'2px solid rgba(56,189,248,0.25)', borderRadius:16 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(56,189,248,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-toggles2" style={{ color:'#38bdf8', fontSize:'1.1rem' }}/>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:'1rem' }}>สิทธิ์ฟีเจอร์สำหรับ Club</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>เปิด/ปิดฟีเจอร์ที่นี่จะมีผลกับ <strong>ทุกบัญชี Club</strong> ทันที</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn-outline btn-sm" onClick={() => setClubPages(PAGE_FEATURES.map(p=>p.id))}>เปิดทั้งหมด</button>
              <button className="btn-outline btn-sm" onClick={() => setClubPages([])}>ปิดทั้งหมด</button>
            </div>
            <button
              className="btn-primary"
              onClick={handleSaveClubSettings}
              disabled={clubSaving}
              style={{ minWidth:110 }}
            >
              {clubSaving
                ? <><span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,margin:0 }}/> บันทึก...</>
                : <><i className="bi bi-floppy me-1"/>บันทึก</>}
            </button>
          </div>
        </div>

        {/* Toggle grid — grouped by category */}
        {Object.entries(CAT_META).map(([cat, meta]) => {
          const features = PAGE_FEATURES.filter(p => p.cat === cat);
          const catOn = features.filter(p => clubPages.includes(p.id)).length;
          return (
            <div key={cat} style={{ marginBottom:16 }}>
              {/* Category header */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:6, background: meta.color + '20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize:'0.72rem' }}/>
                </div>
                <span style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>{meta.label}</span>
                <span style={{ fontSize:'0.62rem', color: meta.color, fontWeight:700, marginLeft:2 }}>{catOn}/{features.length}</span>
                <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                <button
                  onClick={() => {
                    const allOn = features.every(p => clubPages.includes(p.id));
                    if (allOn) setClubPages(prev => prev.filter(id => !features.some(p => p.id === id)));
                    else setClubPages(prev => [...new Set([...prev, ...features.map(p => p.id)])]);
                  }}
                  style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'2px 8px', cursor:'pointer', whiteSpace:'nowrap' }}>
                  {features.every(p => clubPages.includes(p.id)) ? 'ปิดกลุ่ม' : 'เปิดกลุ่ม'}
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:8 }}>
                {features.map(p => {
                  const on = clubPages.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePage(p.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
                        borderRadius:11, cursor:'pointer', transition:'all 0.15s',
                        background: on ? meta.color + '0d' : 'var(--bg)',
                        border: `1.5px solid ${on ? meta.color + '55' : 'var(--border)'}`,
                      }}
                    >
                      <div style={{ position:'relative', width:36, height:20, borderRadius:10, background: on ? meta.color : '#cbd5e1', transition:'background 0.18s', flexShrink:0 }}>
                        <div style={{ position:'absolute', top:2, left: on ? 17 : 2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.18s', boxShadow:'0 1px 4px rgba(0,0,0,0.22)' }}/>
                      </div>
                      <i className={`bi ${p.icon}`} style={{ color: on ? meta.color : '#94a3b8', fontSize:'0.95rem', flexShrink:0, transition:'color 0.15s' }}/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'0.78rem', fontWeight:700, color: on ? 'var(--text-main)' : 'var(--text-muted)', lineHeight:1.2, transition:'color 0.15s' }}>{p.labelTH}</div>
                        <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop:8, fontSize:'0.72rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:10, display:'flex', alignItems:'center', gap:6 }}>
          <i className="bi bi-info-circle" style={{ color:'#38bdf8' }}/>
          เปิด {clubPages.length}/{PAGE_FEATURES.length} ฟีเจอร์ · Admin และ Club Pro ไม่ได้รับผลกระทบ — ใช้ได้ทุกฟีเจอร์เสมอ
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          USER ACCOUNTS
      ══════════════════════════════════════════════ */}
      <div className="row g-4">
        {/* Users table */}
        <div className="col-lg-8">
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <div className="section-hd" style={{ margin:0, border:'none', padding:0 }}>
                <i className="bi bi-people me-2"/>บัญชีทั้งหมด ({users.length})
              </div>
            </div>
            {loadingUsers ? (
              <div style={{ padding:40, textAlign:'center' }}><div className="spinner-ring"/></div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft:20 }}>Username</th>
                      <th>ชื่อที่แสดง</th>
                      <th>Role</th>
                      <th>Club ID</th>
                      <th>สร้างเมื่อ</th>
                      <th style={{ paddingRight:20 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>ไม่พบบัญชีผู้ใช้</td></tr>
                    )}
                    {users.map(u => {
                      const rc = ROLE_CONFIG[u.Role] || ROLE_CONFIG.club;
                      return (
                        <tr key={u.Username}>
                          <td style={{ paddingLeft:20, fontWeight:700 }}>{u.Username}</td>
                          <td style={{ fontSize:'0.85rem' }}>{u.DisplayName||'—'}</td>
                          <td>
                            <span style={{ background:rc.bg, color:rc.color, padding:'3px 10px', borderRadius:6, fontSize:'0.72rem', fontWeight:800 }}>
                              {rc.label}
                            </span>
                          </td>
                          <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{u.ClubID||'—'}</td>
                          <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{u.CreatedAt?.split('T')[0]||'—'}</td>
                          <td style={{ paddingRight:20 }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn-outline btn-sm" onClick={() => openEdit(u)} title="แก้ไข">
                                <i className="bi bi-pencil-square"/>
                              </button>
                              {u.Role !== 'admin' && (
                                <button className="btn-danger btn-sm" onClick={() => handleDelete(u.Username)} title="ลบ">
                                  <i className="bi bi-trash"/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add user */}
        <div className="col-lg-4">
          <div className="surface">
            <div className="section-hd"><i className="bi bi-person-plus me-2"/>สร้างบัญชีใหม่</div>
            <form onSubmit={handleAdd}>
              <div className="mb-3">
                <label className="form-label">Username *</label>
                <input className="form-control" value={addForm.username}
                  onChange={e => {
                    const val = e.target.value;
                    setAddForm(f => ({
                      ...f,
                      username: val,
                      // Auto-update Club ID only if user hasn't manually edited it
                      clubId: val.trim() ? genClubId(val) : genClubId(),
                    }));
                  }}
                  placeholder="ตัวอักษรและตัวเลขเท่านั้น"/>
              </div>
              <div className="mb-3">
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" value={addForm.password} onChange={e=>setAddForm(f=>({...f,password:e.target.value}))} placeholder="รหัสผ่านชั่วคราว"/>
              </div>
              <div className="mb-3">
                <label className="form-label">ชื่อที่แสดง</label>
                <input className="form-control" value={addForm.displayName} onChange={e=>setAddForm(f=>({...f,displayName:e.target.value}))} placeholder="ชื่อสโมสร หรือชื่อผู้ใช้"/>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Club ID <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:400, letterSpacing:0 }}>(สร้างอัตโนมัติ)</span></span>
                  <button type="button" onClick={() => setAddForm(f=>({...f, clubId: genClubId(f.username)}))}
                    style={{ background:'none', border:'none', color:'#38bdf8', cursor:'pointer', fontSize:'0.72rem', fontWeight:700, padding:'0 2px', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="bi bi-arrow-clockwise"/>สร้างใหม่
                  </button>
                </label>
                <div style={{ position:'relative' }}>
                  <input className="form-control" value={addForm.clubId}
                    onChange={e=>setAddForm(f=>({...f,clubId:e.target.value}))}
                    placeholder="Club ID"
                    style={{ fontFamily:'monospace', fontWeight:700, letterSpacing:1, paddingRight:36 }}
                    list="existing-club-ids"
                  />
                  <i className="bi bi-upc-scan" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'0.85rem', pointerEvents:'none' }}/>
                </div>
                {/* Suggest existing Club IDs */}
                <datalist id="existing-club-ids">
                  {[...new Set(users.map(u=>u.ClubID).filter(Boolean))].map(id=>(
                    <option key={id} value={id}/>
                  ))}
                </datalist>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:4 }}>
                  ใช้กรองนักกีฬาในสโมสร — แก้ไขได้ตามต้องการ
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label">Role</label>
                <select className="form-select" value={addForm.role} onChange={e=>setAddForm(f=>({...f,role:e.target.value}))}>
                  <option value="club">Club — ใช้ตามสิทธิ์ที่ตั้งไว้ด้านบน</option>
                  <option value="club_pro">Club Pro — ใช้ได้ทุกฟีเจอร์</option>
                  <option value="admin">Admin — ทุกฟีเจอร์ + จัดการระบบ</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-100" disabled={saving} style={{ justifyContent:'center' }}>
                {saving ? <><span className="spinner-ring" style={{ width:18,height:18,borderWidth:2,margin:0 }}/> กำลังสร้าง...</> : <><i className="bi bi-plus-lg me-1"/>สร้างบัญชี</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModal && (
        <div className="modal-overlay open" onClick={e=>e.target===e.currentTarget&&setEditModal(null)}>
          <div className="modal-content" style={{ maxWidth:420 }}>
            <button className="modal-close" onClick={()=>setEditModal(null)}><i className="bi bi-x"/></button>
            <h5 style={{ fontWeight:800, marginBottom:4 }}>แก้ไขบัญชี</h5>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:20 }}>
              <i className="bi bi-person-fill me-1"/><strong>{editModal.username}</strong>
            </p>
            <div className="mb-3">
              <label className="form-label">ชื่อที่แสดง</label>
              <input className="form-control" value={editModal.displayName} onChange={e=>setEditModal(m=>m?{...m,displayName:e.target.value}:null)} placeholder="ชื่อสโมสร หรือชื่อผู้ใช้"/>
            </div>
            <div className="mb-3">
              <label className="form-label">
                เปลี่ยน Password
                <span style={{ color:'var(--text-muted)', fontWeight:400, marginLeft:6 }}>(เว้นว่าง = ไม่เปลี่ยน)</span>
              </label>
              <input type="password" className="form-control" value={editModal.newPassword} onChange={e=>setEditModal(m=>m?{...m,newPassword:e.target.value}:null)} placeholder="รหัสผ่านใหม่..."/>
            </div>
            <div className="mb-4">
              <label className="form-label">Role</label>
              <select className="form-select" value={editModal.role} onChange={e=>setEditModal(m=>m?{...m,role:e.target.value}:null)}>
                <option value="club">Club — ใช้ตามสิทธิ์ที่ตั้งไว้</option>
                <option value="club_pro">Club Pro — ทุกฟีเจอร์</option>
                <option value="admin">Admin — ทุกฟีเจอร์ + จัดการระบบ</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn-outline" onClick={()=>setEditModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleEdit} disabled={editSaving}>
                {editSaving ? <><span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,margin:0 }}/> บันทึก...</> : <><i className="bi bi-check-lg me-1"/>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
