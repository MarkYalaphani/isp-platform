'use client';

import { useState, useRef, useEffect } from 'react';
import { Athlete, User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { callAI } from '@/lib/aiClient';
import AthleteSearchSelect from '../AthleteSearchSelect';

interface Props { athletes: Athlete[]; user: User; }
interface Message { role: 'user' | 'assistant'; content: string; ts: number; }

const QUICK_QUESTIONS = [
  'จุดแข็งและจุดอ่อนหลักของนักกีฬาคนนี้คืออะไร?',
  'ควร focus ฝึกด้านไหนในช่วง 3 เดือนข้างหน้า?',
  'ฟิตพอสำหรับการแข่งขันสัปดาห์นี้ไหม?',
  'แนวโน้มพัฒนาการช่วงนี้เป็นอย่างไร?',
  'เหมาะกับตำแหน่งไหนมากที่สุด?',
  'มีสัญญาณเตือนอะไรที่โค้ชต้องระวังไหม?',
];

function renderMarkdown(text: string) {
  return text
    .replace(/^## (.+)$/gm, '<div style="font-weight:800;font-size:0.95rem;color:#38bdf8;margin:14px 0 6px">$1</div>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:0.85rem;margin:10px 0 4px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:14px;margin:3px 0">• $1</div>')
    .replace(/\n\n/g, '<div style="margin:6px 0"/>')
    .replace(/\n/g, '<br/>');
}

export default function AIChatPage({ athletes, user }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [playerData, setPlayerData] = useState<Record<string, unknown> | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const athlete = athletes.find(a => a.PlayerID === selectedId);

  // Load full player data when athlete selected
  useEffect(() => {
    if (!selectedId) { setPlayerData(null); setMessages([]); return; }
    setLoadingData(true);
    setMessages([]);
    Promise.all([
      callGAS('getIRHistory',         { playerId: selectedId }).catch(() => []),
      callGAS('getSkillAssessments',  { playerId: selectedId }).catch(() => []),
      callGAS('getAttendanceByPlayer',{ playerId: selectedId }).catch(() => []),
      callGAS('getWellnessByPlayer',  { playerId: selectedId, limit: 20 }).catch(() => []),
      callGAS('getRPEByPlayer',       { playerId: selectedId, limit: 20 }).catch(() => []),
      callGAS('getMatchStatsByPlayer',{ playerId: selectedId }).catch(() => []),
    ]).then(([ir, skills, attend, wellness, rpe, matches]) => {
      const a = athletes.find(x => x.PlayerID === selectedId);
      setPlayerData({
        name: a?.Name, nickname: a?.Nickname, team: a?.Team, position: a?.Position,
        dob: a?.DOB, domFoot: a?.DomFoot, domHand: a?.DomHand,
        latestTest: a?.Latest,
        testHistory: a?.History?.slice(-5),
        irHistory: Array.isArray(ir) ? (ir as unknown[]).slice(0, 3) : [],
        latestSkill: Array.isArray(skills) ? (skills as unknown[])[0] : null,
        attendanceSummary: (() => {
          const arr = Array.isArray(attend) ? attend as { status: string }[] : [];
          const present = arr.filter(r => r.status === 'present').length;
          const total = arr.length;
          return { total, present, rate: total ? Math.round(present / total * 100) : null };
        })(),
        wellnessLast5: Array.isArray(wellness) ? (wellness as unknown[]).slice(0, 5) : [],
        rpeLast5: Array.isArray(rpe) ? (rpe as unknown[]).slice(0, 5) : [],
        matchStats: Array.isArray(matches) ? (matches as unknown[]).slice(0, 10) : [],
      });
    }).finally(() => setLoadingData(false));
  }, [selectedId, athletes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || !playerData || loading) return;
    const userMsg: Message = { role: 'user', content: question, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await callAI('chat', {
        playerData,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        question,
      }) as { answer?: string; error?: string };
      if (res.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.answer!, ts: Date.now() }]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes('401') ? '🔐 Session หมดอายุ กรุณา login ใหม่'
        : msg.includes('503') ? '⚙️ GROQ_API_KEY ยังไม่ได้ตั้งค่า (ดู Vercel → Settings → Environment Variables)'
        : `❌ ไม่สามารถเชื่อมต่อ AI ได้: ${msg}`;
      setMessages(prev => [...prev, { role: 'assistant', content: friendly, ts: Date.now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 0 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="page-title">
            <i className="bi bi-robot me-2" style={{ color: '#38bdf8' }}/>AI Scout
          </h2>
          <p className="page-subtitle">ถามคำถามเกี่ยวกับนักกีฬาได้เลย — AI วิเคราะห์จากข้อมูลจริงทั้งหมด</p>
        </div>
      </div>

      {/* Athlete selector */}
      <div className="surface" style={{ marginBottom: 12, padding: '14px 16px' }}>
        <label className="form-label" style={{ marginBottom: 8 }}>
          <i className="bi bi-person-badge me-2" style={{ color: '#38bdf8' }}/>เลือกนักกีฬาที่ต้องการวิเคราะห์
        </label>
        <AthleteSearchSelect athletes={athletes} value={selectedId} onChange={setSelectedId} placeholder="— เลือกนักกีฬา —"/>
        {loadingData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#94a3b8', fontSize: '0.8rem' }}>
            <span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2 }}/>
            กำลังโหลดข้อมูลนักกีฬา...
          </div>
        )}
        {athlete && playerData && !loadingData && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { icon: 'bi-clipboard-data', label: `${(athlete.History?.length || 0)} test records` },
              { icon: 'bi-heart-pulse',    label: (playerData.attendanceSummary as { rate: number | null })?.rate != null ? `Attendance ${(playerData.attendanceSummary as { rate: number }).rate}%` : 'ไม่มี attendance' },
              { icon: 'bi-bullseye',       label: playerData.latestSkill ? 'มีข้อมูล Skill' : 'ไม่มี Skill' },
              { icon: 'bi-trophy',         label: `${((playerData.matchStats as unknown[]) || []).length} match stats` },
            ].map(b => (
              <span key={b.label} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`bi ${b.icon}`}/>{b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="surface" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 0 }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {!selectedId && (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <i className="bi bi-robot" style={{ fontSize: '3rem', display: 'block', marginBottom: 12, color: '#cbd5e1' }}/>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>เลือกนักกีฬาก่อนเริ่มสนทนา</div>
              <div style={{ fontSize: '0.82rem' }}>AI จะวิเคราะห์ข้อมูลทั้งหมดของนักกีฬาคนนั้น</div>
            </div>
          )}

          {selectedId && !loadingData && messages.length === 0 && playerData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.6rem' }}>🤖</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>สวัสดีครับ! ผมคือ AI Scout</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>โหลดข้อมูลของ <strong>{athlete?.Name}</strong> เรียบร้อยแล้ว — ถามอะไรก็ได้เลย</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    style={{ textAlign: 'left', padding: '10px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'inherit', transition: 'all 0.15s', lineHeight: 1.4 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#38bdf8'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.06)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'; }}>
                    <i className="bi bi-lightbulb me-2" style={{ color: '#f59e0b' }}/>{q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
              {m.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>🤖</div>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>AI Scout</span>
                </div>
              )}
              <div style={{
                maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: m.role === 'user' ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : 'var(--bg)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                color: m.role === 'user' ? 'white' : 'var(--text-main)',
                fontSize: '0.85rem', lineHeight: 1.6,
              }}
                dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? renderMarkdown(m.content) : m.content }}
              />
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>🤖</div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={selectedId && playerData ? `ถามเกี่ยวกับ ${athlete?.Name}... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)` : 'เลือกนักกีฬาก่อน...'}
            disabled={!selectedId || !playerData || loading}
            rows={1}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.88rem', fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 42, maxHeight: 120, overflowY: 'auto', lineHeight: 1.5 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || !playerData || loading}
            style={{ width: 42, height: 42, borderRadius: 10, background: input.trim() && playerData && !loading ? 'linear-gradient(135deg,#38bdf8,#818cf8)' : '#e2e8f0', border: 'none', cursor: input.trim() && playerData && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
          >
            <i className="bi bi-send-fill" style={{ color: input.trim() && playerData && !loading ? 'white' : '#94a3b8', fontSize: '1rem' }}/>
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
