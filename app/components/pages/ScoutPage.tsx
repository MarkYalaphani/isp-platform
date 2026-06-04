'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { Athlete, TestRecord, IRReport, SkillAssessment, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import { DEV_DATA, VIDEO_DB } from '@/lib/devData';
import EditAthleteModal from '../EditAthleteModal';
import ReportBanner, { PrintHeader } from '../ReportBanner';
import ParentReport from '../ParentReport';
import AthleteSearchSelect from '../AthleteSearchSelect';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

interface Props {
  athletes: Athlete[];
  initialId: string;
  onNavigate: (page: Page, id?: string) => void;
  onRefresh: () => void;
  user: User;
}

type MetricDef = { key: string; field: keyof TestRecord; label: string; labelTH: string; unit: string; icon: string; color: string };

interface PlayerMatchPerf {
  id: string;
  matchId: string;
  playerId: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  notes: string;
  matchDate: string;
  opponent: string;
  teamName: string;
  matchType: string;
  scoreFor: number;
  scoreAgainst: number;
  result: string;
}

const METRICS: MetricDef[] = [
  { key: 'speed30',  field: 'Speed30',     label: 'Speed 30m',   labelTH: 'ความเร็ว 30 ม.',      unit: 's',    icon: 'bi-lightning-charge-fill', color: '#f472b6' },
  { key: 'cmj',      field: 'CMJ',         label: 'CMJ',         labelTH: 'กระโดดแนวตั้ง',       unit: 'cm',   icon: 'bi-arrow-up-circle-fill',  color: '#818cf8' },
  { key: 'agility',  field: 'Agility',     label: 'Agility',     labelTH: 'ความคล่องแคล่ว',      unit: 's',    icon: 'bi-arrow-repeat',          color: '#fb923c' },
  { key: 'situp',    field: 'Situp',       label: 'Sit-up',      labelTH: 'ลุก-นั่ง',            unit: 'reps', icon: 'bi-person-fill',           color: '#facc15' },
  { key: 'longjump', field: 'LongJump',    label: 'Long Jump',   labelTH: 'กระโดดไกล',           unit: 'cm',   icon: 'bi-dash-lg',               color: '#a3e635' },
  { key: 'yoyo',     field: 'YoYo',        label: 'Yo-Yo',       labelTH: 'โยโย่ / ความอดทน',    unit: 'm',    icon: 'bi-heart-pulse-fill',      color: '#f87171' },
  { key: 'pushup',   field: 'Pushup',      label: 'Push-up',     labelTH: 'วิดพื้น',             unit: 'reps', icon: 'bi-activity',              color: '#4ade80' },
  { key: 'sitreach', field: 'SitAndReach', label: 'Sit & Reach', labelTH: 'ความยืดหยุ่น',        unit: 'cm',   icon: 'bi-arrows-expand',         color: '#38bdf8' },
];

const HISTORY_CHARTS: { field: keyof TestRecord; label: string; labelTH: string; color: string }[] = [
  { field: 'Rating',      label: 'Overall Rating', labelTH: 'คะแนนรวม',        color: '#38bdf8' },
  { field: 'Speed30',     label: 'Speed 30m',      labelTH: 'ความเร็ว 30 ม.',   color: '#f472b6' },
  { field: 'Agility',     label: 'Agility',        labelTH: 'ความคล่องแคล่ว',   color: '#fb923c' },
  { field: 'CMJ',         label: 'CMJ',            labelTH: 'กระโดดแนวตั้ง',    color: '#818cf8' },
  { field: 'LongJump',    label: 'Long Jump',      labelTH: 'กระโดดไกล',        color: '#a3e635' },
  { field: 'YoYo',        label: 'Yo-Yo',          labelTH: 'โยโย่',             color: '#f87171' },
  { field: 'Pushup',      label: 'Push-up',        labelTH: 'วิดพื้น',           color: '#4ade80' },
  { field: 'Situp',       label: 'Sit-up',         labelTH: 'ลุก-นั่ง',          color: '#facc15' },
  { field: 'SitAndReach', label: 'Sit & Reach',    labelTH: 'ความยืดหยุ่น',     color: '#c084fc' },
];

const INFO_ITEMS: { key: string; label: string; labelTH: string; icon: string; color: string; suffix?: string }[] = [
  { key: 'height',   label: 'Height',    labelTH: 'ส่วนสูง',           icon: 'bi-arrows-vertical',    color: '#38bdf8', suffix: 'cm'  },
  { key: 'weight',   label: 'Weight',    labelTH: 'น้ำหนัก',           icon: 'bi-bag-fill',           color: '#818cf8', suffix: 'kg'  },
  { key: 'bmi',      label: 'BMI',       labelTH: 'ดัชนีมวลกาย',       icon: 'bi-calculator-fill',    color: '#fb923c'                },
  { key: 'fat',      label: 'Body Fat',  labelTH: 'ไขมันในร่างกาย',    icon: 'bi-droplet-fill',       color: '#f472b6', suffix: '%'   },
  { key: 'muscle',   label: 'Muscle',    labelTH: 'มวลกล้ามเนื้อ',     icon: 'bi-lightning-fill',     color: '#4ade80', suffix: '%'   },
  { key: 'vo2max',   label: 'VO₂ Max',   labelTH: 'ความสามารถใช้ O₂',  icon: 'bi-heart-pulse-fill',   color: '#f87171'                },
  { key: 'domfoot',  label: 'Dom. Foot', labelTH: 'เท้าถนัด',           icon: 'bi-geo-fill',           color: '#a3e635'                },
  { key: 'domhand',  label: 'Dom. Hand', labelTH: 'มือถนัด',            icon: 'bi-hand-index-fill',    color: '#facc15'                },
  { key: 'age',      label: 'Age',       labelTH: 'อายุ',               icon: 'bi-calendar3',          color: '#c084fc', suffix: 'yrs' },
  { key: 'province', label: 'Province',  labelTH: 'จังหวัด',            icon: 'bi-geo-alt-fill',       color: '#38bdf8'                },
];

function getGrade(r: number): { cls: string; label: string; labelTH: string; emoji: string } {
  if (r >= 80) return { cls: 'grade-exc',  label: 'Elite',   labelTH: 'ยอดเยี่ยม',  emoji: '🏆' };
  if (r >= 60) return { cls: 'grade-good', label: 'Good',    labelTH: 'ดี',          emoji: '⭐' };
  if (r >= 40) return { cls: 'grade-avg',  label: 'Average', labelTH: 'ปานกลาง',    emoji: '📈' };
  if (r >= 20) return { cls: 'grade-poor', label: 'Fair',    labelTH: 'พัฒนาได้',   emoji: '📊' };
  return              { cls: 'grade-poor', label: 'Poor',    labelTH: 'ต้องปรับปรุง',emoji: '📉' };
}

function calcAge(dob: string): number | null {
  if (!dob || dob === '-') return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / 31557600000);
  return age >= 0 && age <= 120 ? age : null;
}

function calcBMI(h: string, w: string): string {
  const hn = parseFloat(h), wn = parseFloat(w);
  if (!hn || !wn) return '—';
  return (wn / Math.pow(hn / 100, 2)).toFixed(1);
}

function fmtDate(ts: string, idx: number): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return `#${idx + 1}`;
    return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
  } catch { return `#${idx + 1}`; }
}

function fmtDateFull(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch { return '—'; }
}

const BADGES = [
  { id: 'rookie',    emoji: '🎯', label: 'First Test',     check: (h: number) => h >= 1 },
  { id: 'veteran',   emoji: '📅', label: 'Veteran (5+)',   check: (h: number) => h >= 5 },
  { id: 'elite',     emoji: '🏆', label: 'Elite',          check: (_h: number, r: number) => r >= 80 },
  { id: 'perfect',   emoji: '⭐', label: 'Perfect Score',  check: (_h: number, _r: number, sc: Record<string,number>) => Object.values(sc).some(s => s >= 5) },
  { id: 'allround',  emoji: '💪', label: 'All-Rounder',    check: (_h: number, _r: number, sc: Record<string,number>) => { const v = Object.values(sc).filter(s => s > 0); return v.length >= 6 && v.every(s => s >= 3); } },
  { id: 'improved',  emoji: '📈', label: 'Most Improved',  check: (h: number, _r: number, _sc: Record<string,number>, hist: Athlete['History']) => h >= 2 && Number(hist[hist.length-1]?.Rating) > Number(hist[0]?.Rating) },
  { id: 'speed',     emoji: '⚡', label: 'Speed Demon',    check: (_h: number, _r: number, sc: Record<string,number>) => sc['speed30'] >= 5 },
  { id: 'endurance', emoji: '❤️', label: 'Iron Lungs',     check: (_h: number, _r: number, sc: Record<string,number>) => sc['yoyo'] >= 5 },
];

function getTrend(data: (number | null)[]): { pct: number; up: boolean } | null {
  const valid = data.filter(v => v !== null) as number[];
  if (valid.length < 2) return null;
  const first = valid[0], last = valid[valid.length - 1];
  if (!first) return null;
  const pct = Math.round(((last - first) / first) * 100);
  return { pct: Math.abs(pct), up: last >= first };
}

const RADAR_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    r: {
      min: 0, max: 5,
      ticks: { stepSize: 1, font: { size: 9 }, backdropColor: 'transparent' },
      pointLabels: { font: { size: 10, weight: 600 as const }, color: '#475569' },
      grid: { color: 'rgba(0,0,0,0.06)' },
      angleLines: { color: 'rgba(0,0,0,0.06)' },
    },
  },
};

const LINE_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: false, ticks: { font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
    x: { ticks: { font: { size: 8 }, maxRotation: 30 }, grid: { display: false } },
  },
};

const SCORE_LINE_OPTS = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } },
    tooltip: {
      callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: (ctx: any) =>
          `${ctx.dataset.label ?? ''}: ${['','★ ต้องปรับ','พัฒนาได้','ปานกลาง','ดี','ยอดเยี่ยม'][ctx.raw] ?? ctx.raw}/5`,
      },
    },
  },
  scales: {
    y: {
      min: 0.5, max: 5.5, ticks: {
        stepSize: 1,
        callback: (v: number | string) => (['','Poor','Fair','Avg','Good','Elite'] as const)[Number(v)] ?? '',
        font: { size: 9 },
      },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    x: { ticks: { font: { size: 8 }, maxRotation: 30 }, grid: { display: false } },
  },
};

const IR_SECTIONS = [
  {
    key: 'behaviour', label: 'Behaviour', labelTH: 'พฤติกรรม', color: '#818cf8', icon: 'bi-emoji-smile-fill',
    items: [
      { field: 'B_OnTime'       as keyof IRReport, label: 'Be on Time',    labelTH: 'ตรงต่อเวลา'      },
      { field: 'B_Effort'       as keyof IRReport, label: 'Effort',        labelTH: 'ความพยายาม'      },
      { field: 'B_Teamwork'     as keyof IRReport, label: 'Teamwork',      labelTH: 'การทำงานเป็นทีม' },
      { field: 'B_Respect'      as keyof IRReport, label: 'Respect',       labelTH: 'ความเคารพ'       },
      { field: 'B_Attendance'   as keyof IRReport, label: 'Attendance',    labelTH: 'การเข้าร่วม'     },
      { field: 'B_Participation'as keyof IRReport, label: 'Participation', labelTH: 'การมีส่วนร่วม'   },
      { field: 'B_Improvement'  as keyof IRReport, label: 'Improvement',   labelTH: 'การพัฒนา'        },
    ],
    scoreField: 'BehaviourScore' as keyof IRReport,
  },
  {
    key: 'lifestyle', label: 'Lifestyle', labelTH: 'วิถีชีวิต', color: '#34d399', icon: 'bi-heart-fill',
    items: [
      { field: 'L_Sleep'     as keyof IRReport, label: 'Sleep',       labelTH: 'การนอนหลับ'  },
      { field: 'L_Hydration' as keyof IRReport, label: 'Hydration',   labelTH: 'การดื่มน้ำ'  },
      { field: 'L_Diet'      as keyof IRReport, label: 'Diet',        labelTH: 'โภชนาการ'    },
      { field: 'L_ScreenTime'as keyof IRReport, label: 'Screen Time', labelTH: 'เวลาหน้าจอ'  },
    ],
    scoreField: 'LifestyleScore' as keyof IRReport,
  },
  {
    key: 'technical', label: 'Technical', labelTH: 'เทคนิค', color: '#f472b6', icon: 'bi-trophy-fill',
    items: [
      { field: 'T_Motricity' as keyof IRReport, label: 'Motricity',        labelTH: 'การเคลื่อนไหว'  },
      { field: 'T_Technical' as keyof IRReport, label: 'Technical',        labelTH: 'ทักษะเทคนิค'     },
      { field: 'T_Tactic'    as keyof IRReport, label: 'Tactic',           labelTH: 'ยุทธวิธี'        },
      { field: 'T_OffFundam' as keyof IRReport, label: 'Off. Fundamental', labelTH: 'พื้นฐานการรุก'   },
      { field: 'T_DefFundam' as keyof IRReport, label: 'Def. Fundamental', labelTH: 'พื้นฐานการรับ'   },
      { field: 'T_Fitness'   as keyof IRReport, label: 'Fitness',          labelTH: 'สมรรถภาพ'        },
    ],
    scoreField: 'TechnicalScore' as keyof IRReport,
  },
];

function irScoreColor(s: number) {
  if (s >= 5) return '#16a34a';
  if (s >= 4) return '#22c55e';
  if (s >= 3) return '#f59e0b';
  if (s >= 2) return '#f97316';
  return '#ef4444';
}

function irGrade(pct: number) {
  if (pct >= 90) return { label: 'Excellent', color: '#10b981' };
  if (pct >= 75) return { label: 'Good',      color: '#3b82f6' };
  if (pct >= 50) return { label: 'Average',   color: '#f59e0b' };
  return               { label: 'Below Avg', color: '#ef4444' };
}

function loadGoals(pid: string): Record<string,string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(`pj_goals_${pid}`) || '{}'); } catch { return {}; }
}
function saveGoals(pid: string, g: Record<string,string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`pj_goals_${pid}`, JSON.stringify(g));
}

/* ── Large FC26 card for Scout Report hero ── */
function FC26CardLarge({ athlete, teamLogo, cardRef }: {
  athlete: Athlete; teamLogo?: string; cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const W = 220; const H = 330; const PANEL = 121; const photoH = H - PANEL;
  const rating = Math.round(Number(athlete?.Latest?.Rating) || 0);
  const d = athlete.DOB || ''; const l = athlete.Latest || {}; const p = athlete.Position || '';
  function toStat(s: number) { return s > 0 ? Math.min(99, Math.round(s * 19.8)) : 0; }
  const sc = {
    spd: toStat(getScorePoint('speed30',  String((l as Record<string,unknown>).Speed30    ||''), d, p)),
    jmp: toStat(getScorePoint('cmj',      String((l as Record<string,unknown>).CMJ        ||''), d, p)),
    agi: toStat(getScorePoint('agility',  String((l as Record<string,unknown>).Agility    ||''), d, p)),
    end: toStat(getScorePoint('yoyo',     String((l as Record<string,unknown>).YoYo       ||''), d, p)),
    str: toStat(getScorePoint('pushup',   String((l as Record<string,unknown>).Pushup     ||''), d, p)),
    flx: toStat(getScorePoint('sitreach', String((l as Record<string,unknown>).SitAndReach||''), d, p)),
  };
  const STATS: [string,number][] = [['SPD',sc.spd],['JMP',sc.jmp],['AGI',sc.agi],['END',sc.end],['STR',sc.str],['FLX',sc.flx]];
  const ini = (n: string) => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const POS_MAP: Record<string,string> = {
    'goalkeeper':'GK','defender':'DEF','center back':'CB','left back':'LB','right back':'RB',
    'wing back':'WB','midfielder':'MID','defensive midfield':'CDM','central midfield':'CM',
    'attacking midfield':'CAM','winger':'WNG','forward':'FWD','striker':'ST','center forward':'CF',
  };
  const posLabel = POS_MAP[(athlete.Position||'').toLowerCase()] || (athlete.Position||'').split(/[\s,/-]/)[0].slice(0,3).toUpperCase() || 'PLA';

  const shield = `path('M0,26 C0,10 10,0 26,0 Q110,18 194,0 C210,0 220,10 220,26 L220,291 C198,291 188,303 185,306 L143,306 Q110,330 77,306 L35,306 C32,303 22,291 0,291 Z')`;
  const swirl = [
    'radial-gradient(ellipse 120% 60% at 75% 12%, rgba(255,252,190,1) 0%, transparent 48%)',
    'radial-gradient(ellipse 60% 90% at 18% 75%, rgba(160,100,0,0.88) 0%, transparent 46%)',
    'radial-gradient(ellipse 70% 50% at 90% 85%, rgba(230,185,20,0.82) 0%, transparent 44%)',
    'radial-gradient(ellipse 40% 40% at 52% 50%, rgba(255,235,100,0.6) 0%, transparent 52%)',
    'linear-gradient(148deg,#5c3200 0%,#a86800 12%,#d9a810 26%,#f2d030 40%,#d9a810 54%,#c08010 68%,#eebc20 80%,#a86800 92%,#5c3200 100%)',
  ].join(',');
  const panel = 'linear-gradient(180deg,#f5d84a 0%,#e8c020 60%,#d4aa10 100%)';

  return (
    <div ref={cardRef} style={{ flexShrink:0, filter:'drop-shadow(0 12px 40px rgba(0,0,0,0.85))' }}>
      <div style={{ width:W, height:H, clipPath:shield, background:swirl, position:'relative', userSelect:'none', overflow:'hidden' }}>
        {/* Silk overlay */}
        <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
          background:['linear-gradient(210deg,rgba(255,255,255,0.38) 0%,rgba(255,255,255,0.08) 30%,transparent 52%)','linear-gradient(60deg,transparent 42%,rgba(255,245,150,0.2) 62%,transparent 82%)'].join(',')}}/>
        {/* Rating */}
        <div style={{ position:'absolute', top:14, left:14, zIndex:5 }}>
          <div style={{ fontSize:'3.5rem', fontWeight:900, color:'#1a0900', fontFamily:'Arial Black,sans-serif', lineHeight:0.9 }}>{rating||'—'}</div>
          <div style={{ fontSize:'1.2rem', fontWeight:900, color:'#1a0900', textTransform:'uppercase', letterSpacing:2, marginTop:8 }}>{posLabel}</div>
        </div>
        {/* Team logo top-right */}
        {teamLogo && (
          <div style={{ position:'absolute', top:14, right:14, zIndex:5, width:56, height:56, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.18)', borderRadius:8, backdropFilter:'blur(2px)', padding:4 }}>
            <img src={teamLogo} alt="" style={{ width:48, height:48, objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}/>
          </div>
        )}
        {/* Photo */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:photoH, zIndex:3, overflow:'hidden' }}>
          {athlete.PhotoUrl
            ? <img src={athlete.PhotoUrl} alt="" style={{ width:'100%', height:'115%', objectFit:'cover', objectPosition:'top center' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:14 }}>
                <span style={{ fontSize:'5.5rem', fontWeight:900, color:'rgba(0,0,0,0.17)', fontFamily:'Arial Black,sans-serif' }}>{ini(athlete.Name)}</span>
              </div>}
        </div>
        {/* Bottom panel */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:PANEL, background:panel, zIndex:4 }}>
          <div style={{ position:'absolute', top:0, left:'8%', right:'8%', height:2, background:'rgba(100,55,0,0.3)' }}/>
          <div style={{ position:'absolute', top:12, left:13, right:13, textAlign:'center',
            fontSize:'1.5rem', fontWeight:900, color:'#160800', fontFamily:'Arial Black,sans-serif', letterSpacing:0.5,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {athlete.Nickname || athlete.Name?.split(' ').slice(-1)[0] || athlete.Name}
          </div>
          <div style={{ position:'absolute', top:47, left:16, right:16, display:'flex' }}>
            {STATS.map(([k])=>(
              <div key={k} style={{ flex:1, minWidth:0, textAlign:'center', fontSize:'0.77rem', fontWeight:800, color:'rgba(26,9,0,0.55)', textTransform:'uppercase', overflow:'hidden' }}>{k}</div>
            ))}
          </div>
          <div style={{ position:'absolute', top:63, left:16, right:16, display:'flex' }}>
            {STATS.map(([k,v])=>(
              <div key={k} style={{ flex:1, minWidth:0, textAlign:'center', fontSize:'1.24rem', fontWeight:900, color:'#160800', fontFamily:'Arial Black,sans-serif', lineHeight:1, overflow:'hidden' }}>{v>0?v:'—'}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScoutPage({ athletes, initialId, onNavigate, onRefresh, user }: Props) {
  const [selectedId, setSelectedId] = useState(initialId || athletes[0]?.PlayerID || '');
  const [irHistory, setIrHistory] = useState<IRReport[]>([]);
  const [irLoading, setIrLoading] = useState(false);
  const [latestSkill, setLatestSkill] = useState<SkillAssessment | null>(null);
  const [attendanceRecs, setAttendanceRecs] = useState<import('@/lib/types').AttendanceRecord[]>([]);
  const [wellnessRecs,   setWellnessRecs]   = useState<import('@/lib/types').WellnessRecord[]>([]);
  const [rpeRecs,        setRpeRecs]        = useState<import('@/lib/types').RPERecord[]>([]);
  const [matchPerf,      setMatchPerf]      = useState<PlayerMatchPerf[]>([]);
  const [dateRange, setDateRange] = useState<'all'|'1y'|'6m'|'3m'>('all');
  const [chartView, setChartView] = useState<'score'|'raw'>('score');
  const [aiInsights, setAiInsights] = useState<{summary:string;strengths:string[];priorities:string[];training:string[];parentNote:string}|null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [goals, setGoals] = useState<Record<string,string>>({});
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showParentReport, setShowParentReport] = useState(false);
  const [goalDraft, setGoalDraft] = useState<Record<string,string>>({});
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewTestIdx, setViewTestIdx] = useState<number>(-1);
  const [showEditTestModal, setShowEditTestModal] = useState(false);
  const [editTestDraft, setEditTestDraft] = useState<Record<string,string>>({});
  const [editTestSaving, setEditTestSaving] = useState(false);
  const [deleteTestConfirm, setDeleteTestConfirm] = useState(false);
  const [deletingTest, setDeletingTest] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [localPhotoUrl, setLocalPhotoUrl] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);

  const handleDownloadCard = async () => {
    if (!athlete) return;
    try {
      const S = 4;
      const W = 220, H = 330, PANEL = 121, photoH = H - PANEL;
      const PAD = 44;

      const out = document.createElement('canvas');
      out.width  = (W + PAD * 2) * S;
      out.height = (H + PAD * 2) * S;
      const ctx  = out.getContext('2d')!;
      ctx.scale(S, S);

      const ox = PAD, oy = PAD;

      /* card shape path */
      const mkPath = (x: number, y: number) => {
        const p = new Path2D();
        p.moveTo(x, y+26);
        p.bezierCurveTo(x, y+10, x+10, y, x+26, y);
        p.quadraticCurveTo(x+110, y+18, x+194, y);
        p.bezierCurveTo(x+210, y, x+220, y+10, x+220, y+26);
        p.lineTo(x+220, y+291);
        p.bezierCurveTo(x+198, y+291, x+188, y+303, x+185, y+306);
        p.lineTo(x+143, y+306);
        p.quadraticCurveTo(x+110, y+330, x+77, y+306);
        p.lineTo(x+35, y+306);
        p.bezierCurveTo(x+32, y+303, x+22, y+291, x, y+291);
        p.closePath();
        return p;
      };
      const shape = mkPath(ox, oy);

      /* shadow: fill + destination-out hollow */
      const tmp = document.createElement('canvas');
      tmp.width = out.width; tmp.height = out.height;
      const tCtx = tmp.getContext('2d')!;
      tCtx.scale(S, S);
      tCtx.save();
      tCtx.shadowColor = 'rgba(0,0,0,0.85)';
      tCtx.shadowBlur  = 22;
      tCtx.shadowOffsetY = 9;
      tCtx.fillStyle = '#000';
      tCtx.fill(shape);
      tCtx.restore();
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.fill(shape);
      ctx.drawImage(tmp, 0, 0, W + PAD * 2, H + PAD * 2);

      /* clip card area */
      ctx.save();
      ctx.clip(shape);

      /* gold gradient background */
      const bg = ctx.createLinearGradient(ox, oy, ox+W, oy+H);
      bg.addColorStop(0,    '#5c3200'); bg.addColorStop(0.12, '#a86800');
      bg.addColorStop(0.26, '#d9a810'); bg.addColorStop(0.40, '#f2d030');
      bg.addColorStop(0.54, '#d9a810'); bg.addColorStop(0.68, '#c08010');
      bg.addColorStop(0.80, '#eebc20'); bg.addColorStop(0.92, '#a86800');
      bg.addColorStop(1, '#5c3200');
      ctx.fillStyle = bg; ctx.fillRect(ox, oy, W, H);

      /* radial highlights */
      const rad = (cx: number, cy: number, r: number, c0: string, c1: string) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        ctx.fillStyle = g; ctx.fillRect(ox, oy, W, H);
      };
      rad(ox+W*0.75, oy+H*0.12, W*0.72, 'rgba(255,252,190,1)',   'rgba(255,252,190,0)');
      rad(ox+W*0.18, oy+H*0.75, W*0.36, 'rgba(160,100,0,0.88)',  'rgba(160,100,0,0)');
      rad(ox+W*0.90, oy+H*0.85, W*0.42, 'rgba(230,185,20,0.82)', 'rgba(230,185,20,0)');
      rad(ox+W*0.52, oy+H*0.50, W*0.26, 'rgba(255,235,100,0.6)', 'rgba(255,235,100,0)');

      /* photo */
      const photoUrl = localPhotoUrl || athlete.PhotoUrl;
      const loadImg = (src: string) => new Promise<HTMLImageElement | null>(res => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => res(img); img.onerror = () => res(null); img.src = src;
      });
      if (photoUrl) {
        let img = await loadImg(photoUrl);
        if (!img) {
          try {
            const blob = await fetch(photoUrl).then(r => r.blob());
            const burl = URL.createObjectURL(blob);
            img = await loadImg(burl);
            URL.revokeObjectURL(burl);
          } catch { img = null; }
        }
        if (img) {
          ctx.save();
          ctx.beginPath(); ctx.rect(ox, oy, W, photoH * 1.15 + 5); ctx.clip();
          ctx.drawImage(img, ox, oy, W, photoH * 1.15);
          ctx.restore();
        }
      }
      if (!photoUrl) {
        ctx.fillStyle = 'rgba(0,0,0,0.17)';
        ctx.font = `900 88px "Arial Black",Arial,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(initials, ox + W / 2, oy + photoH - 14);
      }

      /* silk sheen overlay */
      const silk = ctx.createLinearGradient(ox, oy, ox+W*0.7, oy+H*0.7);
      silk.addColorStop(0,   'rgba(255,255,255,0.38)');
      silk.addColorStop(0.3, 'rgba(255,255,255,0.08)');
      silk.addColorStop(0.52,'rgba(255,255,255,0)');
      ctx.fillStyle = silk; ctx.fillRect(ox, oy, W, H);

      /* rating number */
      ctx.fillStyle = '#1a0900';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = `900 56px "Arial Black",Arial,sans-serif`;
      ctx.fillText(String(rating || '—'), ox+14, oy+14);

      /* position label */
      const POS_MAP: Record<string, string> = {
        goalkeeper:'GK', defender:'DEF', 'center back':'CB', 'left back':'LB', 'right back':'RB',
        'wing back':'WB', midfielder:'MID', 'defensive midfield':'CDM', 'central midfield':'CM',
        'attacking midfield':'CAM', winger:'WNG', forward:'FWD', striker:'ST', 'center forward':'CF',
      };
      const posLabel = POS_MAP[(athlete.Position||'').toLowerCase()] ||
        (athlete.Position||'').split(/[\s,/-]/)[0].slice(0,3).toUpperCase() || 'PLA';
      ctx.font = `900 19px "Arial Black",Arial,sans-serif`;
      ctx.fillText(posLabel, ox+14, oy+76);

      /* team logo top-right */
      if (user?.logoUrl) {
        const logoImg = await loadImg(user.logoUrl);
        if (logoImg) {
          ctx.save();
          const bx = ox+W-70, by = oy+14;
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.moveTo(bx+8,by); ctx.lineTo(bx+48,by); ctx.arcTo(bx+56,by,bx+56,by+8,8);
          ctx.lineTo(bx+56,by+48); ctx.arcTo(bx+56,by+56,bx+48,by+56,8);
          ctx.lineTo(bx+8,by+56); ctx.arcTo(bx,by+56,bx,by+48,8);
          ctx.lineTo(bx,by+8); ctx.arcTo(bx,by,bx+8,by,8);
          ctx.closePath(); ctx.fill();
          ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
          ctx.drawImage(logoImg, bx+4, by+4, 48, 48);
          ctx.restore();
        }
      }

      /* bottom gold panel */
      const panelY = oy + photoH;
      const panelGrd = ctx.createLinearGradient(ox, panelY, ox, panelY+PANEL);
      panelGrd.addColorStop(0,   '#f5d84a');
      panelGrd.addColorStop(0.6, '#e8c020');
      panelGrd.addColorStop(1,   '#d4aa10');
      ctx.fillStyle = panelGrd; ctx.fillRect(ox, panelY, W, PANEL);

      /* panel separator */
      ctx.fillStyle = 'rgba(100,55,0,0.3)';
      ctx.fillRect(ox + W*0.08, panelY, W*0.84, 2);

      /* player name */
      const dispName = athlete.Nickname || athlete.Name?.split(' ').slice(-1)[0] || athlete.Name || '';
      ctx.fillStyle = '#160800';
      ctx.font = `900 24px "Arial Black",Arial,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(dispName, ox+W/2, panelY+12, W-26);

      /* stats */
      const d = athlete.DOB || '';
      const p = athlete.Position || '';
      const l = athlete.Latest || {} as Record<string, unknown>;
      const toStat = (s: number) => s > 0 ? Math.min(99, Math.round(s * 19.8)) : 0;
      const sc = {
        spd: toStat(getScorePoint('speed30',  String(l['Speed30']     ||''), d, p)),
        jmp: toStat(getScorePoint('cmj',      String(l['CMJ']         ||''), d, p)),
        agi: toStat(getScorePoint('agility',  String(l['Agility']     ||''), d, p)),
        end: toStat(getScorePoint('yoyo',     String(l['YoYo']        ||''), d, p)),
        str: toStat(getScorePoint('pushup',   String(l['Pushup']      ||''), d, p)),
        flx: toStat(getScorePoint('sitreach', String(l['SitAndReach'] ||''), d, p)),
      };
      const STATS_DATA: [string, number][] = [
        ['SPD',sc.spd],['JMP',sc.jmp],['AGI',sc.agi],
        ['END',sc.end],['STR',sc.str],['FLX',sc.flx],
      ];
      const colW = (W - 32) / 6;
      const sx = ox + 16;

      /* stat labels */
      ctx.font = `800 12px Arial,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      STATS_DATA.forEach(([lbl], i) => {
        ctx.fillStyle = 'rgba(26,9,0,0.55)';
        ctx.fillText(lbl, sx + colW*i + colW/2, panelY+44);
      });

      /* stat values — top at panelY+60, bottom ~panelY+80, well above y=291 concave */
      ctx.font = `900 20px "Arial Black",Arial,sans-serif`;
      STATS_DATA.forEach(([, val], i) => {
        ctx.fillStyle = '#160800';
        ctx.fillText(val > 0 ? String(val) : '—', sx + colW*i + colW/2, panelY+60);
      });

      ctx.restore();

      const a = document.createElement('a');
      a.download = `${athlete.Name || 'card'}_FC26.png`;
      a.href = out.toDataURL('image/png');
      a.click();
    } catch (e) { console.error('download card failed', e); }
  };

  useEffect(() => { if (initialId) setSelectedId(initialId); }, [initialId]);

  useEffect(() => {
    setAiInsights(null); setAiError('');
    if (!selectedId) { setIrHistory([]); setLatestSkill(null); return; }
    setIrLoading(true);
    callGAS('getIRHistory', { playerId: selectedId })
      .then(d => setIrHistory(Array.isArray(d) ? d as IRReport[] : []))
      .catch(() => setIrHistory([]))
      .finally(() => setIrLoading(false));
    // Load latest skill assessment
    callGAS('getSkillAssessments', { playerId: selectedId })
      .then(d => {
        const arr = Array.isArray(d) ? d as SkillAssessment[] : [];
        setLatestSkill(arr.length > 0 ? arr[0] : null);
      })
      .catch(() => setLatestSkill(null));
    // Load attendance
    callGAS('getAttendanceByPlayer', { playerId: selectedId })
      .then(d => setAttendanceRecs(Array.isArray(d) ? d as import('@/lib/types').AttendanceRecord[] : []))
      .catch(() => setAttendanceRecs([]));
    // Load wellness
    callGAS('getWellnessByPlayer', { playerId: selectedId, limit: 30 })
      .then(d => setWellnessRecs(Array.isArray(d) ? d as import('@/lib/types').WellnessRecord[] : []))
      .catch(() => setWellnessRecs([]));
    // Load RPE
    callGAS('getRPEByPlayer', { playerId: selectedId, limit: 30 })
      .then(d => setRpeRecs(Array.isArray(d) ? d as import('@/lib/types').RPERecord[] : []))
      .catch(() => setRpeRecs([]));
    // Load match performance
    callGAS('getMatchStatsByPlayer', { playerId: selectedId })
      .then(d => setMatchPerf(Array.isArray(d) ? d as PlayerMatchPerf[] : []))
      .catch(() => setMatchPerf([]));
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) setGoals(loadGoals(selectedId));
    setLocalPhotoUrl('');
    setViewTestIdx(-1);
  }, [selectedId]);

  const athlete  = athletes.find(a => a.PlayerID === selectedId);
  const HIST     = athlete?.History || [];
  const latest   = athlete?.Latest  || {};
  const dob      = athlete?.DOB     || '';

  const effectiveIdx = viewTestIdx >= 0 && viewTestIdx < HIST.length ? viewTestIdx : HIST.length - 1;
  const viewTest: Partial<typeof latest> = effectiveIdx >= 0 ? HIST[effectiveIdx] : latest;

  const athletePos = athlete?.Position || '';
  const scores = METRICS.reduce<Record<string, number>>((acc, m) => {
    acc[m.key] = getScorePoint(m.key, String(latest[m.field] ?? ''), dob, athletePos);
    return acc;
  }, {});

  const viewScores = METRICS.reduce<Record<string, number>>((acc, m) => {
    acc[m.key] = getScorePoint(m.key, String(viewTest[m.field] ?? ''), dob, athletePos);
    return acc;
  }, {});

  const rating    = Number(latest.Rating) || 0;
  const grade     = getGrade(rating);
  const strengths = METRICS.filter(m => scores[m.key] >= 4);
  const weaknesses= METRICS.filter(m => scores[m.key] > 0 && scores[m.key] <= 2);
  const age       = calcAge(dob);
  const bmi       = calcBMI(String(latest.Height || ''), String(latest.Weight || ''));
  const initials  = (athlete?.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const lastTest  = HIST.length > 0 ? fmtDateFull(HIST[HIST.length - 1]?.Timestamp || '') : '—';

  // Date-filtered history
  const filteredHIST = (() => {
    if (dateRange === 'all') return HIST;
    const cutoff = new Date();
    if (dateRange === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
    else if (dateRange === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
    else cutoff.setFullYear(cutoff.getFullYear() - 1);
    return HIST.filter(r => { try { return new Date(r.Timestamp) >= cutoff; } catch { return true; } });
  })();

  // Percentile within same team
  const teamMates = athletes.filter(a => a.Team === athlete?.Team && a.Latest?.Rating);
  const ratingRank = teamMates.filter(a => Number(a.Latest?.Rating) > rating).length + 1;
  const rankPct = teamMates.length > 1 ? Math.round((1 - (ratingRank - 1) / teamMates.length) * 100) : null;

  // Earned badges
  const earnedBadges = BADGES.filter(b => b.check(HIST.length, rating, scores, HIST));

  // Physical Age
  const physicalAge = (() => {
    const valid = Object.values(scores).filter(s => s > 0);
    if (!valid.length || !age) return null;
    const avg = valid.reduce((a,b) => a+b,0) / valid.length;
    const offset = Math.round((avg - 3) * 1.5);
    return Math.max(8, (age || 0) + offset);
  })();

  const [qrBaseUrl, setQrBaseUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('pj_qr_base') || window.location.origin;
  });

  const buildQrUrl = (base: string, pid: string) => {
    const url = `${base.replace(/\/$/, '')}/athlete/${pid}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&color=0f172a&bgcolor=ffffff&margin=10`;
  };

  const handleShowQR = () => {
    if (!athlete) return;
    setQrDataUrl(buildQrUrl(qrBaseUrl, athlete.PlayerID));
    setShowQRModal(true);
  };

  const handleQrBaseChange = (val: string) => {
    setQrBaseUrl(val);
    if (typeof window !== 'undefined') localStorage.setItem('pj_qr_base', val);
    if (athlete) setQrDataUrl(buildQrUrl(val, athlete.PlayerID));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !athlete) return;
    setPhotoUploading(true);
    setPhotoError('');
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target?.result as string;
      setLocalPhotoUrl(base64);
      try {
        const res = await callGAS('updateAthlete', {
          playerId: athlete.PlayerID,
          name: athlete.Name, nickname: athlete.Nickname || '',
          dob: athlete.DOB || '', team: athlete.Team || '',
          domHand: athlete.DomHand || 'Right', domFoot: athlete.DomFoot || 'Right',
          position: athlete.Position || '', club: athlete.Club || '',
          province: athlete.Province || '',
          photoBase64: base64, photoMimeType: file.type,
        }) as { status: string; message?: string };
        if (res.status === 'success') {
          onRefresh();
        } else {
          setPhotoError(res.message || 'Upload ไม่สำเร็จ');
        }
      } catch (err) {
        setPhotoError('เกิดข้อผิดพลาด: ' + String(err));
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const histLabels = filteredHIST.map((r, i) => fmtDate(r.Timestamp, i));

  function lineData(field: keyof TestRecord, color: string) {
    return {
      labels: histLabels,
      datasets: [{
        data: filteredHIST.map(r => {
          const v = r[field];
          if (v === undefined || v === '') return null;
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          return isNaN(n) ? null : n;
        }),
        borderColor: color,
        backgroundColor: color + '18',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        fill: true,
        borderWidth: 2,
      }],
    };
  }

  const radarData = {
    labels: METRICS.map(m => m.label),
    datasets: [{
      label: athlete?.Name || '',
      data: METRICS.map(m => viewScores[m.key] || 0),
      backgroundColor: 'rgba(56,189,248,0.12)',
      borderColor: '#38bdf8',
      borderWidth: 2.5,
      pointBackgroundColor: '#38bdf8',
      pointRadius: 4,
    }],
  };

  const handlePrint = () => window.print();
  const handlePDF = () => window.print();


  const openEditTestModal = () => {
    const t = viewTest as Record<string, unknown>;
    setEditTestDraft({
      height: String(t.Height || ''), weight: String(t.Weight || ''),
      muscle: String(t.Muscle || ''), fat: String(t.Fat || ''),
      speed30: String(t.Speed30 || ''), cmj: String(t.CMJ || ''),
      agiL: String(t.AgiL || ''), agiR: String(t.AgiR || ''),
      situp: String(t.Situp || ''), longJump: String(t.LongJump || ''),
      yoyo: String(t.YoYo || ''), pushup: String(t.Pushup || ''),
      sitReach: String(t.SitAndReach || ''),
      yoyoLevel: String(t.YoYoLevel || ''), yoyoShuttle: String(t.YoYoShuttle || ''),
    });
    setShowEditTestModal(true);
  };

  const handleSaveTestEdit = async () => {
    const t = viewTest as Record<string, unknown>;
    if (!t.id || !athlete) return;
    setEditTestSaving(true);
    try {
      await callGAS('updateTestRecord', { testId: t.id, playerId: athlete.PlayerID, ...editTestDraft });
      setShowEditTestModal(false);
      onRefresh();
    } finally {
      setEditTestSaving(false);
    }
  };

  const handleDeleteTest = async () => {
    const t = viewTest as Record<string, unknown>;
    if (!t.id) return;
    setDeletingTest(true);
    try {
      await callGAS('deleteTestRecord', { testId: t.id });
      setDeleteTestConfirm(false);
      setViewTestIdx(-1);
      onRefresh();
    } finally {
      setDeletingTest(false);
    }
  };

  const infoValues: Record<string, string> = {
    height:   latest.Height  ? `${latest.Height}`  : '—',
    weight:   latest.Weight  ? `${latest.Weight}`  : '—',
    bmi:      bmi !== '—'    ? bmi                 : '—',
    fat:      latest.Fat     ? `${latest.Fat}`     : '—',
    muscle:   latest.Muscle  ? `${latest.Muscle}`  : '—',
    vo2max:   latest.VO2Max  ? `${latest.VO2Max}`  : '—',
    domfoot:  athlete?.DomFoot || '—',
    domhand:  athlete?.DomHand || '—',
    age:      age != null    ? `${age}`            : '—',
    province: athlete?.Province || '—',
  };

  return (
    <div>
      <style>{`
        @media print {
          /* ══ PAGE ══ */
          @page { size: A4 portrait; margin: 10mm 12mm; }

          /* ══ ซ่อน UI ที่ไม่ใช่เนื้อหา ══ */
          .page-header, .sidebar, .top-bar, .sidebar-overlay,
          .tab-switch, .search-wrap, .no-print,
          #scoutPrintArea .athlete-selector,
          .modal-overlay, .photo-hover-overlay { display: none !important; }

          /* ══ reset layout ══ */
          body { background: white !important; font-size: 9.5pt !important; }
          .main { margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* ══ ซ่อน section ที่ไม่ต้องการใน print ══ */
          #scoutVideoPrint { display: none !important; }

          /* ══ HERO ══ */
          #scoutHero {
            margin-bottom: 4mm !important;
            border-radius: 8pt !important;
            min-height: unset !important;
            overflow: visible !important;
          }
          #scoutHeroInner {
            padding: 12px 16px !important;
            gap: 12px !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
          }
          /* FC26 card ย่อ — zoom collapses layout box (Chrome/PDF) */
          #scoutHeroCard {
            zoom: 0.48 !important;
            margin: 0 !important;
            flex-shrink: 0 !important;
          }
          /* OVR badge ย่อ */
          #scoutOVRBadge {
            zoom: 0.80 !important;
            flex-shrink: 0 !important;
          }
          /* ชื่อนักกีฬา */
          #scoutHeroName { font-size: 14pt !important; }
          /* rating */
          #scoutHeroRating { font-size: 28pt !important; }

          /* ══ SURFACE CARDS ══ */
          .surface {
            box-shadow: none !important;
            border: 0.75pt solid #cbd5e1 !important;
            border-radius: 6pt !important;
            padding: 8px 10px !important;
            margin-bottom: 3mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .section-hd {
            font-size: 9pt !important;
            font-weight: 800 !important;
            border-bottom: 1pt solid #0f172a !important;
            padding-bottom: 1.5mm !important;
            margin-bottom: 3mm !important;
          }

          /* ══ 2-COLUMN GRID สำหรับ sections ใหญ่ ══ */
          #scoutPrintArea {
            columns: 1 !important;
          }
          /* Perf metrics + radar: side by side */
          #scoutPerfSection {
            display: grid !important;
            grid-template-columns: 1fr 140px !important;
            gap: 8px !important;
          }
          /* History charts: 3 per row */
          #scoutHistoryCharts {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          /* Body comp: 2 col */
          #scoutBodyKPI {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          /* Body composition trend: 3 per row */
          #scoutBodyTrends {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          /* Skill categories: 3+2 */
          #scoutSkillGrid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          /* Attendance + Wellness: side by side */
          #scoutAttendWellRow {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          /* IDP sections: 3 col */
          #scoutIDPGrid {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          /* ══ CHARTS ══ */
          canvas {
            max-height: 120px !important;
            max-width: 100% !important;
            break-inside: avoid;
          }
          /* Radar chart ย่อ */
          #scoutRadarChart canvas { max-height: 130px !important; }

          /* ══ FONT SIZES ══ */
          .data-table, .roster-table { font-size: 7.5pt !important; }
          .data-table th, .roster-table th { font-size: 7pt !important; background: #f8fafc !important; }
          .data-table td, .roster-table td { padding: 3px 6px !important; }

          /* ══ PAGE BREAKS ══ */
          .surface { break-inside: avoid; page-break-inside: avoid; }
          #scoutBodySection    { break-before: avoid; }
          #scoutSkillSection   { break-before: auto; }
          #scoutIDPSection     { break-before: auto; }
          #scoutAttendSection  { break-before: auto; }
          #scoutWellnessSection{ break-before: avoid; }
          #scoutRPESection     { break-before: avoid; }
        }
      `}</style>
      <PrintHeader user={user} title="Scout Report" subtitle={athlete ? `${athlete.Name} · ${athlete.Team || '—'}` : 'รายงานสมรรถภาพและพัฒนาการนักกีฬา'} />
      <div className="page-header">
        <div>
          <h2 className="page-title">Scout Report</h2>
          <p className="page-subtitle">รายงานสมรรถภาพและพัฒนาการนักกีฬา</p>
        </div>
        {athlete && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={() => setShowEditModal(true)}><i className="bi bi-pencil-square me-1" />แก้ไขข้อมูล</button>
            <button className="btn-outline" onClick={handleShowQR}><i className="bi bi-qr-code me-1" />QR Card</button>
            <button className="btn-outline" onClick={handleDownloadCard}><i className="bi bi-download me-1" />ดาวน์โหลดการ์ด</button>
            <button className="btn-outline" onClick={() => setShowParentReport(true)}><i className="bi bi-file-earmark-person me-1" />รายงานผู้ปกครอง</button>
            <button className="btn-primary" onClick={handlePDF}><i className="bi bi-printer me-1" />Print</button>
          </div>
        )}
      </div>
      <ReportBanner user={user} subtitle={athlete ? `Scout Report · ${athlete.Name}` : 'Scout Report'} />

      {/* Athlete Selector */}
      <div className="surface mb-4" style={{ padding: '14px 20px' }}>
        <AthleteSearchSelect athletes={athletes} value={selectedId} onChange={setSelectedId} />
      </div>

      {!athlete && (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <i className="bi bi-person-badge" style={{ fontSize: '5rem', color: '#e2e8f0', display: 'block', marginBottom: 16 }} />
          <h4 style={{ color: '#94a3b8' }}>กรุณาเลือกนักกีฬา</h4>
          <p style={{ fontSize: '0.875rem', marginTop: 6 }}>เลือกชื่อจาก dropdown ด้านบน</p>
        </div>
      )}

      {/* ── EDIT TEST MODAL ── */}
      {showEditTestModal && (
        <div className="modal-overlay" onClick={() => setShowEditTestModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                <i className="bi bi-pencil-square me-2" style={{ color: '#38bdf8' }} />
                แก้ไขผลเทส — {fmtDateFull((viewTest as Record<string,unknown>).Timestamp as string || '')}
              </h3>
              <button onClick={() => setShowEditTestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94a3b8' }}>×</button>
            </div>
            {(['height','weight','muscle','fat'] as const).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ร่างกาย</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[
                    { key: 'height',  label: 'ส่วนสูง (cm)' },
                    { key: 'weight',  label: 'น้ำหนัก (kg)' },
                    { key: 'muscle',  label: 'กล้ามเนื้อ (%)' },
                    { key: 'fat',     label: 'ไขมัน (%)' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 3 }}>{f.label}</label>
                      <input type="number" step="0.1" className="form-control" style={{ fontSize: '0.85rem', padding: '5px 8px' }}
                        value={editTestDraft[f.key] || ''} onChange={e => setEditTestDraft(d => ({...d, [f.key]: e.target.value}))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>สมรรถภาพ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { key: 'speed30',  label: 'Speed 30m (s)' },
                  { key: 'cmj',      label: 'CMJ (cm)' },
                  { key: 'agiL',     label: 'Agility L (s)' },
                  { key: 'agiR',     label: 'Agility R (s)' },
                  { key: 'situp',    label: 'Sit-up (reps)' },
                  { key: 'longJump', label: 'Long Jump (cm)' },
                  { key: 'yoyo',     label: 'Yo-Yo (m)' },
                  { key: 'pushup',   label: 'Push-up (reps)' },
                  { key: 'sitReach', label: 'Sit & Reach (cm)' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 3 }}>{f.label}</label>
                    <input type="number" step="0.1" className="form-control" style={{ fontSize: '0.85rem', padding: '5px 8px' }}
                      value={editTestDraft[f.key] || ''} onChange={e => setEditTestDraft(d => ({...d, [f.key]: e.target.value}))} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <button className="btn-outline" onClick={() => setShowEditTestModal(false)} disabled={editTestSaving}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveTestEdit} disabled={editTestSaving}>
                {editTestSaving ? <span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><i className="bi bi-check-lg me-1" />บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE TEST CONFIRM ── */}
      {deleteTestConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteTestConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 52, height: 52, background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <i className="bi bi-trash-fill" style={{ color: '#dc2626', fontSize: '1.3rem' }} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>ลบผลเทสครั้งนี้?</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                {fmtDateFull((viewTest as Record<string,unknown>).Timestamp as string || '')} — ไม่สามารถกู้คืนได้
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 8 }}>
              <button className="btn-outline" onClick={() => setDeleteTestConfirm(false)} disabled={deletingTest}>ยกเลิก</button>
              <button onClick={handleDeleteTest} disabled={deletingTest} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                {deletingTest ? <span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <><i className="bi bi-trash me-1" />ลบ</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {athlete && (
        <div id="scoutPrintArea">

          {/* ── HERO HEADER ── */}
          <div id="scoutHero" style={{
            position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 20,
            background: 'linear-gradient(135deg,#0c1628 0%,#0f2040 50%,#0c1628 100%)',
            border: '1px solid rgba(56,189,248,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* Full-bleed photo background (blur) */}
            {(localPhotoUrl || athlete.PhotoUrl) && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
                <img src={localPhotoUrl || athlete.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', filter: 'blur(28px) brightness(0.25) saturate(1.4)', transform: 'scale(1.1)' }} />
              </div>
            )}
            {/* glow overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 75% 50%,rgba(56,189,248,0.1) 0%,transparent 65%)' }} />

            {/* content */}
            <div id="scoutHeroInner" style={{ position:'relative', zIndex:2, padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'stretch', gap:24, flexWrap:'wrap' }}>

              {/* LEFT: FC26 card */}
              <div id="scoutHeroCard" style={{ position:'relative', cursor:'pointer', flexShrink:0 }} onClick={() => photoRef.current?.click()} title="คลิกเพื่อเปลี่ยนรูปภาพ">
                <FC26CardLarge
                  athlete={{ ...athlete, PhotoUrl: localPhotoUrl || athlete.PhotoUrl }}
                  teamLogo={user?.logoUrl}
                  cardRef={cardRef}
                />
                <div className="photo-hover-overlay"
                  style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, opacity: photoUploading ? 1 : 0, transition:'opacity 0.2s', borderRadius:4, zIndex:20 }}
                  onMouseEnter={e=>{ if(!photoUploading)(e.currentTarget as HTMLDivElement).style.opacity='1'; }}
                  onMouseLeave={e=>{ if(!photoUploading)(e.currentTarget as HTMLDivElement).style.opacity='0'; }}>
                  {photoUploading
                    ? <div style={{ width:28, height:28, border:'3px solid rgba(255,255,255,0.3)', borderTop:'3px solid white', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
                    : <><i className="bi bi-camera-fill" style={{ color:'white', fontSize:'1.8rem' }}/><span style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.75rem', fontWeight:700 }}>เปลี่ยนรูป</span></>}
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

              {/* CENTER: Name + team info — top-aligned, fills space */}
              <div className="scout-hero-center" style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'flex-start', paddingTop:4 }}>
                <div style={{ fontSize:'0.55rem', fontWeight:700, letterSpacing:3, color:'#38bdf8', textTransform:'uppercase', marginBottom:8 }}>ISP</div>
                <div style={{ fontSize:'2rem', fontWeight:800, color:'#ffffff', lineHeight:1.05, textTransform:'uppercase', letterSpacing:0.5 }}>{athlete.Name}</div>
                {athlete.Nickname && <div style={{ fontSize:'0.9rem', color:'#7dd3fc', fontStyle:'italic', marginTop:4, marginBottom:14 }}>"{athlete.Nickname}"</div>}

                {/* Team logo + name — prominent block */}
                {(user?.logoUrl || athlete.Team) && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginTop: athlete.Nickname ? 0 : 14, marginBottom:14,
                    padding:'8px 14px', background:'rgba(255,255,255,0.1)', borderRadius:12, border:'1px solid rgba(255,255,255,0.15)',
                    alignSelf:'flex-start', maxWidth:'100%' }}>
                    {user?.logoUrl && <img src={user.logoUrl} alt="" style={{ width:32, height:32, objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}/>}
                    {athlete.Team && <span style={{ fontSize:'1rem', fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>{athlete.Team}</span>}
                  </div>
                )}

                {/* Position / location tags */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {[
                    { icon:'bi-person-badge', val: athlete.Position, show: !!athlete.Position },
                    { icon:'bi-building',     val: athlete.Club,     show: !!athlete.Club },
                    { icon:'bi-geo-alt-fill', val: athlete.Province, show: !!athlete.Province },
                  ].filter(x=>x.show).map(x=>(
                    <span key={x.icon} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.75rem', color:'rgba(255,255,255,0.8)', background:'rgba(255,255,255,0.09)', borderRadius:20, padding:'4px 11px', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <i className={`bi ${x.icon}`} style={{ color:'#38bdf8', fontSize:'0.7rem' }}/> {x.val}
                    </span>
                  ))}
                </div>

                {/* Mini stats row — bottom of center */}
                <div className="scout-hero-stats" style={{ marginTop:'auto', paddingTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[
                    { label:'TESTS',    val: String(HIST.length) },
                    { label:'AGE',      val: age != null ? `${age}` : '—' },
                    { label:'PHYS AGE', val: physicalAge != null ? `~${physicalAge}` : '—', hi: physicalAge != null && age != null && physicalAge > age },
                  ].map(s=>(
                    <div key={s.label} style={{ textAlign:'center', background:(s as any).hi ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.07)', border:`1px solid ${(s as any).hi ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius:10, padding:'8px 14px', minWidth:58 }}>
                      <div style={{ fontSize:'1.15rem', fontWeight:800, color:(s as any).hi ? '#34d399' : 'white', lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:'0.55rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.5, marginTop:3 }}>{s.label}</div>
                    </div>
                  ))}
                  {HIST.length > 0 && <div style={{ fontSize:'0.7rem', color:'#64748b', alignSelf:'flex-end', paddingBottom:4 }}><i className="bi bi-clock me-1"/>Last test: {lastTest}</div>}
                </div>
              </div>

              {/* RIGHT: OVR badge — stretches to match hero height */}
              <div id="scoutOVRBadge" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0,
                borderRadius:18, padding:'20px 24px', minWidth:120,
                background: rating>=80 ? 'linear-gradient(160deg,#10b981,#047857)' : rating>=60 ? 'linear-gradient(160deg,#3b82f6,#1d4ed8)' : rating>=40 ? 'linear-gradient(160deg,#f59e0b,#b45309)' : 'linear-gradient(160deg,#ef4444,#b91c1c)',
                border:`2px solid ${rating>=80?'#34d399':rating>=60?'#60a5fa':rating>=40?'#fbbf24':'#f87171'}`,
                boxShadow:`0 8px 32px ${rating>=80?'rgba(16,185,129,0.35)':rating>=60?'rgba(59,130,246,0.35)':'rgba(239,68,68,0.3)'}`,
              }}>
                {/* Team logo + name at top of badge */}
                {(user?.logoUrl || athlete.Team) && (
                  <div className="scout-badge-team" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, marginBottom:12, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.25)', width:'100%' }}>
                    {user?.logoUrl && <img src={user.logoUrl} alt="" style={{ width:38, height:38, objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}/>}
                    {athlete.Team && <span style={{ fontSize:'0.68rem', fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:1, textAlign:'center', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{athlete.Team}</span>}
                  </div>
                )}
                <div style={{ fontSize:'0.58rem', fontWeight:700, letterSpacing:2, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', marginBottom:4 }}>OVR</div>
                <div style={{ fontSize:'3.5rem', fontWeight:900, color:'white', lineHeight:1 }}>{rating}</div>
                <div style={{ fontSize:'0.8rem', fontWeight:700, color:'rgba(255,255,255,0.95)', marginTop:6 }}>{grade.emoji} {grade.label}</div>
                <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.6)', marginTop:2 }}>{grade.labelTH}</div>
                {rankPct !== null && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.2)', textAlign:'center', width:'100%' }}>
                    <div style={{ fontSize:'0.95rem', fontWeight:800, color:'#bfdbfe', lineHeight:1 }}>Top {100-rankPct+1}%</div>
                    <div style={{ fontSize:'0.52rem', color:'rgba(255,255,255,0.5)', letterSpacing:1, marginTop:2 }}>RANK {ratingRank}/{teamMates.length}</div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── SW CARDS ── */}
          <div className="grid-2col" style={{ marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: '#16a34a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-star-fill" style={{ color: 'white', fontSize: '0.75rem' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534' }}>Strengths</span>
                <span style={{ marginLeft: 'auto', background: '#16a34a', color: 'white', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{strengths.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {strengths.length === 0
                  ? <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>ยังไม่มีจุดแข็งที่โดดเด่น</span>
                  : strengths.map(m => (
                      <span key={m.key} style={{ background: '#16a34a', color: 'white', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <i className={`bi ${m.icon} me-1`} />{m.label} {scores[m.key]}/5
                      </span>
                    ))}
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1px solid #fed7aa', borderRadius: 'var(--radius-sm)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: '#ea580c', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: 'white', fontSize: '0.7rem' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#9a3412' }}>Needs Work</span>
                <span style={{ marginLeft: 'auto', background: '#ea580c', color: 'white', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{weaknesses.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {weaknesses.length === 0
                  ? <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>ไม่มีจุดอ่อนวิกฤต</span>
                  : weaknesses.map(m => (
                      <span key={m.key} style={{ background: '#ea580c', color: 'white', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <i className={`bi ${m.icon} me-1`} />{m.label} {scores[m.key]}/5
                      </span>
                    ))}
              </div>
            </div>
          </div>

          {/* ── BADGES ── */}
          {earnedBadges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: '12px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'center', marginRight: 4 }}>Achievements</span>
              {earnedBadges.map(b => (
                <span key={b.id} title={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                  <span style={{ fontSize: '1rem' }}>{b.emoji}</span> {b.label}
                </span>
              ))}
            </div>
          )}

          {/* ── PHYSICAL INFO ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
            {INFO_ITEMS.map(item => {
              const raw = infoValues[item.key];
              const isEmpty = raw === '—';
              return (
                <div key={item.key} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
                  <div style={{ width: 32, height: 32, background: item.color + '18', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: '0.95rem' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 }}>{item.label}</div>
                  <div style={{ fontSize: '0.58rem', color: '#94a3b8', marginBottom: 3 }}>{item.labelTH}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: isEmpty ? '#cbd5e1' : '#0f172a' }}>
                    {raw}{!isEmpty && item.suffix ? <span style={{ fontSize: '0.6rem', fontWeight: 500, color: '#94a3b8', marginLeft: 2 }}>{item.suffix}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── PHYSICAL AGE ── */}
          {physicalAge !== null && age !== null && (
            <div style={{ marginBottom: 20, background: physicalAge > age ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : physicalAge < age ? 'linear-gradient(135deg,#fff7ed,#ffedd5)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: `1px solid ${physicalAge > age ? '#bbf7d0' : physicalAge < age ? '#fed7aa' : '#bfdbfe'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: physicalAge > age ? '#16a34a' : physicalAge < age ? '#ea580c' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-person-fill" style={{ color: 'white', fontSize: '1.2rem' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#64748b' }}>Physical Age</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: physicalAge > age ? '#16a34a' : physicalAge < age ? '#ea580c' : '#2563eb', lineHeight: 1 }}>~{physicalAge}</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ปี</span>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: 4 }}>
                  {physicalAge > age
                    ? `🚀 ร่างกายเทียบเท่าคนอายุ ${physicalAge} ปี — เกินกว่าอายุจริง ${physicalAge - age} ปี`
                    : physicalAge < age
                    ? `⚠️ ร่างกายเทียบเท่าคนอายุ ${physicalAge} ปี — ต่ำกว่าอายุจริง ${age - physicalAge} ปี`
                    : `✓ ร่างกายสมกับอายุ ${age} ปี — พัฒนาการปกติ`}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  อายุจริง {age} ปี · คำนวณจากคะแนนสมรรถภาพ {Object.values(scores).filter(s=>s>0).length} รายการ
                </div>
              </div>
            </div>
          )}

          {/* ── PERFORMANCE METRICS + RADAR ── */}
          <div id="scoutPerfSection" className="perf-split mb-4">
            <div className="surface">
              <div className="section-hd" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <span><i className="bi bi-bar-chart-fill" style={{ color: '#38bdf8' }} /> Performance Metrics <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>ผลสมรรถภาพร่างกาย</span></span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {HIST.length > 0 && (
                    <select
                      className="form-select"
                      value={effectiveIdx}
                      onChange={e => setViewTestIdx(Number(e.target.value))}
                      style={{ fontSize: '0.72rem', padding: '3px 8px', height: 28, minWidth: 130 }}
                    >
                      {HIST.map((r, i) => (
                        <option key={i} value={i}>
                          {i === HIST.length - 1 ? '★ ' : ''}{fmtDateFull(r.Timestamp)} {i === HIST.length - 1 ? '(ล่าสุด)' : `#${i + 1}`}
                        </option>
                      )).reverse()}
                    </select>
                  )}
                  {HIST.length > 0 && !!(viewTest as Record<string,unknown>).id && (
                    <>
                      <button className="btn-outline btn-sm" onClick={openEditTestModal} style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                        <i className="bi bi-pencil me-1" />แก้ไข
                      </button>
                      <button onClick={() => setDeleteTestConfirm(true)} style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>
                        <i className="bi bi-trash me-1" />ลบ
                      </button>
                    </>
                  )}
                  <button className="btn-outline btn-sm" onClick={() => { setGoalDraft({...goals}); setShowGoalModal(true); }} style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                    <i className="bi bi-flag me-1" />Set Goals
                  </button>
                </div>
              </div>
              <table className="table-perf">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Metric</th>
                    <th>Value</th>
                    <th>Score</th>
                    <th style={{ width: 110 }}>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(m => {
                    const rawVal = viewTest[m.field];
                    const strVal = rawVal !== undefined && rawVal !== '' ? String(rawVal) : '';
                    const display = strVal ? `${strVal} ${m.unit}` : '—';
                    const sc  = viewScores[m.key];
                    const col = sc > 0 ? SCORE_COLORS[sc] : null;
                    const rowBg = sc >= 4 ? 'rgba(16,185,129,0.04)' : sc > 0 && sc <= 2 ? 'rgba(239,68,68,0.04)' : 'transparent';
                    return (
                      <tr key={m.key} style={{ background: rowBg }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, background: m.color + '18', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={`bi ${m.icon}`} style={{ color: m.color, fontSize: '0.8rem' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.label}</div>
                              <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 1 }}>{m.labelTH}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}>{display}</td>
                        <td style={{ textAlign: 'center' }}>
                          {col
                            ? <span style={{ background: col.bg, color: col.color, borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sc}/5 · {col.label}</span>
                            : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>}
                        </td>
                        <td>
                          <div style={{ background: '#f1f5f9', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: sc > 0 ? `${(sc / 5) * 100}%` : '0%', background: col ? `linear-gradient(90deg,${col.color},${col.color}99)` : '#e2e8f0', borderRadius: 20, transition: 'width 0.6s ease' }} />
                          </div>
                          {goals[m.key] && strVal && (() => {
                            const target = parseFloat(goals[m.key]);
                            const current = parseFloat(strVal);
                            if (isNaN(target) || isNaN(current)) return null;
                            const met = current >= target;
                            return <div style={{ fontSize: '0.65rem', color: met ? '#16a34a' : '#f59e0b', marginTop: 2, fontWeight: 600 }}>
                              {met ? '✓' : '▷'} Goal: {target} {m.unit}
                            </div>;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 280 }}>
              <div className="section-hd" style={{ width: '100%' }}><i className="bi bi-broadcast" style={{ color: '#38bdf8' }} /> Skill Radar <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>แผนภูมิทักษะ</span></div>
              <div style={{ width: '100%', maxWidth: 320 }}>
                <Radar data={radarData} options={RADAR_OPTS} />
              </div>
              <div style={{ width: '100%', marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {METRICS.map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#64748b' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: viewScores[m.key] >= 4 ? '#10b981' : viewScores[m.key] > 0 && viewScores[m.key] <= 2 ? '#ef4444' : '#94a3b8' }} />
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DEV SUMMARY TABLE ── */}
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-graph-up-arrow" style={{ color: '#818cf8' }} /> Development Plan <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>แผนพัฒนาทักษะ</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="dev-plan-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>ทักษะ</th>
                    <th style={{ width: 90, textAlign: 'center' }}>คะแนน</th>
                    <th>ผลกระทบ</th>
                    <th>โปรแกรมแนะนำ</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS
                    .filter(m => scores[m.key] > 0)
                    .sort((a, b) => scores[a.key] - scores[b.key])
                    .map((m, i) => {
                      const sc = scores[m.key];
                      const dev = DEV_DATA[m.key];
                      const col = SCORE_COLORS[sc];
                      const isWeak = sc <= 2;
                      return (
                        <tr key={m.key} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className={`bi ${m.icon}`} style={{ color: m.color, fontSize: '0.9rem' }} />
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{dev?.label || m.label}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: col.bg, color: col.color, borderRadius: 20, padding: '3px 12px', fontWeight: 700, fontSize: '0.75rem' }}>{sc}/5</span>
                          </td>
                          <td style={{ color: isWeak ? '#dc2626' : '#166534', fontSize: '0.8rem', maxWidth: 200 }}>
                            {isWeak ? dev?.badImpact : dev?.goodImpact}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {(isWeak ? dev?.badRec : dev?.goodRec)?.map((r, ri) => (
                                <span key={ri} style={{ background: isWeak ? '#fef2f2' : '#f0fdf4', color: isWeak ? '#991b1b' : '#166534', border: `1px solid ${isWeak ? '#fecaca' : '#bbf7d0'}`, borderRadius: 4, padding: '2px 8px', fontSize: '0.72rem' }}>{r}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── HISTORY CHARTS ── */}
          {HIST.length >= 2 && (
            <div id="scoutHistorySection" className="surface mb-4">
              <div className="section-hd" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span><i className="bi bi-graph-up" style={{ color: '#34d399' }} /> Historical Progress <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>ประวัติพัฒนาการ</span> <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>{filteredHIST.length}/{HIST.length} ครั้ง</span></span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* View toggle */}
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 7, padding: 2 }}>
                    {(['score','raw'] as const).map(v => (
                      <button key={v} onClick={() => setChartView(v)} style={{ padding: '3px 10px', borderRadius: 5, border: 'none', background: chartView === v ? '#0f172a' : 'transparent', color: chartView === v ? 'white' : '#64748b', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {v === 'score' ? '📈 Score' : '📊 Raw'}
                      </button>
                    ))}
                  </div>
                  {/* Date range */}
                  {(['all','1y','6m','3m'] as const).map(d => (
                    <button key={d} onClick={() => setDateRange(d)} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${dateRange === d ? '#38bdf8' : '#e2e8f0'}`, background: dateRange === d ? '#38bdf8' : 'white', color: dateRange === d ? 'white' : '#64748b', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                      {d === 'all' ? 'All' : d === '1y' ? '1 Year' : d === '6m' ? '6 Mo' : '3 Mo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Score Trend (combined) ── */}
              {chartView === 'score' && (() => {
                const scoreTrendDatasets = METRICS.map(m => ({
                  label: m.label,
                  data: filteredHIST.map(r => {
                    const v = r[m.field as keyof typeof r];
                    if (!v && v !== 0) return null;
                    const sc = getScorePoint(m.key, String(v), dob, athletePos);
                    return sc > 0 ? sc : null;
                  }),
                  borderColor: m.color,
                  backgroundColor: m.color + '22',
                  tension: 0.35,
                  pointRadius: 4,
                  pointHoverRadius: 7,
                  pointBackgroundColor: m.color,
                  borderWidth: 2.5,
                  spanGaps: true,
                }));
                const allNull = scoreTrendDatasets.every(d => d.data.every(v => v === null));
                if (allNull) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>ยังไม่มีข้อมูลเพียงพอ</div>;
                return (
                  <div style={{ padding: '8px 0' }}>
                    {/* Overall trend summary */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {METRICS.map(m => {
                        const vals = filteredHIST.map(r => { const v = r[m.field as keyof typeof r]; const sc = v ? getScorePoint(m.key, String(v), dob, athletePos) : 0; return sc > 0 ? sc : null; }).filter((v): v is number => v !== null);
                        const trend = vals.length >= 2 ? vals[vals.length-1] - vals[0] : 0;
                        const last = vals[vals.length-1];
                        if (!last) return null;
                        return (
                          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', border: `1px solid ${m.color}40`, borderRadius: 8, padding: '5px 10px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>{m.label}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: m.color }}>{last}/5</span>
                            {trend !== 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: trend > 0 ? '#16a34a' : '#dc2626' }}>{trend > 0 ? '▲' : '▼'}{Math.abs(trend)}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <Line data={{ labels: histLabels, datasets: scoreTrendDatasets }} options={SCORE_LINE_OPTS} />
                  </div>
                );
              })()}

              {/* ── Raw Mini Charts ── */}
              {chartView === 'raw' && (
                <div id="scoutHistoryCharts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {HISTORY_CHARTS.map(hc => {
                    const chartVals = HIST.map(r => {
                      const v = r[hc.field];
                      if (v === undefined || v === '') return null;
                      const n = typeof v === 'number' ? v : parseFloat(String(v));
                      return isNaN(n) ? null : n;
                    });
                    const trend = getTrend(chartVals);
                    return (
                      <div key={String(hc.field)} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 14px 10px', borderTop: `3px solid ${hc.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{hc.label}</div>
                            <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>{hc.labelTH}</div>
                          </div>
                          {trend && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: trend.up ? '#16a34a' : '#dc2626', background: trend.up ? '#f0fdf4' : '#fef2f2', borderRadius: 4, padding: '2px 6px' }}>
                              {trend.up ? '▲' : '▼'} {trend.pct}%
                            </span>
                          )}
                        </div>
                        <Line data={lineData(hc.field, hc.color)} options={LINE_OPTS} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── BODY COMPOSITION ── */}
          {HIST.length >= 1 && (
            <div id="scoutBodySection" className="surface mb-4">
              <div className="section-hd">
                <i className="bi bi-person-fill" style={{ color:'#34d399' }}/> Body Composition
                <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:4 }}>องค์ประกอบร่างกาย</span>
              </div>

              {/* ── Snapshot KPI row ── */}
              {(() => {
                const w  = parseFloat(String(latest.Weight  || ''));
                const h  = parseFloat(String(latest.Height  || ''));
                const fp = parseFloat(String(latest.Fat     || ''));
                const mp = parseFloat(String(latest.Muscle  || ''));
                const bmi = calcBMI(String(latest.Height||''), String(latest.Weight||''));
                const fatKg = (w && fp) ? Math.round(w * fp / 100 * 10) / 10 : null;
                const musKg = (w && mp) ? Math.round(w * mp / 100 * 10) / 10 : null;

                const KPI = [
                  { label:'ส่วนสูง',    icon:'bi-arrows-vertical',   val: h  ? `${h} cm`  : '—', color:'#38bdf8', note:'' },
                  { label:'น้ำหนัก',    icon:'bi-bag-fill',           val: w  ? `${w} kg`  : '—', color:'#818cf8', note:'' },
                  { label:'% ไขมัน',    icon:'bi-droplet-fill',       val: fp ? `${fp}%`   : '—', color:'#fb923c', note: fp ? (fp <= 10 ? 'ต่ำมาก' : fp <= 15 ? 'นักกีฬา' : fp <= 20 ? 'ปกติ' : 'สูง') : '' },
                  { label:'% กล้ามเนื้อ',icon:'bi-lightning-fill',   val: mp ? `${mp}%`   : '—', color:'#4ade80', note: mp ? (mp >= 45 ? 'สูงมาก' : mp >= 38 ? 'ดี' : mp >= 32 ? 'ปกติ' : 'ต่ำ') : '' },
                  { label:'มวลไขมัน',   icon:'bi-droplet-half',      val: fatKg ? `${fatKg} kg` : '—', color:'#fbbf24', note:'' },
                  { label:'มวลกล้ามเนื้อ',icon:'bi-person-arms-up', val: musKg ? `${musKg} kg` : '—', color:'#34d399', note:'' },
                  { label:'BMI',         icon:'bi-calculator-fill',   val: bmi,  color:'#c084fc', note: bmi !== '—' ? (parseFloat(bmi) < 18.5 ? 'ต่ำ' : parseFloat(bmi) < 25 ? 'ปกติ' : parseFloat(bmi) < 30 ? 'เกิน' : 'อ้วน') : '' },
                ];
                return (
                  <div id="scoutBodyKPI" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:10, marginBottom:20 }}>
                    {KPI.map(k => (
                      <div key={k.label} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 12px 10px', borderTop:`3px solid ${k.color}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                          <i className={`bi ${k.icon}`} style={{ color:k.color, fontSize:'0.8rem' }}/>
                          <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</span>
                        </div>
                        <div style={{ fontSize:'1.15rem', fontWeight:900, color:'#1e293b' }}>{k.val}</div>
                        {k.note && <div style={{ fontSize:'0.6rem', fontWeight:700, color:k.color, marginTop:2 }}>{k.note}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Visual composition bar ── */}
              {(() => {
                const fp = parseFloat(String(latest.Fat    || ''));
                const mp = parseFloat(String(latest.Muscle || ''));
                if (!fp && !mp) return null;
                const other = Math.max(0, 100 - fp - mp);
                const segments = [
                  { label:`กล้ามเนื้อ ${mp}%`, pct:mp,    color:'#4ade80' },
                  { label:`ไขมัน ${fp}%`,      pct:fp,    color:'#fbbf24' },
                  { label:`อื่นๆ ${other.toFixed(0)}%`, pct:other, color:'#e2e8f0' },
                ];
                return (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#94a3b8', marginBottom:6 }}>สัดส่วนองค์ประกอบร่างกาย</div>
                    <div style={{ display:'flex', height:22, borderRadius:8, overflow:'hidden', gap:1.5 }}>
                      {segments.map((s, i) => (
                        s.pct > 0 && <div key={i} title={s.label} style={{ width:`${s.pct}%`, background:s.color, transition:'width 0.6s ease', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {s.pct >= 8 && <span style={{ fontSize:'0.55rem', fontWeight:800, color: i===2?'#94a3b8':'rgba(0,0,0,0.55)' }}>{s.pct}%</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:14, marginTop:6 }}>
                      {segments.map((s, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:s.color }}/>
                          <span style={{ fontSize:'0.62rem', color:'#64748b' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Trend charts ── */}
              {HIST.length >= 2 && (() => {
                const fatMassData  = filteredHIST.map(r => {
                  const w = parseFloat(String(r.Weight||'')), f = parseFloat(String(r.Fat||''));
                  return (w && f) ? Math.round(w*f/100*10)/10 : null;
                });
                const muscleMassData = filteredHIST.map(r => {
                  const w = parseFloat(String(r.Weight||'')), m = parseFloat(String(r.Muscle||''));
                  return (w && m) ? Math.round(w*m/100*10)/10 : null;
                });
                function customLineData(data: (number|null)[], color: string) {
                  return {
                    labels: histLabels,
                    datasets: [{ data, borderColor:color, backgroundColor:color+'18', tension:0.35, pointRadius:4, pointHoverRadius:6, pointBackgroundColor:color, fill:true, borderWidth:2 }],
                  };
                }
                function trendBadge(vals: (number|null)[], higherBetter: boolean) {
                  const valid = vals.filter(v=>v!==null) as number[];
                  if (valid.length < 2) return null;
                  const pct = Math.round(((valid[valid.length-1]-valid[0])/Math.abs(valid[0]))*100);
                  if (!pct) return null;
                  const up = pct > 0;
                  const good = higherBetter ? up : !up;
                  return (
                    <span style={{ fontSize:'0.65rem', fontWeight:700, color: good?'#16a34a':'#dc2626', background: good?'#f0fdf4':'#fef2f2', borderRadius:4, padding:'2px 6px' }}>
                      {up?'▲':'▼'} {Math.abs(pct)}%
                    </span>
                  );
                }
                const BODY_CHARTS = [
                  { field:'Height'  as keyof TestRecord, label:'ส่วนสูง',      unit:'cm',  color:'#38bdf8', higherBetter:true,  customData:null },
                  { field:'Weight'  as keyof TestRecord, label:'น้ำหนัก',      unit:'kg',  color:'#818cf8', higherBetter:null,  customData:null },
                  { field:'Muscle'  as keyof TestRecord, label:'% กล้ามเนื้อ', unit:'%',   color:'#4ade80', higherBetter:true,  customData:null },
                  { field:'Fat'     as keyof TestRecord, label:'% ไขมัน',      unit:'%',   color:'#fb923c', higherBetter:false, customData:null },
                  { field:null, label:'มวลกล้ามเนื้อ', unit:'kg', color:'#34d399', higherBetter:true,  customData:muscleMassData },
                  { field:null, label:'มวลไขมัน',     unit:'kg', color:'#fbbf24', higherBetter:false, customData:fatMassData  },
                ];
                return (
                  <div id="scoutBodyTrends" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {BODY_CHARTS.map((bc, i) => {
                      const vals = bc.customData ?? filteredHIST.map(r => {
                        const v = r[bc.field!]; if (!v) return null;
                        const n = parseFloat(String(v)); return isNaN(n) ? null : n;
                      });
                      const latest_val = vals.filter(v=>v!==null).slice(-1)[0];
                      const data = bc.customData ? customLineData(bc.customData, bc.color) : lineData(bc.field!, bc.color);
                      return (
                        <div key={i} style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:12, padding:'12px 12px 8px', borderTop:`3px solid ${bc.color}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                            <div>
                              <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#334155' }}>{bc.label}</div>
                              <div style={{ fontSize:'0.6rem', color:'#94a3b8' }}>{latest_val != null ? `ล่าสุด: ${latest_val} ${bc.unit}` : 'ไม่มีข้อมูล'}</div>
                            </div>
                            {bc.higherBetter !== null && trendBadge(vals, bc.higherBetter)}
                          </div>
                          <Line data={data} options={LINE_OPTS}/>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TECHNICAL SKILL ASSESSMENT ── */}
          <div id="scoutSkillSection" className="surface mb-4">
            <div className="section-hd" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>
                <i className="bi bi-bullseye" style={{ color:'#38bdf8' }}/> Technical Skill
                <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:6 }}>ทักษะฟุตบอล</span>
              </span>
              <button className="btn-outline btn-sm" onClick={() => onNavigate('skill', selectedId)}>
                <i className="bi bi-pencil-square me-1"/>ประเมินทักษะ
              </button>
            </div>

            {!latestSkill ? (
              <div style={{ textAlign:'center', padding:'28px 16px', color:'#94a3b8' }}>
                <i className="bi bi-bullseye" style={{ fontSize:'2rem', display:'block', marginBottom:8, color:'#cbd5e1' }}/>
                <p style={{ margin:0, fontSize:'0.875rem' }}>ยังไม่มีข้อมูลทักษะ — กดปุ่ม "ประเมินทักษะ" เพื่อเพิ่ม</p>
              </div>
            ) : (() => {
              const SK_CATS = [
                { label:'Ball Control', labelTH:'การควบคุมบอล', score: latestSkill.scoreBallControl, color:'#38bdf8', icon:'bi-circle-fill',
                  skills: [
                    { key:'skFirstTouch',   label:'First Touch',             val: latestSkill.skFirstTouch },
                    { key:'skBallControl',  label:'Ball Control',            val: latestSkill.skBallControl },
                    { key:'skReceiving',    label:'Receiving',               val: latestSkill.skReceiving },
                    { key:'skWeakFoot',     label:'Weak Foot Control',       val: latestSkill.skWeakFoot },
                    { key:'skPressureCtrl', label:'Under Pressure',          val: latestSkill.skPressureCtrl },
                  ]},
                { label:'Passing', labelTH:'การส่งบอล', score: latestSkill.scorePassing, color:'#34d399', icon:'bi-send-fill',
                  skills: [
                    { key:'skPassAccuracy', label:'Passing Accuracy',        val: latestSkill.skPassAccuracy },
                    { key:'skShortPass',    label:'Short Pass',              val: latestSkill.skShortPass },
                    { key:'skLongPass',     label:'Long Pass',               val: latestSkill.skLongPass },
                    { key:'skThroughPass',  label:'Through Pass',            val: latestSkill.skThroughPass },
                    { key:'skOneTouch',     label:'One-touch Pass',          val: latestSkill.skOneTouch },
                    { key:'skPassPressure', label:'Passing Under Pressure',  val: latestSkill.skPassPressure },
                  ]},
                { label:'Dribbling', labelTH:'การเลี้ยงบอล', score: latestSkill.scoreDribbling, color:'#f59e0b', icon:'bi-lightning-fill',
                  skills: [
                    { key:'skDribbleSpeed',    label:'Dribbling Speed',      val: latestSkill.skDribbleSpeed },
                    { key:'skDirectionChange', label:'Change of Direction',  val: latestSkill.skDirectionChange },
                    { key:'skBeatOpp',         label:'Beat Opponent',        val: latestSkill.skBeatOpp },
                    { key:'skTightSpace',      label:'Tight Space Control',  val: latestSkill.skTightSpace },
                    { key:'skSkillExec',       label:'Skill Execution',      val: latestSkill.skSkillExec },
                  ]},
                { label:'Shooting', labelTH:'การยิงประตู', score: latestSkill.scoreShooting, color:'#f472b6', icon:'bi-bullseye',
                  skills: [
                    { key:'skShootAccuracy',  label:'Shooting Accuracy',        val: latestSkill.skShootAccuracy },
                    { key:'skShotPower',      label:'Shot Power',               val: latestSkill.skShotPower },
                    { key:'skWeakFinish',     label:'Weak Foot Finishing',      val: latestSkill.skWeakFinish },
                    { key:'skFinishPressure', label:'Finishing Under Pressure', val: latestSkill.skFinishPressure },
                    { key:'skFirstTime',      label:'First-time Finish',        val: latestSkill.skFirstTime },
                  ]},
                { label:'Tactical IQ', labelTH:'สติปัญญาทางยุทธวิธี', score: latestSkill.scoreTactical, color:'#a78bfa', icon:'bi-cpu-fill',
                  skills: [
                    { key:'skPositioning', label:'Positioning',              val: latestSkill.skPositioning },
                    { key:'skScanning',    label:'Scanning',                 val: latestSkill.skScanning },
                    { key:'skDecision',    label:'Decision Making',          val: latestSkill.skDecision },
                    { key:'skOffBall',     label:'Off-ball Movement',        val: latestSkill.skOffBall },
                    { key:'skSpatial',     label:'Spatial Awareness',        val: latestSkill.skSpatial },
                    { key:'skTransition',  label:'Transition Understanding', val: latestSkill.skTransition },
                  ]},
              ];
              const SKL: Record<number,{label:string;color:string;bg:string}> = {
                0:{label:'—',      color:'#94a3b8',bg:'#f1f5f9'},
                1:{label:'ต่ำมาก', color:'#dc2626',bg:'#fef2f2'},
                2:{label:'พัฒนา',  color:'#ea580c',bg:'#fff7ed'},
                3:{label:'ปานกลาง',color:'#ca8a04',bg:'#fefce8'},
                4:{label:'ดี',     color:'#16a34a',bg:'#f0fdf4'},
                5:{label:'ยอดเยี่ยม',color:'#0284c7',bg:'#eff6ff'},
              };
              const total = latestSkill.scoreTotal;
              const scoreColor = total >= 80 ? '#10b981' : total >= 60 ? '#38bdf8' : total >= 40 ? '#f59e0b' : '#ef4444';
              const assessedDate = new Date(latestSkill.assessedAt).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});

              return (
                <div>
                  {/* ── Top: total score + radar + meta ── */}
                  <div style={{ display:'flex', gap:20, marginBottom:20, flexWrap:'wrap', alignItems:'flex-start' }}>
                    {/* Score + meta */}
                    <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:160 }}>
                      <div style={{ textAlign:'center', background:'var(--bg)', borderRadius:14, padding:'16px 24px', border:`2px solid ${scoreColor}33` }}>
                        <div style={{ fontSize:'3rem', fontWeight:900, color:scoreColor, lineHeight:1 }}>{total}</div>
                        <div style={{ fontSize:'0.6rem', fontWeight:700, color:'#94a3b8', letterSpacing:1.5, textTransform:'uppercase', marginTop:4 }}>TECHNICAL SCORE</div>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'#94a3b8', lineHeight:1.8 }}>
                        <div><i className="bi bi-calendar2 me-1"/>{assessedDate}</div>
                        {latestSkill.assessedBy && <div><i className="bi bi-person me-1"/>{latestSkill.assessedBy}</div>}
                        {latestSkill.season && <div><i className="bi bi-bookmark me-1"/>{latestSkill.season}</div>}
                      </div>
                    </div>
                    {/* Radar */}
                    <div style={{ flex:1, minWidth:200, maxWidth:280 }}>
                      <Radar data={{
                        labels: SK_CATS.map(c => c.labelTH),
                        datasets:[{ label:'Score', data: SK_CATS.map(c => c.score), backgroundColor:'rgba(56,189,248,0.15)', borderColor:'#38bdf8', pointBackgroundColor: SK_CATS.map(c => c.color), pointRadius:4, borderWidth:2 }],
                      }} options={{ responsive:true, scales:{ r:{ min:0, max:100, ticks:{ stepSize:25, font:{size:9} }, pointLabels:{ font:{size:10,weight:'bold'} } } }, plugins:{ legend:{ display:false } } }}/>
                    </div>
                    {/* Category bars */}
                    <div style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', gap:8 }}>
                      {SK_CATS.map(c => (
                        <div key={c.label}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                            <i className={`bi ${c.icon}`} style={{ color:c.color, fontSize:'0.7rem' }}/>
                            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text)' }}>{c.label}</span>
                            <span style={{ marginLeft:'auto', fontSize:'0.75rem', fontWeight:900, color:c.color }}>{c.score||'—'}</span>
                          </div>
                          <div style={{ height:7, borderRadius:6, background:'var(--bg)', overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:6, background:c.color, width:`${c.score}%`, transition:'width 0.6s' }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── All skills by category ── */}
                  <div id="scoutSkillGrid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                    {SK_CATS.map(cat => (
                      <div key={cat.label} style={{ background:'var(--bg)', borderRadius:12, overflow:'hidden', border:`1px solid ${cat.color}30` }}>
                        {/* Category header */}
                        <div style={{ background:`${cat.color}18`, padding:'8px 14px', display:'flex', alignItems:'center', gap:7, borderBottom:`1px solid ${cat.color}30` }}>
                          <i className={`bi ${cat.icon}`} style={{ color:cat.color, fontSize:'0.85rem' }}/>
                          <span style={{ fontWeight:800, fontSize:'0.82rem', color:cat.color }}>{cat.label}</span>
                          <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginLeft:2 }}>{cat.labelTH}</span>
                          <span style={{ marginLeft:'auto', fontWeight:900, fontSize:'0.9rem', color:cat.color }}>{cat.score||'—'}</span>
                        </div>
                        {/* Skills list */}
                        <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:7 }}>
                          {cat.skills.map(sk => {
                            const v = sk.val || 0;
                            const sl = SKL[v] || SKL[0];
                            return (
                              <div key={sk.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                                {/* Dots 1-5 */}
                                <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                                  {[1,2,3,4,5].map(d => (
                                    <div key={d} style={{ width:10, height:10, borderRadius:'50%', background: d <= v ? sl.color : 'var(--border)', transition:'background 0.2s' }}/>
                                  ))}
                                </div>
                                {/* Label */}
                                <span style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text)', flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sk.label}</span>
                                {/* Badge */}
                                <span style={{ fontSize:'0.6rem', fontWeight:800, color:sl.color, background:sl.bg, borderRadius:4, padding:'1px 5px', flexShrink:0, whiteSpace:'nowrap' }}>{v > 0 ? sl.label : '—'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {latestSkill.notes && (
                    <div style={{ marginTop:14, background:'var(--bg)', borderRadius:8, padding:'10px 14px', fontSize:'0.78rem', color:'var(--text-muted)', borderLeft:`3px solid ${scoreColor}` }}>
                      <i className="bi bi-chat-left-text me-1"/>"{latestSkill.notes}"
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── INDIVIDUAL REPORT ── */}
          <div id="scoutIDPSection" className="surface mb-4">
            <div className="section-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><i className="bi bi-clipboard2-check-fill" style={{ color: '#818cf8' }} /> Individual Report <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>รายงานรายบุคคล</span> <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>Ekkono Method</span></span>
              {irLoading && <span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2 }} />}
              {!irLoading && irHistory.length > 0 && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{irHistory.length} session{irHistory.length > 1 ? 's' : ''}</span>}
            </div>

            {!irLoading && irHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                <i className="bi bi-clipboard2-x" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 10, color: '#cbd5e1' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>ยังไม่มีข้อมูล Individual Report สำหรับนักกีฬาคนนี้</p>
              </div>
            )}

            {!irLoading && irHistory.length > 0 && (() => {
              const latest = irHistory[0];
              const overall = Number(latest.OverallIRScore) || 0;
              const og = irGrade(overall);

              return (
                <>
                  {/* ── Session info ── */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: '10px 16px', background: '#f8fafc', borderRadius: 10, fontSize: '0.82rem', color: '#475569', alignItems: 'center' }}>
                    {latest.Season && <span style={{ fontWeight: 700, color: '#334155' }}><i className="bi bi-calendar3 me-1" />{latest.Season}</span>}
                    {latest.Period && <span><i className="bi bi-clock me-1" />{latest.Period}</span>}
                    {latest.Coach  && <span><i className="bi bi-person-fill me-1" />โค้ช: {latest.Coach}</span>}
                    {latest.Timestamp && <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '0.75rem' }}>📅 {(()=>{try{return new Date(String(latest.Timestamp)).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});}catch{return String(latest.Timestamp).split('T')[0];}})()}</span>}
                  </div>

                  {/* ── Overall Summary Banner ── */}
                  {(()=>{
                    const pG=(p:number)=>{
                      if(p>=90)return{emoji:'🌟',th:'ยอดเยี่ยม',bg:'#f0fdf4',border:'#bbf7d0',color:'#15803d'};
                      if(p>=75)return{emoji:'✅',th:'ดี',bg:'#eff6ff',border:'#bfdbfe',color:'#1d4ed8'};
                      if(p>=50)return{emoji:'👍',th:'ปานกลาง',bg:'#fffbeb',border:'#fde68a',color:'#b45309'};
                      if(p>=30)return{emoji:'⚠️',th:'ต้องพัฒนา',bg:'#fff7ed',border:'#fed7aa',color:'#c2410c'};
                      return     {emoji:'🔴',th:'ต่ำมาก',bg:'#fef2f2',border:'#fecaca',color:'#dc2626'};
                    };
                    const g=pG(overall);
                    return(
                      <div style={{background:g.bg,border:`2px solid ${g.border}`,borderRadius:14,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:14}}>
                        <div style={{fontSize:'2.8rem',lineHeight:1}}>{g.emoji}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'1.1rem',fontWeight:800,color:g.color}}>{athlete?.Name?.split(' ')[0]||'นักกีฬา'} อยู่ในระดับ &ldquo;{g.th}&rdquo;</div>
                          <div style={{fontSize:'0.8rem',color:'#475569',marginTop:4}}>คะแนนรวมทุกด้าน {overall}% · {irHistory.length} ครั้งที่ประเมิน</div>
                        </div>
                        <div style={{textAlign:'center',background:'white',borderRadius:10,padding:'8px 14px',border:`1px solid ${g.border}`}}>
                          <div style={{fontSize:'1.8rem',fontWeight:900,color:g.color,lineHeight:1}}>{overall}</div>
                          <div style={{fontSize:'0.6rem',color:'#94a3b8',fontWeight:700}}>/ 100</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── 3 Area Cards ── */}
                  <div className="scout-ir-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                    {[
                      {key:'b',label:'🧠 พฤติกรรม',desc:'วินัย ความพยายาม ทัศนคติ',pct:Number(latest.BehaviourScore)||0,color:'#818cf8'},
                      {key:'l',label:'🌿 วิถีชีวิต', desc:'การนอน อาหาร สุขภาพ',     pct:Number(latest.LifestyleScore)||0, color:'#34d399'},
                      {key:'t',label:'⚽ ทักษะ',    desc:'เทคนิค กลยุทธ์ สมรรถภาพ', pct:Number(latest.TechnicalScore)||0,color:'#f472b6'},
                    ].map(c=>{
                      const pG=(p:number)=>{
                        if(p>=90)return{emoji:'🌟',th:'ยอดเยี่ยม',border:'#bbf7d0',color:'#15803d'};
                        if(p>=75)return{emoji:'✅',th:'ดี',         border:'#bfdbfe',color:'#1d4ed8'};
                        if(p>=50)return{emoji:'👍',th:'ปานกลาง',  border:'#fde68a',color:'#b45309'};
                        if(p>=30)return{emoji:'⚠️',th:'ต้องพัฒนา',border:'#fed7aa',color:'#c2410c'};
                        return     {emoji:'🔴',th:'ต่ำมาก',      border:'#fecaca',color:'#dc2626'};
                      };
                      const g=pG(c.pct);
                      return(
                        <div key={c.key} style={{background:'white',border:`2px solid ${g.border}`,borderRadius:12,padding:'14px',textAlign:'center'}}>
                          <div style={{fontSize:'1.6rem',marginBottom:4}}>{g.emoji}</div>
                          <div style={{fontWeight:800,fontSize:'0.88rem',color:'#0f172a',marginBottom:2}}>{c.label}</div>
                          <div style={{fontSize:'0.65rem',color:'#94a3b8',marginBottom:8}}>{c.desc}</div>
                          <div style={{fontSize:'1.6rem',fontWeight:900,color:g.color,lineHeight:1}}>{c.pct}%</div>
                          <div style={{fontSize:'0.78rem',fontWeight:700,color:g.color,marginTop:3}}>{g.th}</div>
                          <div style={{marginTop:8,background:'#f1f5f9',borderRadius:20,height:6,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${c.pct}%`,background:c.color,borderRadius:20}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── 3 Sections Detail (parent-friendly) ── */}
                  {(()=>{
                    const secDesc:Record<string,string>={behaviour:'ด้านจิตใจ วินัย และการอยู่ร่วมกับผู้อื่น',lifestyle:'พฤติกรรมดูแลตัวเองนอกสนาม',technical:'ความสามารถในการเล่นฟุตบอล'};
                    const iG=(v:number)=>{
                      if(v>=5)return{emoji:'🌟',label:'ยอดเยี่ยม',color:'#15803d'};
                      if(v>=4)return{emoji:'✅',label:'ดี',         color:'#1d4ed8'};
                      if(v>=3)return{emoji:'👍',label:'ปานกลาง',  color:'#b45309'};
                      if(v>=2)return{emoji:'⚠️',label:'พัฒนาได้', color:'#c2410c'};
                      if(v>=1)return{emoji:'🔴',label:'ต้องปรับ', color:'#dc2626'};
                      return     {emoji:'—', label:'ยังไม่ประเมิน',color:'#94a3b8'};
                    };
                    return(
                      <div className="scout-ir-3col" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                        {IR_SECTIONS.map(sec=>(
                          <div key={sec.key} style={{background:'#f8fafc',border:`1px solid ${sec.color}40`,borderRadius:12,padding:14,borderTop:`3px solid ${sec.color}`}}>
                            <div style={{marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f1f5f9'}}>
                              <div style={{fontWeight:800,fontSize:'0.9rem',color:'#0f172a'}}><i className={`bi ${sec.icon} me-2`} style={{color:sec.color}}/>{sec.labelTH}</div>
                              <div style={{fontSize:'0.65rem',color:'#94a3b8',marginTop:2}}>{secDesc[sec.key]||''}</div>
                            </div>
                            {sec.items.map(item=>{
                              const val=Number(latest[item.field])||0;
                              const ig=iG(val);
                              return(
                                <div key={String(item.field)} style={{marginBottom:8,padding:'8px 10px',borderRadius:8,background:val>0?'white':'#f8fafc',border:'1px solid #f1f5f9'}}>
                                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:val>0?5:0}}>
                                    <div style={{fontWeight:700,fontSize:'0.8rem',color:'#334155'}}>{item.labelTH}</div>
                                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                                      <span style={{fontSize:'1rem'}}>{ig.emoji}</span>
                                      <span style={{fontSize:'0.72rem',fontWeight:700,color:ig.color}}>{val>0?ig.label:'—'}</span>
                                    </div>
                                  </div>
                                  {val>0&&<div style={{display:'flex',gap:3}}>{[1,2,3,4,5].map(n=><div key={n} style={{flex:1,height:5,borderRadius:10,background:val>=n?irScoreColor(val):'#e2e8f0'}}/>)}</div>}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── Comments ── */}
                  {(latest.GoodLevel || latest.ToImprove || latest.Comments) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
                      {latest.GoodLevel && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}><i className="bi bi-check-circle-fill me-1" />สิ่งที่ดี</div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#166534' }}>{latest.GoodLevel}</p>
                        </div>
                      )}
                      {latest.ToImprove && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}><i className="bi bi-arrow-up-circle-fill me-1" />สิ่งที่ต้องพัฒนา</div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e' }}>{latest.ToImprove}</p>
                        </div>
                      )}
                      {latest.Comments && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}><i className="bi bi-chat-text-fill me-1" />หมายเหตุโค้ช</div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af' }}>{latest.Comments}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── IR Trend (if 2+ sessions) ── */}
                  {irHistory.length >= 2 && (() => {
                    const rev = [...irHistory].reverse();
                    const labels = rev.map((r, i) => String(r.Timestamp || '').split(' ')[0] || `#${i+1}`);
                    const mkLine = (field: keyof IRReport, color: string) => ({
                      labels,
                      datasets: [{ data: rev.map(r => Number(r[field]) || 0), borderColor: color, backgroundColor: color + '18', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 }],
                    });
                    const lineOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 8 } } }, y: { min: 0, max: 100, ticks: { font: { size: 8 }, callback: (v: number | string) => `${v}%` } } } };
                    return (
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: 10 }}><i className="bi bi-graph-up me-2" />IR Trend ({irHistory.length} sessions)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                          {[
                            { label: 'Behaviour', field: 'BehaviourScore' as keyof IRReport, color: '#818cf8' },
                            { label: 'Lifestyle',  field: 'LifestyleScore'  as keyof IRReport, color: '#34d399' },
                            { label: 'Technical',  field: 'TechnicalScore'  as keyof IRReport, color: '#f472b6' },
                            { label: 'Overall',    field: 'OverallIRScore'  as keyof IRReport, color: '#38bdf8' },
                          ].map(c => (
                            <div key={c.label} style={{ background: '#f8fafc', border: `1px solid #e2e8f0`, borderTop: `3px solid ${c.color}`, borderRadius: 10, padding: '10px 10px 8px' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>{c.label}</div>
                              <Line data={mkLine(c.field, c.color)} options={lineOpts as Parameters<typeof Line>[0]['options']} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Overall grade badge */}
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#0f172a', borderRadius: 10 }}>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{overall}%</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: og.color }}>{og.label}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Overall IR Score · คะแนนรวมรายบุคคล</div>
                    </div>
                    <div style={{ marginLeft: 'auto', flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${overall}%`, background: 'linear-gradient(90deg,#38bdf8,#818cf8)', borderRadius: 20 }} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── ATTENDANCE ── */}
          {attendanceRecs.length > 0 && (() => {
            const _attendId = 'scoutAttendSection';
            const total   = attendanceRecs.length;
            const present = attendanceRecs.filter(r => r.status === 'present').length;
            const late    = attendanceRecs.filter(r => r.status === 'late').length;
            const excuse  = attendanceRecs.filter(r => r.status === 'excuse').length;
            const absent  = attendanceRecs.filter(r => r.status === 'absent').length;
            const rate    = Math.round((present + late) / total * 100);
            const rateColor = rate >= 90 ? '#10b981' : rate >= 75 ? '#38bdf8' : rate >= 60 ? '#f59e0b' : '#ef4444';
            const recent = [...attendanceRecs].slice(0, 15);
            const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
              present:{label:'มา',  color:'#16a34a',bg:'#f0fdf4'},
              absent: {label:'ขาด', color:'#dc2626',bg:'#fef2f2'},
              late:   {label:'สาย', color:'#d97706',bg:'#fffbeb'},
              excuse: {label:'ลา',  color:'#2563eb',bg:'#eff6ff'},
            };
            return (
              <div id="scoutAttendSection" className="surface mb-4">
                <div className="section-hd" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span><i className="bi bi-check2-square me-2" style={{ color:'#38bdf8' }}/>การเข้าร่วมฝึกซ้อม <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:4 }}>Attendance</span></span>
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:rateColor }}>{rate}% Attendance Rate</span>
                </div>
                {/* Summary stats */}
                <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                  {[
                    { label:'รวม',  val:total,   color:'#38bdf8', icon:'bi-calendar3' },
                    { label:'มา',   val:present, color:'#16a34a', icon:'bi-check-circle-fill' },
                    { label:'สาย',  val:late,    color:'#d97706', icon:'bi-clock-fill' },
                    { label:'ลา',   val:excuse,  color:'#2563eb', icon:'bi-file-text-fill' },
                    { label:'ขาด',  val:absent,  color:'#dc2626', icon:'bi-x-circle-fill' },
                  ].map(s => (
                    <div key={s.label} style={{ flex:1, minWidth:70, background:'var(--bg)', borderRadius:10, padding:'10px 12px', textAlign:'center', border:`1px solid ${s.color}22` }}>
                      <i className={`bi ${s.icon}`} style={{ color:s.color, fontSize:'1rem', display:'block', marginBottom:4 }}/>
                      <div style={{ fontWeight:900, fontSize:'1.3rem', color:s.color, lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontWeight:700, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                  {/* Rate bar */}
                  <div style={{ flex:2, minWidth:120, background:'var(--bg)', borderRadius:10, padding:'10px 14px', border:`1px solid ${rateColor}22`, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)' }}>Attendance Rate</span>
                      <span style={{ fontWeight:900, color:rateColor }}>{rate}%</span>
                    </div>
                    <div style={{ height:8, borderRadius:6, background:'#f1f5f9', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:6, background:rateColor, width:`${rate}%`, transition:'width 0.6s' }}/>
                    </div>
                  </div>
                </div>
                {/* Recent sessions dots */}
                <div>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>15 Session ล่าสุด (ซ้ายสุด = เก่าสุด)</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {recent.reverse().map((r, i) => {
                      const cfg = STATUS_CFG[r.status] || STATUS_CFG.absent;
                      return (
                        <div key={i} title={`${r.sessionDate} — ${cfg.label}`} style={{ width:28, height:28, borderRadius:7, background:cfg.bg, border:`1.5px solid ${cfg.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:800, color:cfg.color }}>
                          {cfg.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── WELLNESS ── */}
          {wellnessRecs.length > 0 && (() => {
            const recent = wellnessRecs.slice(0, 10);
            const avgWS  = Math.round(recent.reduce((s,r) => s + (r.wellnessScore||0), 0) / recent.length);
            const wsColor = avgWS >= 80 ? '#10b981' : avgWS >= 60 ? '#38bdf8' : avgWS >= 40 ? '#f59e0b' : '#ef4444';
            const WFIELDS = [
              { key:'fatigue'      as keyof typeof recent[0], label:'สดชื่น',  icon:'⚡' },
              { key:'sleepQuality' as keyof typeof recent[0], label:'นอน',     icon:'😴' },
              { key:'soreness'     as keyof typeof recent[0], label:'ปวดเมื่อย',icon:'💪' },
              { key:'stress'       as keyof typeof recent[0], label:'เครียด',  icon:'🧠' },
              { key:'mood'         as keyof typeof recent[0], label:'อารมณ์',  icon:'😊' },
            ];
            const latestW = recent[0];
            return (
              <div id="scoutWellnessSection" className="surface mb-4">
                <div className="section-hd" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span><i className="bi bi-heart-pulse-fill me-2" style={{ color:'#10b981' }}/>Wellness Check <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:4 }}>สภาพก่อนซ้อม</span></span>
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:wsColor }}>เฉลี่ย {avgWS}%</span>
                </div>
                {/* Latest wellness detail */}
                <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                  <div style={{ background:'var(--bg)', borderRadius:12, padding:'12px 16px', textAlign:'center', border:`2px solid ${wsColor}33`, minWidth:90 }}>
                    <div style={{ fontSize:'2.2rem', fontWeight:900, color:wsColor, lineHeight:1 }}>{latestW.wellnessScore}</div>
                    <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:700, marginTop:4 }}>ล่าสุด</div>
                  </div>
                  {WFIELDS.map(f => {
                    const v = Number(latestW[f.key]) || 0;
                    const vc = v <= 2 ? '#ef4444' : v === 3 ? '#f59e0b' : '#10b981';
                    return (
                      <div key={f.key} style={{ flex:1, minWidth:64, background:'var(--bg)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:'1.1rem', marginBottom:3 }}>{f.icon}</div>
                        <div style={{ fontWeight:900, fontSize:'1.2rem', color:vc, lineHeight:1 }}>{v||'—'}</div>
                        <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', fontWeight:700, marginTop:2 }}>{f.label}</div>
                        <div style={{ display:'flex', gap:2, justifyContent:'center', marginTop:4 }}>
                          {[1,2,3,4,5].map(n => <div key={n} style={{ width:6, height:6, borderRadius:'50%', background: n <= v ? vc : '#e2e8f0' }}/>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Wellness trend */}
                <div>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>แนวโน้ม Wellness Score (10 ครั้งล่าสุด)</div>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:50 }}>
                    {[...recent].reverse().map((r, i) => {
                      const h = Math.max(4, (r.wellnessScore || 0) / 100 * 44);
                      const c = (r.wellnessScore||0) >= 80 ? '#10b981' : (r.wellnessScore||0) >= 60 ? '#38bdf8' : (r.wellnessScore||0) >= 40 ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={i} title={`${r.checkDate}: ${r.wellnessScore}%`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                          <div style={{ width:'100%', height:h, borderRadius:4, background:c }}/>
                          <span style={{ fontSize:'0.55rem', color:'var(--text-muted)' }}>{r.wellnessScore}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── TRAINING LOAD / RPE ── */}
          {rpeRecs.length > 0 && (() => {
            const recent = rpeRecs.slice(0, 15);
            const avgRPE  = (recent.reduce((s,r)=>s+r.rpe,0)/recent.length).toFixed(1);
            const avgLoad = Math.round(recent.reduce((s,r)=>s+r.trainingLoad,0)/recent.length);
            const maxLoad = Math.max(...recent.map(r=>r.trainingLoad));
            const RPE_COLOR = (rpe:number) => rpe<=3?'#10b981':rpe<=5?'#f59e0b':rpe<=7?'#f97316':'#ef4444';
            const LOAD_ZONE = (load:number) => load<=150?{label:'ต่ำ',color:'#10b981'}:load<=300?{label:'ปาน',color:'#38bdf8'}:load<=450?{label:'สูง',color:'#f59e0b'}:{label:'มาก',color:'#ef4444'};
            return (
              <div id="scoutRPESection" className="surface mb-4">
                <div className="section-hd" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span><i className="bi bi-speedometer2 me-2" style={{ color:'#f59e0b' }}/>Training Load <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:4 }}>ความหนักการซ้อม</span></span>
                  <div style={{ display:'flex', gap:12 }}>
                    <span style={{ fontSize:'0.75rem', fontWeight:700 }}>RPE เฉลี่ย <strong style={{ color:'#f59e0b' }}>{avgRPE}</strong></span>
                    <span style={{ fontSize:'0.75rem', fontWeight:700 }}>Load เฉลี่ย <strong style={{ color:LOAD_ZONE(avgLoad).color }}>{avgLoad} AU</strong></span>
                  </div>
                </div>
                {/* Load bar chart */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>Training Load ต่อ Session (15 ล่าสุด)</div>
                  <div style={{ display:'flex', gap:5, alignItems:'flex-end', height:60 }}>
                    {[...recent].reverse().map((r, i) => {
                      const h = Math.max(4, (r.trainingLoad / Math.max(maxLoad, 1)) * 54);
                      const rc = RPE_COLOR(r.rpe);
                      const lz = LOAD_ZONE(r.trainingLoad);
                      return (
                        <div key={i} title={`${r.sessionDate} | ${r.sessionName}\nRPE: ${r.rpe} | Load: ${r.trainingLoad} AU`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <div style={{ width:'100%', height:h, borderRadius:'4px 4px 0 0', background:rc }}/>
                          <span style={{ fontSize:'0.52rem', color:lz.color, fontWeight:700 }}>{r.trainingLoad}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Recent sessions table */}
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft:14 }}>วันที่</th>
                        <th>Session</th>
                        <th style={{ textAlign:'center' }}>RPE</th>
                        <th style={{ textAlign:'center' }}>เวลา</th>
                        <th style={{ textAlign:'center' }}>Load (AU)</th>
                        <th style={{ textAlign:'center' }}>ระดับ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.slice(0, 8).map((r, i) => {
                        const rc = RPE_COLOR(r.rpe);
                        const lz = LOAD_ZONE(r.trainingLoad);
                        return (
                          <tr key={i}>
                            <td style={{ paddingLeft:14, fontSize:'0.78rem' }}>{r.sessionDate}</td>
                            <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{r.sessionName}</td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ width:26, height:26, borderRadius:7, background:rc, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.78rem', color:'white' }}>{r.rpe}</span>
                            </td>
                            <td style={{ textAlign:'center', fontSize:'0.78rem' }}>{r.durationMin} นาที</td>
                            <td style={{ textAlign:'center', fontWeight:900, color:lz.color }}>{r.trainingLoad}</td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ background:lz.color+'18', color:lz.color, borderRadius:5, padding:'2px 7px', fontSize:'0.65rem', fontWeight:800 }}>{lz.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── MATCH PERFORMANCE ── */}
          {matchPerf.length > 0 && (() => {
            const apps    = matchPerf.length;
            const goals   = matchPerf.reduce((s, r) => s + (r.goals || 0), 0);
            const assists = matchPerf.reduce((s, r) => s + (r.assists || 0), 0);
            const mins    = matchPerf.reduce((s, r) => s + (r.minutesPlayed || 0), 0);
            const ycards  = matchPerf.reduce((s, r) => s + (r.yellowCards || 0), 0);
            const rcards  = matchPerf.reduce((s, r) => s + (r.redCards || 0), 0);
            const ratingArr = matchPerf.filter(r => r.rating > 0).map(r => r.rating);
            const avgRating = ratingArr.length ? (ratingArr.reduce((s,v)=>s+v,0)/ratingArr.length).toFixed(1) : '—';
            const ratingColor = (v: number) => v >= 8 ? '#10b981' : v >= 6 ? '#38bdf8' : v >= 4 ? '#f59e0b' : '#ef4444';
            const resultColor: Record<string,string> = { W:'#10b981', D:'#f59e0b', L:'#ef4444' };
            const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); } catch { return d; } };
            return (
              <div id="scoutMatchSection" className="surface mb-4">
                <div className="section-hd" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span><i className="bi bi-trophy-fill me-2" style={{ color:'#f59e0b' }}/>Match Performance <span style={{ fontSize:'0.7rem', fontWeight:400, color:'#94a3b8', marginLeft:4 }}>ผลงานในเกม</span></span>
                  <span style={{ fontSize:'0.78rem', fontWeight:900, color:'#f59e0b' }}>{apps} นัด</span>
                </div>
                {/* KPI Summary */}
                <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                  {[
                    { label:'นัดที่ลง',    val:apps,          icon:'bi-calendar-event-fill', color:'#38bdf8' },
                    { label:'ประตู',       val:goals,         icon:'bi-bullseye',             color:'#10b981' },
                    { label:'แอสซิสต์',   val:assists,       icon:'bi-send-fill',            color:'#818cf8' },
                    { label:'นาที',        val:mins,          icon:'bi-stopwatch-fill',       color:'#f472b6' },
                    { label:'ใบเหลือง',   val:ycards,        icon:'bi-square-fill',          color:'#fbbf24' },
                    { label:'ใบแดง',      val:rcards,        icon:'bi-square-fill',          color:'#ef4444' },
                    { label:'Rating เฉลี่ย', val:avgRating,   icon:'bi-star-fill',            color: ratingArr.length ? ratingColor(parseFloat(avgRating)) : '#94a3b8' },
                  ].map(s => (
                    <div key={s.label} style={{ flex:1, minWidth:70, background:'var(--bg)', borderRadius:10, padding:'10px 8px', textAlign:'center', border:`1px solid ${s.color}22` }}>
                      <i className={`bi ${s.icon}`} style={{ color:s.color, fontSize:'0.9rem', display:'block', marginBottom:4 }}/>
                      <div style={{ fontWeight:900, fontSize:'1.3rem', color:s.color, lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', fontWeight:700, marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Match history table */}
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft:14 }}>วันที่</th>
                        <th>คู่แข่ง</th>
                        <th style={{ textAlign:'center' }}>ผล</th>
                        <th style={{ textAlign:'center' }}>นาที</th>
                        <th style={{ textAlign:'center' }}>ประตู</th>
                        <th style={{ textAlign:'center' }}>แอสซิสต์</th>
                        <th style={{ textAlign:'center' }}>ใบ</th>
                        <th style={{ textAlign:'center' }}>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchPerf.slice(0,15).map((r, i) => {
                        const rc = resultColor[r.result] || '#94a3b8';
                        const rt = parseFloat(String(r.rating));
                        return (
                          <tr key={i}>
                            <td style={{ paddingLeft:14, fontSize:'0.78rem' }}>{fmtDate(r.matchDate)}</td>
                            <td style={{ fontSize:'0.8rem', fontWeight:600 }}>{r.opponent || '—'}</td>
                            <td style={{ textAlign:'center' }}>
                              <span style={{ width:26, height:26, borderRadius:7, background:rc+'22', border:`1.5px solid ${rc}`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.75rem', color:rc }}>{r.result||'—'}</span>
                            </td>
                            <td style={{ textAlign:'center', fontSize:'0.8rem' }}>{r.minutesPlayed || 0}</td>
                            <td style={{ textAlign:'center', fontWeight:700, color: r.goals > 0 ? '#10b981' : undefined }}>{r.goals || 0}</td>
                            <td style={{ textAlign:'center', fontWeight:700, color: r.assists > 0 ? '#818cf8' : undefined }}>{r.assists || 0}</td>
                            <td style={{ textAlign:'center' }}>
                              {r.yellowCards > 0 && <span title="ใบเหลือง" style={{ display:'inline-block', width:10, height:14, background:'#fbbf24', borderRadius:2, marginRight:2 }}/>}
                              {r.redCards > 0 && <span title="ใบแดง" style={{ display:'inline-block', width:10, height:14, background:'#ef4444', borderRadius:2 }}/>}
                              {!r.yellowCards && !r.redCards && <span style={{ color:'#cbd5e1', fontSize:'0.7rem' }}>—</span>}
                            </td>
                            <td style={{ textAlign:'center' }}>
                              {rt > 0 ? (
                                <span style={{ width:30, height:30, borderRadius:8, background:ratingColor(rt)+'22', border:`1.5px solid ${ratingColor(rt)}`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.78rem', color:ratingColor(rt) }}>{rt.toFixed(1)}</span>
                              ) : <span style={{ color:'#cbd5e1', fontSize:'0.7rem' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── AI INSIGHTS ── */}
          {latest && Object.values(scores).some(s => s > 0) && (
            <div className="surface mb-4">
              <div className="section-hd" style={{ justifyContent: 'space-between' }}>
                <span><i className="bi bi-robot" style={{ color: '#818cf8' }} /> AI วิเคราะห์สมรรถภาพ <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>powered by Claude</span></span>
                {!aiInsights && !aiLoading && (
                  <button onClick={async () => {
                    setAiLoading(true); setAiError(''); setAiInsights(null);
                    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('scoutToken') || localStorage.getItem('scoutToken')) : null;
                    try {
                      const res = await fetch('/api/ai-insights', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: JSON.stringify({
                          athleteName: athlete?.Name || '',
                          age: age,
                          position: athlete?.Position || '',
                          team: athlete?.Team || '',
                          scores,
                          latest,
                          testCount: HIST.length,
                          rating,
                          irData: irHistory.length > 0 ? {
                            behaviourScore: Number(irHistory[0].BehaviourScore) || 0,
                            lifestyleScore: Number(irHistory[0].LifestyleScore) || 0,
                            technicalScore: Number(irHistory[0].TechnicalScore) || 0,
                            goodLevel: String(irHistory[0].GoodLevel || ''),
                            toImprove: String(irHistory[0].ToImprove || ''),
                          } : null,
                        }),
                      });
                      if (res.status === 503) { setAiError('ฟีเจอร์ AI ยังไม่ได้เปิดใช้งาน'); return; }
                      const data = await res.json() as { insights?: typeof aiInsights; error?: string };
                      if (data.insights) setAiInsights(data.insights);
                      else setAiError(data.error || 'ไม่สามารถวิเคราะห์ได้');
                    } catch { setAiError('Connection error'); }
                    finally { setAiLoading(false); }
                  }} className="btn-outline btn-sm" style={{ color: '#818cf8', borderColor: '#818cf8' }}>
                    <i className="bi bi-stars me-1" />วิเคราะห์ด้วย AI
                  </button>
                )}
                {aiInsights && (
                  <button onClick={() => setAiInsights(null)} className="btn-outline btn-sm" style={{ fontSize: '0.7rem' }}>
                    <i className="bi bi-arrow-clockwise me-1" />วิเคราะห์ใหม่
                  </button>
                )}
              </div>

              {aiLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#818cf8' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span className="spinner-ring" style={{ width: 20, height: 20, borderColor: '#818cf8', borderTopColor: 'transparent' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Claude กำลังวิเคราะห์...</span>
                  </div>
                </div>
              )}

              {aiError && !aiLoading && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 10, color: '#dc2626', fontSize: '0.82rem' }}>
                  <i className="bi bi-exclamation-triangle me-2" />{aiError}
                </div>
              )}

              {!aiInsights && !aiLoading && !aiError && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <i className="bi bi-stars" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, color: '#c4b5fd' }} />
                  กด "วิเคราะห์ด้วย AI" เพื่อรับข้อเสนอแนะส่วนตัวจาก Claude
                </div>
              )}

              {aiInsights && (
                <div>
                  {/* Summary */}
                  <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, color: 'white' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>📋 สรุปภาพรวม</div>
                    <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>{aiInsights.summary}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
                    {/* Strengths */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>💪 จุดแข็ง</div>
                      {aiInsights.strengths.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                          <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.4 }}>{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Priorities */}
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>🎯 สิ่งที่ต้องพัฒนา</div>
                      {aiInsights.priorities.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                          <span style={{ color: '#dc2626', flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: '0.8rem', color: '#991b1b', lineHeight: 1.4 }}>{p}</span>
                        </div>
                      ))}
                    </div>

                    {/* Training recommendations */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>⚡ คำแนะนำการฝึก</div>
                      {aiInsights.training.map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                          <span style={{ color: '#2563eb', flexShrink: 0 }}>•</span>
                          <span style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.4 }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parent note */}
                  {aiInsights.parentNote && (
                    <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', marginBottom: 5 }}>👪 สำหรับผู้ปกครอง</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#4c1d95', lineHeight: 1.5 }}>{aiInsights.parentNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TRAINING VIDEOS ── */}
          {weaknesses.length > 0 && (
            <div id="scoutVideoPrint" className="surface mb-4">
              <div className="section-hd"><i className="bi bi-youtube" style={{ color: '#ef4444' }} /> Recommended Training Videos <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>วิดีโอฝึกซ้อมที่แนะนำ</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
                {weaknesses.map(m => {
                  const vid = VIDEO_DB.find(v => v.category === m.key);
                  if (!vid) return null;
                  return (
                    <div key={m.key} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                        <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={`https://www.youtube.com/embed/${vid.id}`} allowFullScreen />
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <i className={`bi ${m.icon}`} style={{ color: m.color, fontSize: '0.85rem' }} />
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1 }}>{DEV_DATA[m.key]?.label}</span>
                          <span style={{ marginLeft: 'auto', background: SCORE_COLORS[scores[m.key]]?.bg, color: SCORE_COLORS[scores[m.key]]?.color, borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>{scores[m.key]}/5</span>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{vid.title}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PARENT REPORT ── */}
      {showParentReport && athlete && (
        <div style={{ position:'fixed', inset:0, zIndex:4000, background:'var(--bg)', overflowY:'auto' }}>
          <ParentReport
            athlete={athlete} user={user} onClose={() => setShowParentReport(false)}
            irHistory={irHistory}
            latestSkill={latestSkill}
            attendanceRecs={attendanceRecs}
            wellnessRecs={wellnessRecs}
            rpeRecs={rpeRecs}
            matchPerf={matchPerf}
          />
        </div>
      )}

      {/* ── QR CODE MODAL ── */}
      {showQRModal && athlete && (
        <div onClick={() => setShowQRModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.78)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 420, textAlign: 'center', maxHeight: '92vh', overflowY: 'auto', padding: '28px 32px', boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h5 style={{ margin: 0, fontWeight: 700 }}><i className="bi bi-qr-code me-2" />QR Profile Card</h5>
              <button className="btn-outline btn-sm" onClick={() => setShowQRModal(false)}><i className="bi bi-x-lg" /></button>
            </div>

            {/* Base URL input */}
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                <i className="bi bi-globe me-1" />URL ของเว็บ (สำหรับ QR)
              </label>
              <input
                className="form-control"
                style={{ fontSize: '0.8rem' }}
                value={qrBaseUrl}
                onChange={e => handleQrBaseChange(e.target.value)}
                placeholder="https://yourapp.vercel.app"
              />
              {qrBaseUrl.includes('localhost') && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: '0.73rem', color: '#f59e0b', textAlign: 'left' }}>
                  <i className="bi bi-exclamation-triangle me-1" />
                  <strong>localhost</strong> ใช้ได้เฉพาะบนคอมเครื่องนี้เท่านั้น — มือถือไม่สามารถ scan ได้
                  <br />ใส่ IP network เช่น <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>http://192.168.x.x:3001</code> หรือ deploy ขึ้น Vercel
                </div>
              )}
            </div>

            {qrDataUrl && (
              <>
                <div style={{ background: '#0f172a', borderRadius: 16, padding: 24, marginBottom: 16, display: 'inline-block' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: 3, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 12 }}>ISP</div>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 220, height: 220, display: 'block', margin: '0 auto', borderRadius: 8 }} />
                  <div style={{ marginTop: 12, fontWeight: 800, color: 'white', fontSize: '1rem' }}>{athlete.Name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{athlete.Team || '—'} · {athlete.Position || '—'}</div>
                  <div style={{ marginTop: 8, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8, padding: '6px 14px', display: 'inline-block' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>{rating}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 4 }}>RATING</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <a href={qrDataUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <i className="bi bi-download" />Download QR
                  </a>
                  <button className="btn-outline" onClick={() => window.open(`${qrBaseUrl.replace(/\/$/,'')}/athlete/${athlete.PlayerID}`, '_blank')}>
                    <i className="bi bi-box-arrow-up-right me-1" />เปิด Profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── GOAL SETTING MODAL ── */}
      {showGoalModal && athlete && (
        <div onClick={() => setShowGoalModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.78)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: '28px 32px', boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h5 style={{ margin: 0, fontWeight: 700 }}><i className="bi bi-flag-fill me-2" style={{ color: '#38bdf8' }} />Set Goals — {athlete.Name}</h5>
              <button className="btn-outline btn-sm" onClick={() => setShowGoalModal(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>กำหนดค่าเป้าหมาย (ตัวเลขจริง ไม่ใช่ score)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {METRICS.map(m => (
                <div key={m.key} style={{ flex: '1 1 180px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`bi ${m.icon}`} style={{ color: m.color }} /> {m.label} ({m.unit})
                  </label>
                  <input type="number" step="0.01" className="form-control" placeholder={`Current: ${latest[m.field] || '—'}`} value={goalDraft[m.key] || ''} onChange={e => setGoalDraft(g => ({ ...g, [m.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-outline" onClick={() => { setGoalDraft({}); saveGoals(athlete.PlayerID, {}); setGoals({}); setShowGoalModal(false); }}>ล้างทั้งหมด</button>
              <button className="btn-primary" onClick={() => { const g = Object.fromEntries(Object.entries(goalDraft).filter(([,v]) => v)); saveGoals(athlete.PlayerID, g); setGoals(g); setShowGoalModal(false); }}>
                <i className="bi bi-check-lg me-1" />บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ATHLETE MODAL ── */}
      {showEditModal && athlete && (
        <EditAthleteModal
          athlete={athlete}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); onRefresh(); }}
        />
      )}

    </div>
  );
}
