'use client';

import { useMemo, useState } from 'react';
import { TacticsSession, loadAllSessions, deleteSession, renameSession } from '@/lib/tactics';

interface OpenProps {
  mode: 'open';
  onClose: () => void;
  onOpen: (session: TacticsSession) => void;
}
interface SaveAsProps {
  mode: 'saveAs';
  onClose: () => void;
  onSaveAs: (name: string, folder: string) => void;
  currentName: string;
  currentFolder: string;
}
type Props = OpenProps | SaveAsProps;

export default function TacticsLibraryModal(props: Props) {
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState(props.mode === 'saveAs' ? props.currentName : '');
  const [folder, setFolder] = useState(props.mode === 'saveAs' ? props.currentFolder : '');

  const sessions = useMemo(() => {
    void refreshKey;
    const all = loadAllSessions().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(s => s.name.toLowerCase().includes(q) || s.folder.toLowerCase().includes(q));
  }, [search, refreshKey]);

  const handleDelete = (id: string, sessName: string) => {
    if (!confirm(`ลบเซสชัน "${sessName}" ใช่หรือไม่?`)) return;
    deleteSession(id);
    setRefreshKey(k => k + 1);
  };

  const handleRename = (id: string, oldName: string) => {
    const next = prompt('ตั้งชื่อใหม่', oldName);
    if (next && next.trim()) { renameSession(id, next.trim()); setRefreshKey(k => k + 1); }
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && props.onClose()}>
      <div className="modal-content" style={{ maxWidth: props.mode === 'saveAs' ? 420 : 780 }}>
        <button className="modal-close" onClick={props.onClose}><i className="bi bi-x" /></button>

        {props.mode === 'saveAs' ? (
          <>
            <h5 style={{ fontWeight: 800, marginBottom: 20 }}><i className="bi bi-floppy me-2" />บันทึกเซสชันเป็น...</h5>
            <div className="mb-3">
              <label className="form-label">ชื่อเซสชัน</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="เช่น 2 Ball Routine - 3" autoFocus />
            </div>
            <div className="mb-4">
              <label className="form-label">โฟลเดอร์ <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(ไม่บังคับ)</span></label>
              <input className="form-control" value={folder} onChange={e => setFolder(e.target.value)} placeholder="เช่น Passing, Warm-ups" list="tb-folders" />
              <datalist id="tb-folders">
                {[...new Set(loadAllSessions().map(s => s.folder).filter(Boolean))].map(f => <option key={f} value={f} />)}
              </datalist>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={props.onClose}>ยกเลิก</button>
              <button className="btn-primary" disabled={!name.trim()} onClick={() => name.trim() && props.onSaveAs(name.trim(), folder.trim())}>
                <i className="bi bi-check-lg me-1" />บันทึก
              </button>
            </div>
          </>
        ) : (
          <>
            <h5 style={{ fontWeight: 800, marginBottom: 16 }}><i className="bi bi-folder2-open me-2" />เปิดเซสชันที่บันทึกไว้</h5>
            <div className="search-wrap" style={{ position: 'relative', marginBottom: 16 }}>
              <i className="bi bi-search" />
              <input className="form-control" style={{ paddingLeft: 34 }} placeholder="ค้นหาชื่อเซสชันหรือโฟลเดอร์..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                ยังไม่มีเซสชันที่บันทึกไว้
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, maxHeight: '55vh', overflowY: 'auto' }}>
                {sessions.map(s => (
                  <div key={s.id}
                    onClick={() => props.onOpen(s)}
                    style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'var(--bg)', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#38bdf8')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ height: 74, background: 'linear-gradient(135deg,#2f9e44,#37b24d)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <i className="bi bi-diagram-3-fill" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.8rem' }} />
                      {s.frames.length > 1 && (
                        <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>{s.frames.length} เฟรม</span>
                      )}
                    </div>
                    <div style={{ padding: '9px 10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      {s.folder && <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, marginTop: 1 }}><i className="bi bi-folder-fill me-1" />{s.folder}</div>}
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3 }}>{new Date(s.updatedAt).toLocaleDateString('th-TH')}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button title="เปลี่ยนชื่อ" onClick={e => { e.stopPropagation(); handleRename(s.id, s.name); }}
                          style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 0', cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <i className="bi bi-pencil" style={{ fontSize: '0.68rem' }} />
                        </button>
                        <button title="ลบ" onClick={e => { e.stopPropagation(); handleDelete(s.id, s.name); }}
                          style={{ flex: 1, background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '4px 0', cursor: 'pointer', color: '#ef4444' }}>
                          <i className="bi bi-trash" style={{ fontSize: '0.68rem' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
