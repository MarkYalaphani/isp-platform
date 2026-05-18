'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Athlete, Page, User } from '@/lib/types';
import { getScorePoint } from '@/lib/score';
import { VIDEO_DB, DEV_DATA, VideoItem } from '@/lib/devData';
import { callGAS } from '@/lib/api';

interface Props {
  athletes: Athlete[];
  onNavigate: (page: Page, id?: string) => void;
  user: User;
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  speed30:  { icon: 'bi-lightning-charge-fill', color: '#f59e0b' },
  cmj:      { icon: 'bi-arrow-up-circle-fill',  color: '#f472b6' },
  agility:  { icon: 'bi-shuffle',               color: '#34d399' },
  situp:    { icon: 'bi-person-arms-up',         color: '#38bdf8' },
  longjump: { icon: 'bi-box-arrow-right',        color: '#a78bfa' },
  yoyo:     { icon: 'bi-heart-pulse-fill',       color: '#ef4444' },
  pushup:   { icon: 'bi-bar-chart-fill',         color: '#fb923c' },
  sitreach: { icon: 'bi-activity',               color: '#6ee7b7' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

const METRIC_KEYS = [
  { key: 'speed30',  field: 'Speed30'     as keyof Athlete['Latest'] },
  { key: 'cmj',      field: 'CMJ'         as keyof Athlete['Latest'] },
  { key: 'agility',  field: 'Agility'     as keyof Athlete['Latest'] },
  { key: 'situp',    field: 'Situp'       as keyof Athlete['Latest'] },
  { key: 'longjump', field: 'LongJump'    as keyof Athlete['Latest'] },
  { key: 'yoyo',     field: 'YoYo'        as keyof Athlete['Latest'] },
  { key: 'pushup',   field: 'Pushup'      as keyof Athlete['Latest'] },
  { key: 'sitreach', field: 'SitAndReach' as keyof Athlete['Latest'] },
];

/* ─── Helpers ────────────────────────────────────────────── */
function extractYouTubeId(input: string): string {
  const s = input.trim();
  const m = s.match(/(?:shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,12}$/.test(s)) return s;
  return s;
}

/* ─── Video Card ─────────────────────────────────────────── */
function VideoCard({ video, isWeak }: { video: VideoItem; isWeak?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const cat  = DEV_DATA[video.category];
  const meta = CATEGORY_META[video.category] || { icon: 'bi-play-circle', color: '#38bdf8' };
  const thumb = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;

  return (
    <div
      style={{
        background: 'var(--surface)', border: `1.5px solid ${isWeak ? '#fca5a5' : 'var(--border)'}`,
        borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: isWeak ? '0 0 0 2px #fca5a540' : 'none',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = isWeak ? '0 0 0 2px #fca5a540' : 'none'; }}
    >
      <div style={{ position: 'relative', paddingBottom: '177.78%', background: '#0f172a', flexShrink: 0 }}>
        {playing ? (
          <iframe
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} onClick={() => setPlaying(true)}>
            <img src={thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <i className="bi bi-play-fill" style={{ fontSize: '1.4rem', color: '#1e293b', marginLeft: 3 }} />
              </div>
            </div>
            <div style={{ position: 'absolute', top: 8, right: 8, background: '#ff0000', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: '0.62rem', fontWeight: 800 }}>SHORTS</div>
            {isWeak && <div style={{ position: 'absolute', top: 8, left: 8, background: '#dc2626', color: 'white', borderRadius: 4, padding: '2px 7px', fontSize: '0.62rem', fontWeight: 800 }}>แนะนำ</div>}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '0.72rem' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {cat?.label || video.category}
          </span>
          {video.vol && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>Vol.{video.vol}</span>}
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>{video.title}</div>
      </div>
    </div>
  );
}

/* ─── Edit Modal ─────────────────────────────────────────── */
function VideoFormModal({
  initial, onClose, onSaved,
}: {
  initial: Partial<VideoItem> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [url,      setUrl]      = useState(initial?.id    || '');
  const [title,    setTitle]    = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || 'speed30');
  const [vol,      setVol]      = useState(initial?.vol ?? 1);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const videoId = extractYouTubeId(url);
  const thumb   = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  const isEdit  = !!initial?.dbId;

  const handleSave = async () => {
    if (!videoId || !title || !category) return setMsg('กรุณากรอกข้อมูลให้ครบ');
    setSaving(true); setMsg('');
    try {
      const res = await callGAS('saveTrainingVideo', {
        video: { dbId: initial?.dbId, id: videoId, title, category, vol },
      }) as { status: string };
      if (res.status === 'success') { onSaved(); onClose(); }
      else setMsg('บันทึกไม่สำเร็จ');
    } catch (e: unknown) { setMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>
            <i className={`bi ${isEdit ? 'bi-pencil-fill' : 'bi-plus-circle-fill'} me-2`} style={{ color: '#38bdf8' }} />
            {isEdit ? 'แก้ไขวิดีโอ' : 'เพิ่มวิดีโอใหม่'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Thumbnail preview */}
        {thumb && (
          <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', height: 120, background: '#0f172a', position: 'relative' }}>
            <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <i className="bi bi-youtube" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="form-label">YouTube URL หรือ Video ID</label>
            <input className="form-control" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/shorts/... หรือ ID เช่น oewPLz5b9uY" />
            {url && <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: 3 }}>ID: <strong>{videoId}</strong></div>}
          </div>
          <div>
            <label className="form-label">ชื่อวิดีโอ</label>
            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="ชื่อที่แสดงใต้วิดีโอ" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">หมวดหมู่</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{DEV_DATA[c]?.label || c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Vol.</label>
              <input type="number" className="form-control" value={vol} min={1} max={99}
                onChange={e => setVol(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {msg && <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.8rem' }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? <><span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} /> บันทึก...</> : <><i className="bi bi-floppy me-1" />บันทึก</>}
          </button>
          <button className="btn-outline" onClick={onClose} style={{ flex: 1 }}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Video Manager ────────────────────────────────── */
function VideoManager({ videos, onReload }: { videos: VideoItem[]; onReload: () => void }) {
  const [editTarget, setEditTarget] = useState<Partial<VideoItem> | null | false>(false); // false=closed
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding]       = useState(false);
  const [filterCat, setFilterCat]   = useState('ALL');
  const [msg, setMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = async (v: VideoItem) => {
    if (!v.dbId) return;
    if (!confirm(`ลบ "${v.title}"?`)) return;
    setDeletingId(v.dbId);
    try {
      await callGAS('deleteTrainingVideo', { dbId: v.dbId });
      onReload();
    } catch { setMsg({ type: 'error', text: 'ลบไม่สำเร็จ' }); }
    finally { setDeletingId(null); }
  };

  const handleSeed = async () => {
    setSeeding(true); setMsg(null);
    try {
      const res = await callGAS('seedTrainingVideos', { videos: VIDEO_DB.map(v => ({ id: v.id, title: v.title, category: v.category, vol: v.vol ?? 1 })) }) as { status: string; message: string };
      setMsg({ type: res.status === 'success' ? 'success' : 'error', text: res.message || 'เสร็จแล้ว' });
      onReload();
    } catch (e: unknown) { setMsg({ type: 'error', text: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }); }
    finally { setSeeding(false); }
  };

  const filtered = filterCat === 'ALL' ? videos : videos.filter(v => v.category === filterCat);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={() => setEditTarget(null)} style={{ whiteSpace: 'nowrap' }}>
          <i className="bi bi-plus-lg me-1" />เพิ่มวิดีโอ
        </button>
        {videos.length === 0 && (
          <button className="btn-outline" onClick={handleSeed} disabled={seeding} style={{ whiteSpace: 'nowrap' }}>
            {seeding ? <><span className="spinner-ring" style={{ width: 12, height: 12, borderWidth: 2, margin: 0 }} /> กำลัง seed...</> : <><i className="bi bi-cloud-download me-1" />ใช้ค่าเริ่มต้น</>}
          </button>
        )}
        <select className="form-select" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="ALL">ทุกหมวด ({videos.length})</option>
          {ALL_CATEGORIES.map(c => (
            <option key={c} value={c}>{DEV_DATA[c]?.label || c} ({videos.filter(v => v.category === c).length})</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filtered.length} รายการ
        </span>
      </div>

      {msg && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: msg.type === 'success' ? '#166534' : '#991b1b' }}>
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <i className="bi bi-camera-video-off" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 10, color: '#cbd5e1' }} />
            {videos.length === 0 ? 'ยังไม่มีวิดีโอ — กด "ใช้ค่าเริ่มต้น" เพื่อเพิ่มวิดีโอจาก devData' : 'ไม่พบวิดีโอในหมวดนี้'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>ชื่อวิดีโอ</th>
                  <th>หมวด</th>
                  <th style={{ textAlign: 'center' }}>Vol</th>
                  <th style={{ textAlign: 'center' }}>Video ID</th>
                  <th style={{ textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const meta = CATEGORY_META[v.category] || { icon: 'bi-play-circle', color: '#94a3b8' };
                  const isDeleting = deletingId === v.dbId;
                  return (
                    <tr key={v.dbId || v.id} style={{ opacity: isDeleting ? 0.4 : 1 }}>
                      {/* Thumbnail */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
                          <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem', maxWidth: 220 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: meta.color + '18', color: meta.color, borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                          <i className={`bi ${meta.icon}`} />{DEV_DATA[v.category]?.label || v.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{v.vol ?? 1}</td>
                      <td style={{ textAlign: 'center' }}>
                        <a href={`https://youtube.com/shorts/${v.id}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace', textDecoration: 'none' }}>
                          {v.id}
                          <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '0.6rem' }} />
                        </a>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                            onClick={() => setEditTarget(v)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer' }}
                            onClick={() => handleDelete(v)} disabled={isDeleting || !v.dbId}>
                            <i className="bi bi-trash" />
                          </button>
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

      {/* Modal */}
      {editTarget !== false && (
        <VideoFormModal
          initial={editTarget}
          onClose={() => setEditTarget(false)}
          onSaved={onReload}
        />
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function TrainingPage({ athletes, onNavigate, user }: Props) {
  const isAdmin = user.role === 'admin';

  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab]   = useState<'all' | string>('all');
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState<'library' | 'manage'>('library');

  // Videos: load from DB; fall back to devData if empty
  const [dbVideos, setDbVideos]   = useState<VideoItem[] | null>(null); // null = loading
  const [loadErr, setLoadErr]     = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      const data = await callGAS('getTrainingVideos') as VideoItem[];
      setDbVideos(Array.isArray(data) ? data : []);
    } catch { setLoadErr(true); setDbVideos([]); }
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const videos = useMemo(() =>
    (dbVideos && dbVideos.length > 0) ? dbVideos : VIDEO_DB,
    [dbVideos]
  );

  const selected = athletes.find(a => a.PlayerID === selectedId);

  const weakKeys = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      METRIC_KEYS
        .map(m => ({ key: m.key, score: getScorePoint(m.key, selected.Latest?.[m.field] as string || '', selected.DOB || '') }))
        .filter(m => m.score > 0 && m.score <= 3)
        .map(m => m.key)
    );
  }, [selected]);

  const recommendedVideos = useMemo(() => videos.filter(v => weakKeys.has(v.category)), [videos, weakKeys]);

  const categories = useMemo(() =>
    ALL_CATEGORIES.map(c => ({
      key: c, label: DEV_DATA[c]?.label || c,
      meta: CATEGORY_META[c],
      count: videos.filter(v => v.category === c).length,
    }))
  , [videos]);

  const filteredVideos = useMemo(() => {
    let list = activeTab === 'all' ? videos : videos.filter(v => v.category === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.title.toLowerCase().includes(q) || (DEV_DATA[v.category]?.label || '').toLowerCase().includes(q));
    }
    return list;
  }, [videos, activeTab, search]);

  const usingFallback = dbVideos !== null && dbVideos.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Video Training</h2>
          <p className="page-subtitle">
            คลิปฝึกซ้อม {videos.length} วิดีโอ · {ALL_CATEGORIES.length} หมวด · YouTube Shorts
            {usingFallback && <span style={{ marginLeft: 8, fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>(ค่าเริ่มต้น)</span>}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={view === 'manage' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setView(v => v === 'manage' ? 'library' : 'manage')}
            >
              <i className={`bi ${view === 'manage' ? 'bi-x-lg' : 'bi-gear-fill'} me-1`} />
              {view === 'manage' ? 'ปิด' : 'จัดการวิดีโอ'}
            </button>
          </div>
        )}
      </div>

      {/* ══════════ ADMIN MANAGE VIEW ══════════ */}
      {isAdmin && view === 'manage' && (
        <div className="surface" style={{ marginBottom: 20, borderTop: '3px solid #38bdf8' }}>
          <div className="section-hd" style={{ marginBottom: 16 }}>
            <i className="bi bi-gear-fill me-2" style={{ color: '#38bdf8' }} />จัดการวิดีโอทั้งหมด
            {dbVideos === null && <span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 8 }} />}
          </div>
          {loadErr && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, color: '#991b1b', fontSize: '0.82rem', marginBottom: 12 }}>
              ⚠️ โหลดวิดีโอจาก DB ไม่ได้ — ตรวจสอบ training_videos table ใน Supabase
            </div>
          )}
          <VideoManager videos={dbVideos ?? []} onReload={loadVideos} />
        </div>
      )}

      {/* ══════════ LIBRARY VIEW ══════════ */}
      {view === 'library' && (
        <>
          {/* Athlete selector */}
          <div className="surface" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <i className="bi bi-person-circle" style={{ color: '#38bdf8', fontSize: '1.1rem' }} />
            <select className="form-select" style={{ flex: 1, minWidth: 180, fontWeight: 600 }} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">— เลือกนักกีฬาเพื่อดูวิดีโอแนะนำ —</option>
              {athletes.map(a => <option key={a.PlayerID} value={a.PlayerID}>{a.Name} {a.Team ? `(${a.Team})` : ''}</option>)}
            </select>
            {selected && (
              <button className="btn-outline" style={{ whiteSpace: 'nowrap' }} onClick={() => onNavigate('scout', selected.PlayerID)}>
                <i className="bi bi-person-vcard me-1" />Scout Report
              </button>
            )}
          </div>

          {/* Recommended */}
          {selected && recommendedVideos.length > 0 && (
            <div className="surface" style={{ marginBottom: 24, borderTop: '3px solid #ef4444' }}>
              <div className="section-hd" style={{ color: '#ef4444', marginBottom: 16 }}>
                <i className="bi bi-exclamation-triangle-fill me-2" />วิดีโอแนะนำสำหรับ {selected.Name} — จุดอ่อนที่ต้องพัฒนา
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
                {recommendedVideos.map(v => <VideoCard key={v.dbId || v.id} video={v} isWeak />)}
              </div>
            </div>
          )}
          {selected && recommendedVideos.length === 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize: '1.1rem' }} />{selected.Name} ไม่มีจุดอ่อนเร่งด่วน
            </div>
          )}

          {/* Category tabs + search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              <button onClick={() => setActiveTab('all')} style={{ padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', background: activeTab === 'all' ? '#38bdf8' : 'var(--surface)', color: activeTab === 'all' ? 'white' : 'var(--text-muted)', border: `1.5px solid ${activeTab === 'all' ? '#38bdf8' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                <i className="bi bi-grid-fill me-1" />ทั้งหมด ({videos.length})
              </button>
              {categories.map(c => {
                const active = activeTab === c.key;
                return (
                  <button key={c.key} onClick={() => setActiveTab(c.key)} style={{ padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', background: active ? c.meta?.color || '#38bdf8' : 'var(--surface)', color: active ? 'white' : 'var(--text-muted)', border: `1.5px solid ${active ? c.meta?.color : 'var(--border)'}`, opacity: c.count === 0 && !active ? 0.5 : 1, transition: 'all 0.15s' }}>
                    <i className={`bi ${c.meta?.icon || 'bi-play-circle'} me-1`} />{c.label}
                    <span style={{ marginLeft: 5, fontSize: '0.65rem', fontWeight: 900, background: active ? 'rgba(255,255,255,0.25)' : c.count === 0 ? '#f1f5f9' : c.meta?.color + '22', color: active ? 'white' : c.count === 0 ? '#94a3b8' : c.meta?.color, borderRadius: 10, padding: '1px 6px' }}>{c.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="search-wrap" style={{ minWidth: 160 }}>
              <i className="bi bi-search" />
              <input className="form-control" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.8rem' }} />
            </div>
          </div>

          {/* Video grid */}
          {dbVideos === null ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner-ring" /></div>
          ) : filteredVideos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14, color: 'var(--text-muted)' }}>
              <i className="bi bi-camera-video-off" style={{ fontSize: '2.8rem', display: 'block', marginBottom: 12, color: '#cbd5e1' }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {activeTab === 'all' ? 'ไม่พบวิดีโอ' : `ยังไม่มีวิดีโอสำหรับหมวด "${DEV_DATA[activeTab]?.label || activeTab}"`}
              </div>
              {isAdmin && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>กด "จัดการวิดีโอ" เพื่อเพิ่ม</div>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
              {filteredVideos.map(v => <VideoCard key={v.dbId || v.id} video={v} isWeak={weakKeys.has(v.category)} />)}
            </div>
          )}

          {/* Stats footer */}
          <div style={{ marginTop: 28, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>วิดีโอทั้งหมดแยกตามหมวด</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {categories.map(c => (
                <div key={c.key} onClick={() => setActiveTab(c.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 10px', borderRadius: 8, background: c.count === 0 ? 'transparent' : c.meta?.color + '12', border: `1px solid ${c.count === 0 ? 'var(--border)' : c.meta?.color + '40'}`, opacity: c.count === 0 ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  <i className={`bi ${c.meta?.icon}`} style={{ color: c.meta?.color, fontSize: '0.78rem' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>{c.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: c.count === 0 ? '#94a3b8' : c.meta?.color }}>{c.count === 0 ? '—' : c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
