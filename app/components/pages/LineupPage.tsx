'use client';

import { useState, useCallback } from 'react';
import { Athlete, Page, User } from '@/lib/types';
import { getScorePoint } from '@/lib/score';

interface Props { athletes: Athlete[]; onNavigate: (page: Page) => void; user?: User; }
type Role = 'GK' | 'DEF' | 'MID' | 'FWD';
type Mode = '11' | '7';
interface FPos { id: string; label: string; role: Role; x: number; y: number; }
interface Formation { id: string; name: string; positions: FPos[]; }
interface SavedLineup { id: string; name: string; formation: string; mode?: Mode; assignments: Record<string, string>; }

/* ── Formations ── */
/* y=91→GK(bottom), y=70→DEF, y=48→MID, y=15→FWD  — wider spacing prevents card overlap */
const FORMATIONS_11: Formation[] = [
  { id:'4-3-3', name:'4-3-3', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LCM',label:'CM',role:'MID',x:28,y:49},{id:'CM',label:'CM',role:'MID',x:50,y:45},{id:'RCM',label:'CM',role:'MID',x:72,y:49},
    {id:'LW',label:'LW',role:'FWD',x:18,y:20},{id:'ST',label:'ST',role:'FWD',x:50,y:12},{id:'RW',label:'RW',role:'FWD',x:82,y:20},
  ]},
  { id:'4-4-2', name:'4-4-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LM',label:'LM',role:'MID',x:14,y:47},{id:'LCM',label:'CM',role:'MID',x:37,y:45},{id:'RCM',label:'CM',role:'MID',x:63,y:45},{id:'RM',label:'RM',role:'MID',x:86,y:47},
    {id:'LS',label:'ST',role:'FWD',x:35,y:16},{id:'RS',label:'ST',role:'FWD',x:65,y:16},
  ]},
  { id:'4-2-3-1', name:'4-2-3-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LDM',label:'DM',role:'MID',x:37,y:57},{id:'RDM',label:'DM',role:'MID',x:63,y:57},
    {id:'LAM',label:'AM',role:'MID',x:21,y:37},{id:'CAM',label:'AM',role:'MID',x:50,y:34},{id:'RAM',label:'AM',role:'MID',x:79,y:37},
    {id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'4-1-4-1', name:'4-1-4-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'CDM',label:'DM',role:'MID',x:50,y:59},{id:'LM',label:'LM',role:'MID',x:14,y:43},{id:'LCM',label:'CM',role:'MID',x:36,y:40},{id:'RCM',label:'CM',role:'MID',x:64,y:40},{id:'RM',label:'RM',role:'MID',x:86,y:43},
    {id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'4-3-2-1', name:'4-3-2-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LCM',label:'CM',role:'MID',x:28,y:52},{id:'CM',label:'CM',role:'MID',x:50,y:49},{id:'RCM',label:'CM',role:'MID',x:72,y:52},
    {id:'LSS',label:'SS',role:'FWD',x:34,y:31},{id:'RSS',label:'SS',role:'FWD',x:66,y:31},{id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'4-5-1', name:'4-5-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LM',label:'LM',role:'MID',x:14,y:47},{id:'LCM',label:'CM',role:'MID',x:31,y:44},{id:'CM',label:'CM',role:'MID',x:50,y:42},{id:'RCM',label:'CM',role:'MID',x:69,y:44},{id:'RM',label:'RM',role:'MID',x:86,y:47},
    {id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'4-4-1-1', name:'4-4-1-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LB',label:'LB',role:'DEF',x:14,y:69},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RB',label:'RB',role:'DEF',x:86,y:69},
    {id:'LM',label:'LM',role:'MID',x:14,y:49},{id:'LCM',label:'CM',role:'MID',x:37,y:47},{id:'RCM',label:'CM',role:'MID',x:63,y:47},{id:'RM',label:'RM',role:'MID',x:86,y:49},
    {id:'SS',label:'SS',role:'FWD',x:50,y:30},{id:'ST',label:'ST',role:'FWD',x:50,y:14},
  ]},
  { id:'3-5-2', name:'3-5-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LCB',label:'CB',role:'DEF',x:24,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:76,y:72},
    {id:'LWB',label:'WB',role:'MID',x:13,y:54},{id:'LCM',label:'CM',role:'MID',x:33,y:46},{id:'CM',label:'CM',role:'MID',x:50,y:43},{id:'RCM',label:'CM',role:'MID',x:67,y:46},{id:'RWB',label:'WB',role:'MID',x:87,y:54},
    {id:'LS',label:'ST',role:'FWD',x:35,y:16},{id:'RS',label:'ST',role:'FWD',x:65,y:16},
  ]},
  { id:'3-4-3', name:'3-4-3', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LCB',label:'CB',role:'DEF',x:24,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:76,y:72},
    {id:'LM',label:'LM',role:'MID',x:14,y:50},{id:'LCM',label:'CM',role:'MID',x:37,y:47},{id:'RCM',label:'CM',role:'MID',x:63,y:47},{id:'RM',label:'RM',role:'MID',x:86,y:50},
    {id:'LW',label:'LW',role:'FWD',x:18,y:20},{id:'ST',label:'ST',role:'FWD',x:50,y:12},{id:'RW',label:'RW',role:'FWD',x:82,y:20},
  ]},
  { id:'3-4-2-1', name:'3-4-2-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LCB',label:'CB',role:'DEF',x:24,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:76,y:72},
    {id:'LWB',label:'WB',role:'MID',x:13,y:54},{id:'LCM',label:'CM',role:'MID',x:35,y:48},{id:'RCM',label:'CM',role:'MID',x:65,y:48},{id:'RWB',label:'WB',role:'MID',x:87,y:54},
    {id:'LAM',label:'AM',role:'FWD',x:33,y:30},{id:'RAM',label:'AM',role:'FWD',x:67,y:30},{id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'5-3-2', name:'5-3-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LWB',label:'WB',role:'DEF',x:13,y:66},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RWB',label:'WB',role:'DEF',x:87,y:66},
    {id:'LCM',label:'CM',role:'MID',x:28,y:48},{id:'CM',label:'CM',role:'MID',x:50,y:44},{id:'RCM',label:'CM',role:'MID',x:72,y:48},
    {id:'LS',label:'ST',role:'FWD',x:35,y:16},{id:'RS',label:'ST',role:'FWD',x:65,y:16},
  ]},
  { id:'5-4-1', name:'5-4-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LWB',label:'WB',role:'DEF',x:13,y:66},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RWB',label:'WB',role:'DEF',x:87,y:66},
    {id:'LM',label:'LM',role:'MID',x:14,y:47},{id:'LCM',label:'CM',role:'MID',x:36,y:44},{id:'RCM',label:'CM',role:'MID',x:64,y:44},{id:'RM',label:'RM',role:'MID',x:86,y:47},
    {id:'ST',label:'ST',role:'FWD',x:50,y:12},
  ]},
  { id:'5-2-3', name:'5-2-3', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},
    {id:'LWB',label:'WB',role:'DEF',x:13,y:66},{id:'LCB',label:'CB',role:'DEF',x:29,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:71,y:72},{id:'RWB',label:'WB',role:'DEF',x:87,y:66},
    {id:'LCM',label:'CM',role:'MID',x:36,y:49},{id:'RCM',label:'CM',role:'MID',x:64,y:49},
    {id:'LW',label:'LW',role:'FWD',x:18,y:20},{id:'ST',label:'ST',role:'FWD',x:50,y:12},{id:'RW',label:'RW',role:'FWD',x:82,y:20},
  ]},
];
const FORMATIONS_7: Formation[] = [
  { id:'7-3-2-1', name:'3-2-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LCB',label:'CB',role:'DEF',x:22,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:78,y:72},
    {id:'LM',label:'MF',role:'MID',x:33,y:47},{id:'RM',label:'MF',role:'MID',x:67,y:47},{id:'ST',label:'ST',role:'FWD',x:50,y:16}]},
  { id:'7-2-3-1', name:'2-3-1', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LB',label:'LB',role:'DEF',x:28,y:72},{id:'RB',label:'RB',role:'DEF',x:72,y:72},
    {id:'LM',label:'LM',role:'MID',x:21,y:47},{id:'CM',label:'CM',role:'MID',x:50,y:44},{id:'RM',label:'RM',role:'MID',x:79,y:47},{id:'ST',label:'ST',role:'FWD',x:50,y:16}]},
  { id:'7-3-1-2', name:'3-1-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LCB',label:'CB',role:'DEF',x:22,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:78,y:72},
    {id:'CM',label:'MF',role:'MID',x:50,y:49},{id:'LS',label:'ST',role:'FWD',x:33,y:18},{id:'RS',label:'ST',role:'FWD',x:67,y:18}]},
  { id:'7-2-2-2', name:'2-2-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LB',label:'LB',role:'DEF',x:28,y:72},{id:'RB',label:'RB',role:'DEF',x:72,y:72},
    {id:'LM',label:'MF',role:'MID',x:33,y:47},{id:'RM',label:'MF',role:'MID',x:67,y:47},{id:'LS',label:'ST',role:'FWD',x:33,y:18},{id:'RS',label:'ST',role:'FWD',x:67,y:18}]},
  { id:'7-1-3-2', name:'1-3-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'CB',label:'CB',role:'DEF',x:50,y:74},
    {id:'LM',label:'LM',role:'MID',x:21,y:48},{id:'CM',label:'CM',role:'MID',x:50,y:45},{id:'RM',label:'RM',role:'MID',x:79,y:48},
    {id:'LS',label:'ST',role:'FWD',x:33,y:18},{id:'RS',label:'ST',role:'FWD',x:67,y:18}]},
  { id:'7-2-1-3', name:'2-1-3', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LB',label:'LB',role:'DEF',x:28,y:72},{id:'RB',label:'RB',role:'DEF',x:72,y:72},
    {id:'CM',label:'MF',role:'MID',x:50,y:49},{id:'LW',label:'LW',role:'FWD',x:18,y:20},{id:'ST',label:'ST',role:'FWD',x:50,y:14},{id:'RW',label:'RW',role:'FWD',x:82,y:20}]},
  { id:'7-3-3', name:'3-3', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LCB',label:'CB',role:'DEF',x:22,y:72},{id:'CB',label:'CB',role:'DEF',x:50,y:75},{id:'RCB',label:'CB',role:'DEF',x:78,y:72},
    {id:'LW',label:'LW',role:'FWD',x:20,y:20},{id:'ST',label:'ST',role:'FWD',x:50,y:14},{id:'RW',label:'RW',role:'FWD',x:80,y:20}]},
  { id:'7-4-2', name:'4-2', positions:[
    {id:'GK',label:'GK',role:'GK',x:50,y:91},{id:'LB',label:'LB',role:'DEF',x:17,y:69},{id:'LCB',label:'CB',role:'DEF',x:34,y:72},{id:'RCB',label:'CB',role:'DEF',x:66,y:72},{id:'RB',label:'RB',role:'DEF',x:83,y:69},
    {id:'LS',label:'ST',role:'FWD',x:34,y:18},{id:'RS',label:'ST',role:'FWD',x:66,y:18}]},
];
const ALL_FORMATIONS: Record<Mode, Formation[]> = { '11': FORMATIONS_11, '7': FORMATIONS_7 };

/* ── helpers ── */
function loadLineups(): SavedLineup[] { try { return JSON.parse(localStorage.getItem('pj_lineups') || '[]'); } catch { return []; } }
function saveLineups(ls: SavedLineup[]) { localStorage.setItem('pj_lineups', JSON.stringify(ls)); }

/* ── Shadow Team ── */
interface ShadowTeamData { id:string; name:string; formation:string; mode:Mode; candidates:Record<string,string[]>; }
interface ShowSettings { photo:boolean; age:boolean; club:boolean; rating:boolean; height:boolean; }
function loadShadowTeams():ShadowTeamData[] { try{return JSON.parse(localStorage.getItem('pj_shadow_teams')||'[]');}catch{return[];} }
function saveShadowTeams(ts:ShadowTeamData[]) { localStorage.setItem('pj_shadow_teams',JSON.stringify(ts)); }

function ini(name: string) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
/* Convert 0-5 score to 0-99 with more granularity than ×18+9 */
function toStat(score: number) { return score > 0 ? Math.min(99, Math.round(score * 19.8)) : 0; }
function calcScores(a: Athlete) {
  const d = a.DOB || ''; const l = a.Latest || {};
  return {
    spd: toStat(getScorePoint('speed30',  String(l.Speed30    || ''), d)),
    jmp: toStat(getScorePoint('cmj',      String(l.CMJ        || ''), d)),
    agi: toStat(getScorePoint('agility',  String(l.Agility    || ''), d)),
    end: toStat(getScorePoint('yoyo',     String(l.YoYo       || ''), d)),
    str: toStat(getScorePoint('pushup',   String(l.Pushup     || ''), d)),
    flx: toStat(getScorePoint('sitreach', String(l.SitAndReach|| ''), d)),
  };
}

/* ── FC26 Gold Card (Kane-style shield shape) ── */
function FC26Card({ pos, athlete, isOver, teamLogo, onDragStart, onDragOver, onDrop, onDragLeave, onClick }:{
  pos: FPos; athlete?: Athlete; isOver: boolean; teamLogo?: string;
  onDragStart:(e:React.DragEvent)=>void; onDragOver:(e:React.DragEvent)=>void;
  onDrop:(e:React.DragEvent)=>void; onDragLeave:()=>void; onClick:()=>void;
}) {
  const rating = Math.round(Number(athlete?.Latest?.Rating) || 0);
  const sc     = athlete ? calcScores(athlete) : null;
  /* Card pixel dimensions */
  const W = 112; const H = 168;

  /* FC26 authentic card shape:
     - top corners convex + slight concave between them
     - straight sides
     - bottom corners concave (notched inward)
     - small rounded tab at bottom center */
  const shield = `path('M0,13 C0,5 5,0 13,0 Q56,9 99,0 C107,0 112,5 112,13 L112,148 C101,148 95,154 93,156 L73,156 Q56,168 39,156 L19,156 C17,154 11,148 0,148 Z')`;

  /* Golden-silk swirl background */
  const swirl = [
    'radial-gradient(ellipse 120% 60% at 75% 12%, rgba(255,252,190,1) 0%, transparent 48%)',
    'radial-gradient(ellipse 60% 90% at 18% 75%, rgba(160,100,0,0.88) 0%, transparent 46%)',
    'radial-gradient(ellipse 70% 50% at 90% 85%, rgba(230,185,20,0.82) 0%, transparent 44%)',
    'radial-gradient(ellipse 40% 40% at 52% 50%, rgba(255,235,100,0.6) 0%, transparent 52%)',
    'linear-gradient(148deg,#5c3200 0%,#a86800 12%,#d9a810 26%,#f2d030 40%,#d9a810 54%,#c08010 68%,#eebc20 80%,#a86800 92%,#5c3200 100%)',
  ].join(',');

  /* Bottom panel — lighter warm gold */
  const panel = 'linear-gradient(180deg,#f5d84a 0%,#e8c020 60%,#d4aa10 100%)';

  const STATS: [string,number][] = sc
    ? [['SPD',sc.spd],['JMP',sc.jmp],['AGI',sc.agi],['END',sc.end],['STR',sc.str],['FLX',sc.flx]]
    : [];

  /* Bottom panel: fixed 62px */
  const PANEL = 62;
  /* Photo area height */
  const photoH = H - PANEL;

  return (
    <div
      style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
        transform:`translate(-50%,-50%) scale(${isOver?1.1:1})`, zIndex:10,
        cursor:athlete?'grab':'pointer',
        filter: isOver
          ? 'drop-shadow(0 0 10px rgba(255,255,255,0.9)) drop-shadow(0 6px 24px rgba(0,0,0,0.9))'
          : 'drop-shadow(0 4px 16px rgba(0,0,0,0.75))',
        transition:'filter 0.12s, transform 0.12s',
      }}
      draggable={!!athlete}
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={onDragLeave} onClick={onClick}
    >
      {athlete ? (
        /* ── Filled card ── */
        <div style={{ width:W, height:H, clipPath:shield, background:swirl, position:'relative', userSelect:'none', overflow:'hidden' }}>

          {/* Silk-flow overlay */}
          <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
            background:[
              'linear-gradient(210deg,rgba(255,255,255,0.38) 0%,rgba(255,255,255,0.08) 30%,transparent 52%)',
              'linear-gradient(60deg,transparent 42%,rgba(255,245,150,0.2) 62%,transparent 82%)',
            ].join(','),
          }}/>

          {/* ── Rating (top-left, absolute) ── */}
          <div style={{ position:'absolute', top:7, left:7, zIndex:5 }}>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#1a0900', fontFamily:'Arial Black,sans-serif', lineHeight:0.9 }}>
              {rating||'—'}
            </div>
            <div style={{ fontSize:'0.62rem', fontWeight:900, color:'#1a0900', textTransform:'uppercase', letterSpacing:0.8, marginTop:3 }}>
              {pos.label}
            </div>
          </div>

          {/* ── Team logo (top-right) ── */}
          {teamLogo && (
            <div style={{ position:'absolute', top:7, right:7, zIndex:5,
              width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
              background:'rgba(255,255,255,0.18)', borderRadius:4, backdropFilter:'blur(2px)',
              padding:2,
            }}>
              <img src={teamLogo} alt="" style={{ width:24, height:24, objectFit:'contain', filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}/>
            </div>
          )}

          {/* ── Photo (fills card above panel) ── */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:photoH, zIndex:3, overflow:'hidden' }}>
            {athlete.PhotoUrl
              ? <img src={athlete.PhotoUrl} alt="" style={{ width:'100%', height:'118%', objectFit:'cover', objectPosition:'top center' }}/>
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:8 }}>
                  <span style={{ fontSize:'2.6rem', fontWeight:900, color:'rgba(0,0,0,0.17)', fontFamily:'Arial Black,sans-serif' }}>{ini(athlete.Name)}</span>
                </div>}
          </div>

          {/* ── Bottom gold panel (62px fixed) ── */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:PANEL, background:panel, zIndex:4 }}>

            {/* top divider */}
            <div style={{ position:'absolute', top:0, left:'8%', right:'8%', height:1, background:'rgba(100,55,0,0.3)' }}/>

            {/* Name */}
            <div style={{ position:'absolute', top:6, left:6, right:6, textAlign:'center',
              fontSize:'0.75rem', fontWeight:900, color:'#160800',
              fontFamily:'Arial Black,sans-serif', letterSpacing:0.2,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {athlete.Nickname || athlete.Name?.split(' ').slice(-1)[0] || athlete.Name}
            </div>

            {/* Stat labels */}
            <div style={{ position:'absolute', top:23, left:8, right:8, display:'flex' }}>
              {STATS.map(([k]) => (
                <div key={k} style={{ flex:1, minWidth:0, textAlign:'center', fontSize:'0.39rem', fontWeight:800,
                  color:'rgba(26,9,0,0.55)', textTransform:'uppercase', letterSpacing:0,
                  overflow:'hidden' }}>{k}</div>
              ))}
            </div>

            {/* Stat values */}
            <div style={{ position:'absolute', top:31, left:8, right:8, display:'flex' }}>
              {STATS.map(([k,v]) => (
                <div key={k} style={{ flex:1, minWidth:0, textAlign:'center', fontSize:'0.63rem', fontWeight:900,
                  color:'#160800', fontFamily:'Arial Black,sans-serif', lineHeight:1,
                  overflow:'hidden' }}>{v>0?v:'—'}</div>
              ))}
            </div>

          </div>
        </div>
      ) : (
        /* ── Empty slot ── */
        <div style={{ width:W, height:H, clipPath:shield,
          border:`2px dashed ${isOver?'rgba(255,240,80,0.9)':'rgba(255,255,255,0.25)'}`,
          background: isOver ? 'rgba(255,240,80,0.12)' : 'rgba(0,0,0,0.3)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5,
          transition:'all 0.12s', backdropFilter:'blur(4px)',
        }}>
          <div style={{ width:30, height:30, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="bi bi-plus" style={{ color:'rgba(255,255,255,0.5)', fontSize:'1.1rem' }}/>
          </div>
          <div style={{ fontSize:'0.65rem', fontWeight:900, color:'rgba(255,255,255,0.5)',
            textTransform:'uppercase', letterSpacing:1.5 }}>{pos.label}</div>
        </div>
      )}
    </div>
  );
}

/* ── Shadow Card ── */
function ShadowCard({athlete,show,onRemove}:{athlete:Athlete;show:ShowSettings;onRemove:()=>void}) {
  const year=athlete.DOB?(()=>{try{const d=new Date(athlete.DOB);return isNaN(d.getTime())?null:d.getFullYear();}catch{return null;}})():null;
  const height=athlete.Latest?.Height?String(Math.round(Number(athlete.Latest.Height)||0)):'';
  const rating=Math.round(Number(athlete.Latest?.Rating)||0);
  return (
    <div style={{display:'flex',alignItems:'center',gap:3,background:'white',borderRadius:5,padding:'3px 6px 3px 4px',boxShadow:'0 1px 5px rgba(0,0,0,0.2)',minWidth:115}}>
      {show.photo&&(athlete.PhotoUrl
        ?<img src={athlete.PhotoUrl} alt="" style={{width:22,height:22,borderRadius:3,objectFit:'cover',objectPosition:'top',flexShrink:0}}/>
        :<div style={{width:22,height:22,borderRadius:3,background:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:'0.4rem',fontWeight:900,color:'#64748b'}}>{ini(athlete.Name)}</span></div>
      )}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'0.6rem',fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.2}}>
          {athlete.Nickname||athlete.Name?.split(' ').slice(-1)[0]||athlete.Name}
        </div>
        {(show.age||show.height||show.club||show.rating)&&(
          <div style={{display:'flex',gap:3,alignItems:'center',marginTop:1,flexWrap:'nowrap'}}>
            {show.age&&year&&<span style={{fontSize:'0.48rem',color:'#64748b',fontWeight:600,whiteSpace:'nowrap'}}>'{String(year).slice(2)}</span>}
            {show.height&&height&&<span style={{fontSize:'0.48rem',color:'#475569',fontWeight:600,whiteSpace:'nowrap'}}>{height}cm</span>}
            {show.club&&athlete.Team&&<span style={{fontSize:'0.48rem',color:'#64748b',maxWidth:50,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{athlete.Team}</span>}
            {show.rating&&<span style={{fontSize:'0.48rem',fontWeight:800,color:'#92400e',background:'#fef3c7',borderRadius:2,padding:'0 2px',whiteSpace:'nowrap'}}>{rating||'—'}</span>}
          </div>
        )}
      </div>
      <button onClick={e=>{e.stopPropagation();onRemove();}} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:'0.85rem',lineHeight:1,padding:'0 1px',flexShrink:0}}>×</button>
    </div>
  );
}

/* ── Shadow Slot ── */
function ShadowSlot({pos,candidates,allAthletes,show,onAdd,onRemove}:{
  pos:FPos; candidates:Athlete[]; allAthletes:Athlete[];
  show:ShowSettings; onAdd:(id:string)=>void; onRemove:(id:string)=>void;
}) {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const cIds=new Set(candidates.map(a=>a.PlayerID));
  const available=allAthletes.filter(a=>!cIds.has(a.PlayerID)&&
    (!search||(a.Name||'').toLowerCase().includes(search.toLowerCase())||(a.Nickname||'').toLowerCase().includes(search.toLowerCase()))
  );
  const isLower=pos.y>55;
  const cards=(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      {candidates.map(a=><ShadowCard key={a.PlayerID} athlete={a} show={show} onRemove={()=>onRemove(a.PlayerID)}/>)}
    </div>
  );
  return (
    <div style={{position:'absolute',left:`${pos.x}%`,top:`${pos.y}%`,transform:'translate(-50%,-50%)',zIndex:open?100:10}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
        {isLower&&candidates.length>0&&<div style={{marginBottom:2}}>{cards}</div>}
        <div onClick={()=>setOpen(v=>!v)} style={{width:32,height:32,borderRadius:'50%',
          background:open?'rgba(56,189,248,0.4)':'rgba(255,255,255,0.15)',
          border:`2px solid ${open?'#38bdf8':'rgba(255,255,255,0.65)'}`,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          backdropFilter:'blur(2px)',cursor:'pointer',position:'relative',transition:'all 0.12s'}}>
          <span style={{fontSize:'0.42rem',fontWeight:900,color:'white',textTransform:'uppercase',lineHeight:1.1}}>{pos.label}</span>
          <span style={{fontSize:'0.36rem',color:'rgba(255,255,255,0.7)',lineHeight:1}}>+</span>
          {candidates.length>0&&(
            <div style={{position:'absolute',top:-5,right:-5,width:15,height:15,borderRadius:'50%',background:'#10b981',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 4px rgba(0,0,0,0.3)'}}>
              <span style={{fontSize:'0.38rem',fontWeight:900,color:'white'}}>{candidates.length}</span>
            </div>
          )}
        </div>
        {!isLower&&candidates.length>0&&<div style={{marginTop:2}}>{cards}</div>}
        {open&&(
          <div style={{position:'absolute',...(isLower?{bottom:'calc(100% + 36px)'}:{top:'calc(100% + 36px)'}),
            left:'50%',transform:'translateX(-50%)',zIndex:999,background:'white',borderRadius:8,
            boxShadow:'0 8px 32px rgba(0,0,0,0.3)',padding:8,width:200,maxHeight:240,
            overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:'0.7rem',fontWeight:700,color:'#0f172a'}}>{pos.label} — เพิ่มผู้เล่น</span>
              <button onClick={()=>{setOpen(false);setSearch('');}} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:'1rem',lineHeight:1,padding:0}}>×</button>
            </div>
            <input placeholder="ค้นหา..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus
              style={{padding:'4px 8px',border:'1px solid #e2e8f0',borderRadius:4,fontSize:'0.72rem',marginBottom:5,outline:'none',width:'100%',boxSizing:'border-box' as const}}/>
            <div style={{overflowY:'auto',flex:1}}>
              {available.length===0&&<div style={{textAlign:'center',padding:8,fontSize:'0.68rem',color:'#94a3b8'}}>ไม่พบนักกีฬา</div>}
              {available.slice(0,30).map(a=>(
                <div key={a.PlayerID} onClick={()=>{onAdd(a.PlayerID);setSearch('');setOpen(false);}}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',cursor:'pointer',borderRadius:4}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#f1f5f9')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  {a.PhotoUrl
                    ?<img src={a.PhotoUrl} alt="" style={{width:20,height:20,borderRadius:3,objectFit:'cover',objectPosition:'top',flexShrink:0}}/>
                    :<div style={{width:20,height:20,borderRadius:3,background:'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:'0.38rem',fontWeight:900,color:'#64748b'}}>{ini(a.Name)}</span></div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'0.65rem',fontWeight:600,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.Name}</div>
                    {a.Position&&<div style={{fontSize:'0.5rem',color:'#64748b'}}>{a.Position}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pitch lines ── */
function PitchLines() {
  const W = 'rgba(255,255,255,0.5)';
  const s = (key: string, style: React.CSSProperties) => <div key={key} style={{ position:'absolute', pointerEvents:'none', ...style }}/>;
  return (
    <>
      {s('border', { inset:'2% 4%', border:`1.5px solid ${W}`, borderRadius:4 })}
      {s('half',   { left:'4%', right:'4%', top:'50%', height:1.5, background:W })}
      {s('circle', { left:'50%', top:'50%', width:'24%', height:'13%', border:`1.5px solid ${W}`, borderRadius:'50%', transform:'translate(-50%,-50%)' })}
      {s('cspot',  { left:'calc(50% - 3px)', top:'calc(50% - 3px)', width:6, height:6, background:W, borderRadius:'50%' })}
      {s('tpen',   { left:'22%', right:'22%', top:'2%', height:'18%', border:`1.5px solid ${W}` })}
      {s('t6yd',   { left:'36%', right:'36%', top:'2%', height:'7%', border:`1.5px solid ${W}` })}
      {s('bpen',   { left:'22%', right:'22%', bottom:'2%', height:'18%', border:`1.5px solid ${W}` })}
      {s('b6yd',   { left:'36%', right:'36%', bottom:'2%', height:'7%', border:`1.5px solid ${W}` })}
      {s('tgoal',  { left:'41%', right:'41%', top:'0', height:'2.5%', border:`1.5px solid rgba(255,255,255,0.6)`, borderTop:'none' })}
      {s('bgoal',  { left:'41%', right:'41%', bottom:'0', height:'2.5%', border:`1.5px solid rgba(255,255,255,0.6)`, borderBottom:'none' })}
      {s('tpspot', { left:'calc(50% - 2px)', top:'15%', width:5, height:5, background:W, borderRadius:'50%' })}
      {s('bpspot', { left:'calc(50% - 2px)', bottom:'15%', width:5, height:5, background:W, borderRadius:'50%' })}
      {Array.from({length:10},(_,i)=>(
        <div key={`g${i}`} style={{ position:'absolute', pointerEvents:'none', top:`${i*10}%`, left:'4%', right:'4%', height:'10%', background:i%2===0?'rgba(0,0,0,0.07)':'transparent' }}/>
      ))}
    </>
  );
}

/* ── Main ── */
export default function LineupPage({ athletes, user }: Props) {
  const [mode, setMode]           = useState<Mode>('11');
  const [formId, setFormId]       = useState('4-3-3');
  const [assign, setAssign]       = useState<Record<string,string>>({});
  const [over, setOver]           = useState<string|null>(null);
  const [selAth, setSelAth]       = useState<string|null>(null);
  const [search, setSearch]       = useState('');
  const [rf, setRf]               = useState<'ALL'|Role>('ALL');
  const [lname, setLname]         = useState('');
  const [saved, setSaved]         = useState<SavedLineup[]>(()=>loadLineups());
  const [showPanel, setShowPanel] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [notif, setNotif]         = useState('');
  const [teamName, setTeamName]   = useState(user?.displayName || '');
  const [teamLogo, setTeamLogo]   = useState(user?.logoUrl || '');

  /* Shadow Team state */
  const [shadowMode,setShadowMode]               = useState(false);
  const [shadowCandidates,setShadowCandidates]   = useState<Record<string,string[]>>({});
  const [shadowTeams,setShadowTeams]             = useState<ShadowTeamData[]>(()=>loadShadowTeams());
  const [shadowFieldColor,setShadowFieldColor]   = useState<'green'|'blue'>('green');
  const [shadowZoom,setShadowZoom]               = useState(90);
  const [show,setShow]                           = useState<ShowSettings>({photo:true,age:true,club:false,rating:true,height:true});
  const [showShadowSaved,setShowShadowSaved]     = useState(false);
  const [shadowName,setShadowName]               = useState('');

  const formations = ALL_FORMATIONS[mode];
  const formation  = formations.find(f=>f.id===formId) ?? formations[0];
  const assignedIds = new Set(Object.values(assign));
  const notify = (m:string)=>{ setNotif(m); setTimeout(()=>setNotif(''),2200); };

  const roster = athletes.filter(a=>{
    if(rf!=='ALL'){const p=(a.Position||'').toLowerCase();if(rf==='GK'&&!p.includes('goal'))return false;if(rf==='DEF'&&!p.includes('def')&&!p.includes('back'))return false;if(rf==='MID'&&!p.includes('mid'))return false;if(rf==='FWD'&&!/forward|fwd|wing|striker/i.test(p))return false;}
    if(search){const q=search.toLowerCase();return(a.Name||'').toLowerCase().includes(q)||(a.Nickname||'').toLowerCase().includes(q);}
    return true;
  });

  const onSlotDragStart = useCallback((e:React.DragEvent,posId:string)=>{
    const aid=assign[posId];if(!aid){e.preventDefault();return;}
    e.dataTransfer.setData('text/plain',JSON.stringify({athleteId:aid,fromPos:posId}));
  },[assign]);
  const onRosterDragStart = useCallback((e:React.DragEvent,athleteId:string)=>{
    e.dataTransfer.setData('text/plain',JSON.stringify({athleteId,fromPos:null}));
  },[]);
  const onSlotDrop = useCallback((e:React.DragEvent,toPosId:string)=>{
    e.preventDefault();setOver(null);
    try{const{athleteId,fromPos}=JSON.parse(e.dataTransfer.getData('text/plain'));
      setAssign(prev=>{const n={...prev};if(fromPos&&fromPos!==toPosId){if(n[toPosId])n[fromPos]=n[toPosId];else delete n[fromPos];}n[toPosId]=athleteId;return n;});setSelAth(null);
    }catch{}
  },[]);
  const onRosterDrop = useCallback((e:React.DragEvent)=>{
    e.preventDefault();
    try{const{fromPos}=JSON.parse(e.dataTransfer.getData('text/plain'));if(fromPos)setAssign(prev=>{const n={...prev};delete n[fromPos];return n;});}catch{}
  },[]);
  const onSlotClick=(posId:string)=>{
    if(selAth){setAssign(prev=>{const n={...prev};const ex=Object.keys(n).find(k=>n[k]===selAth);if(ex)delete n[ex];n[posId]=selAth;return n;});setSelAth(null);}
    else if(assign[posId])setAssign(prev=>{const n={...prev};delete n[posId];return n;});
  };
  const changeMode=(m:Mode)=>{setMode(m);setFormId(ALL_FORMATIONS[m][0].id);setAssign({});setSelAth(null);};
  const changeFormation=(id:string)=>{setFormId(id);setAssign({});setSelAth(null);};
  const handleSave=()=>{
    const name=lname.trim()||`Lineup ${new Date().toLocaleDateString('th-TH')}`;
    const lu:SavedLineup={id:Date.now().toString(),name,formation:formId,mode,assignments:{...assign}};
    const u=[lu,...saved];setSaved(u);saveLineups(u);setLname('');notify(`บันทึก "${name}" สำเร็จ`);
  };
  const handleLoad=(lu:SavedLineup)=>{
    const m=lu.mode??(FORMATIONS_7.some(f=>f.id===lu.formation)?'7':'11');
    setMode(m);setFormId(lu.formation);setAssign(lu.assignments);setSelAth(null);setShowSaved(false);notify(`โหลด "${lu.name}" สำเร็จ`);
  };

  /* Shadow Team handlers */
  const addCandidate=(posId:string,athleteId:string)=>setShadowCandidates(prev=>({...prev,[posId]:[...(prev[posId]||[]),athleteId]}));
  const removeCandidate=(posId:string,athleteId:string)=>setShadowCandidates(prev=>{const n={...prev};n[posId]=(n[posId]||[]).filter(id=>id!==athleteId);return n;});
  const handleSaveShadow=()=>{
    const name=shadowName.trim()||`Shadow ${new Date().toLocaleDateString('th-TH')}`;
    const t:ShadowTeamData={id:Date.now().toString(),name,formation:formId,mode,candidates:{...shadowCandidates}};
    const u=[t,...shadowTeams];setShadowTeams(u);saveShadowTeams(u);setShadowName('');notify(`บันทึก "${name}" สำเร็จ`);
  };
  const handleLoadShadow=(t:ShadowTeamData)=>{
    const m=t.mode??(FORMATIONS_7.some(f=>f.id===t.formation)?'7':'11');
    setMode(m);setFormId(t.formation);setShadowCandidates(t.candidates);setShowShadowSaved(false);notify(`โหลด "${t.name}" สำเร็จ`);
  };

  const shadowGrass=shadowFieldColor==='blue'
    ?'linear-gradient(180deg,#0a1f3a 0%,#0f2d52 18%,#1a4570 50%,#0f2d52 82%,#0a1f3a 100%)'
    :'linear-gradient(180deg,#0e4020 0%,#145c2a 18%,#1a7835 50%,#145c2a 82%,#0e4020 100%)';
  const pitchMaxW=Math.round(820*shadowZoom/100);

  return (
    <div style={{ minHeight:'100vh' }}>
      <style>{`
        @media print {
          /* ── A4 Landscape, single page ── */
          @page { size: A4 landscape; margin: 4mm 6mm; }

          .sidebar, .top-bar, .sidebar-overlay, .no-print { display:none!important; }
          .main { margin:0!important; padding:0!important; width:100%!important; }
          body { overflow:visible!important; }

          /* 2-column: pitch 62% | roster 38% */
          #lineupScene {
            display:flex!important;
            flex-direction:row!important;
            gap:10px!important;
            align-items:flex-start!important;
            max-width:100%!important;
            width:100%!important;
            page-break-inside:avoid!important;
            break-inside:avoid!important;
          }
          #lineupScene > div:first-child {
            flex:0 0 62%!important;
            width:62%!important;
            max-width:62%!important;
          }

          /* Dark container: compact, clip bottom so GK tab doesn't bleed to page 2 */
          #lineupScene > div:first-child > div {
            border-radius:8px!important;
            padding:4px 8px 4px!important;
            overflow:hidden!important;
            box-shadow:none!important;
            width:100%!important;
          }

          /* Pitch: 100% ratio so all 4 rows fit without card overlap
             62% × 1078px - 16px padding = 652px pitch width → 652px pitch height
             Card H=155px, CB@72% center=470px, CM@49% center=319px → gap=151px ≈ card height ✓ */
          #lineupScene #lineupPitch {
            padding-bottom:100%!important;
            width:100%!important;
          }

          /* Remove glow text-shadow → fixes doubled-letter artefact */
          .team-banner div { text-shadow:none!important; }

          .team-banner {
            margin-bottom:2px!important;
            padding:0!important;
          }
          .team-banner img {
            width:22px!important; height:22px!important;
            margin-bottom:2px!important;
            display:block!important; margin-left:auto!important; margin-right:auto!important;
          }
          .team-banner > div:first-of-type {
            font-size:1.1rem!important; letter-spacing:2px!important; line-height:1.1!important;
          }
          .team-banner > div:last-of-type {
            font-size:0.6rem!important; margin-top:1px!important;
          }

          /* Formation label below pitch */
          #lineupScene > div:first-child > div > div:last-child {
            font-size:0.55rem!important; margin-top:2px!important;
          }

          /* Scale down all card wrappers (keep translate centering) */
          #lineupPitch > div:last-child > div {
            transform: translate(-50%, -50%) scale(0.68) !important;
          }

          /* Print-only roster */
          #lineupPrintRoster {
            display:flex!important;
            flex:1!important;
            min-width:0!important;
            flex-direction:column!important;
            align-self:flex-start!important;
          }
        }
      `}</style>

      {/* ── Controls (screen only) ── */}
      <div className="no-print">
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-diagram-3-fill" style={{fontSize:'1.3rem',color:'#38bdf8'}}/>
            <div><h2 className="page-title" style={{margin:0}}>Line Up</h2><p className="page-subtitle" style={{margin:0}}>{formation.name} · {mode==='11'?'11v11':'7v7'} · {Object.keys(assign).length}/{formation.positions.length}</p></div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className={`btn-sm ${shadowMode?'btn-primary':'btn-outline'}`} onClick={()=>setShadowMode(v=>!v)} style={{background:shadowMode?'#7c3aed':undefined,borderColor:shadowMode?'#7c3aed':undefined}}><i className="bi bi-people-fill me-1"/>Shadow Team</button>
            {!shadowMode&&<><button className="btn-outline btn-sm" onClick={()=>setShowPanel(v=>!v)}><i className={`bi bi-${showPanel?'chevron-right':'people-fill'} me-1`}/>{showPanel?'ซ่อน':'ผู้เล่น'}</button>
            <button className="btn-outline btn-sm" onClick={()=>{setAssign({});setSelAth(null);}}><i className="bi bi-x-circle me-1"/>ล้าง</button>
            <button className="btn-outline btn-sm" onClick={()=>setShowSaved(v=>!v)}><i className="bi bi-folder2-open me-1"/>บันทึก ({saved.length})</button>
            <button className="btn-outline btn-sm" onClick={()=>window.print()}><i className="bi bi-printer me-1"/>Print</button>
            <button className="btn-primary btn-sm" onClick={handleSave}><i className="bi bi-save me-1"/>Save</button></>}
          </div>
        </div>

        {/* Mode + Formation */}
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
          {([['11','⚽ 11 คน'],['7','🏃 7 คน']] as [Mode,string][]).map(([m,label])=>(
            <button key={m} onClick={()=>changeMode(m)} style={{padding:'6px 16px',borderRadius:8,fontWeight:700,fontSize:'0.82rem',cursor:'pointer',background:mode===m?'#1e3a5f':'var(--surface)',color:mode===m?'#38bdf8':'var(--text-muted)',border:`2px solid ${mode===m?'#38bdf8':'var(--border)'}`}}>
              {label} <span style={{marginLeft:6,background:mode===m?'#38bdf8':'var(--border)',color:'white',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem',fontWeight:800}}>{m==='11'?'11v11':'7v7'}</span>
            </button>
          ))}
          <div style={{width:1,height:24,background:'var(--border)'}}/>
          {formations.map(f=>(
            <button key={f.id} onClick={()=>changeFormation(f.id)} style={{padding:'4px 12px',borderRadius:6,fontWeight:700,fontSize:'0.75rem',cursor:'pointer',background:formId===f.id?'#38bdf8':'var(--surface)',color:formId===f.id?'white':'var(--text-muted)',border:`1.5px solid ${formId===f.id?'#38bdf8':'var(--border)'}`}}>{f.name}</button>
          ))}
        </div>

        {/* Saved */}
        {showSaved&&saved.length>0&&(
          <div style={{marginBottom:12,padding:12,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexWrap:'wrap',gap:7}}>
            {saved.map(l=>(
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:6,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px'}}>
                <span style={{fontSize:'0.75rem',fontWeight:600}}>{l.name}</span>
                <span style={{fontSize:'0.62rem',color:'var(--text-muted)',background:'rgba(56,189,248,0.1)',borderRadius:4,padding:'1px 5px'}}>{l.formation}</span>
                <button className="btn-primary btn-sm" style={{padding:'2px 7px',fontSize:'0.65rem'}} onClick={()=>handleLoad(l)}>Load</button>
                <button className="btn-danger btn-sm" style={{padding:'2px 6px',fontSize:'0.65rem'}} onClick={()=>{const u=saved.filter(x=>x.id!==l.id);setSaved(u);saveLineups(u);}}>
                  <i className="bi bi-trash"/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {notif&&<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:'#10b981',color:'white',borderRadius:10,padding:'10px 18px',fontWeight:700,fontSize:'0.85rem',boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}><i className="bi bi-check-circle me-2"/>{notif}</div>}

      {/* ── SHADOW TEAM SCENE ── */}
      {shadowMode&&(
        <div style={{display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
          {/* Settings panel */}
          <div style={{flex:'0 0 210px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:14,position:'sticky',top:80,display:'flex',flexDirection:'column',gap:12}}>
            {/* Formation display */}
            <div>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Formation</div>
              <div style={{fontSize:'1.1rem',fontWeight:900,color:'#7c3aed',letterSpacing:1}}>{formation.name}</div>
              <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginTop:1}}>{mode==='11'?'11v11':'7v7'}</div>
            </div>
            <div style={{height:1,background:'var(--border)'}}/>
            {/* Field color */}
            <div>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Field Color</div>
              <select value={shadowFieldColor} onChange={e=>setShadowFieldColor(e.target.value as 'green'|'blue')}
                style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:'0.78rem',cursor:'pointer'}}>
                <option value="green">Green</option>
                <option value="blue">Blue (Artificial)</option>
              </select>
            </div>
            {/* Zoom */}
            <div>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                <span>Zoom field</span><span style={{color:'var(--text)',fontWeight:800}}>{shadowZoom}%</span>
              </div>
              <input type="range" min={50} max={100} value={shadowZoom} onChange={e=>setShadowZoom(Number(e.target.value))}
                style={{width:'100%',accentColor:'#7c3aed',cursor:'pointer'}}/>
            </div>
            <div style={{height:1,background:'var(--border)'}}/>
            {/* Display options */}
            <div>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Display</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {([['photo','Photo'],['age','Age'],['club','Current club'],['rating','Rating (OVR)'],['height','Height']] as [keyof ShowSettings,string][]).map(([key,label])=>(
                  <label key={key} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'0.78rem',fontWeight:600,color:'var(--text)'}}>
                    <input type="checkbox" checked={show[key]} onChange={e=>setShow(prev=>({...prev,[key]:e.target.checked}))}
                      style={{accentColor:'#7c3aed',width:14,height:14,cursor:'pointer'}}/>
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{height:1,background:'var(--border)'}}/>
            {/* Clear + Save */}
            <button className="btn-outline btn-sm" onClick={()=>setShadowCandidates({})} style={{fontSize:'0.72rem'}}>
              <i className="bi bi-x-circle me-1"/>ล้างทั้งหมด
            </button>
            <div style={{display:'flex',gap:6}}>
              <input className="form-control" style={{fontSize:'0.72rem',flex:1}} placeholder="ชื่อ shadow team..." value={shadowName} onChange={e=>setShadowName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSaveShadow()}/>
              <button className="btn-sm" style={{background:'#7c3aed',color:'white',border:'none',borderRadius:6,padding:'0 8px',cursor:'pointer',fontSize:'0.75rem'}} onClick={handleSaveShadow}><i className="bi bi-save"/></button>
            </div>
            {/* Saved shadow teams */}
            {shadowTeams.length>0&&(
              <div>
                <button className="btn-outline btn-sm" style={{width:'100%',fontSize:'0.72rem'}} onClick={()=>setShowShadowSaved(v=>!v)}>
                  <i className="bi bi-folder2-open me-1"/>Saved ({shadowTeams.length})
                </button>
                {showShadowSaved&&(
                  <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:5,maxHeight:180,overflowY:'auto'}}>
                    {shadowTeams.map(t=>(
                      <div key={t.id} style={{display:'flex',alignItems:'center',gap:5,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:7,padding:'4px 8px'}}>
                        <span style={{fontSize:'0.68rem',fontWeight:600,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>
                        <button className="btn-primary btn-sm" style={{padding:'1px 6px',fontSize:'0.6rem'}} onClick={()=>handleLoadShadow(t)}>Load</button>
                        <button className="btn-danger btn-sm" style={{padding:'1px 5px',fontSize:'0.6rem'}} onClick={()=>{const u=shadowTeams.filter(x=>x.id!==t.id);setShadowTeams(u);saveShadowTeams(u);}}>
                          <i className="bi bi-trash"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Pitch */}
          <div style={{flex:'1 1 400px',minWidth:320,maxWidth:pitchMaxW}}>
            <div style={{borderRadius:18,overflow:'hidden',background:'linear-gradient(160deg,#03081e 0%,#060d28 40%,#030a1c 100%)',border:'1px solid rgba(124,58,237,0.2)',boxShadow:'0 0 60px rgba(80,20,200,0.15)',padding:'14px 12px 12px'}}>
              <div style={{textAlign:'center',marginBottom:10}}>
                <div style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(124,58,237,0.8)',letterSpacing:3,textTransform:'uppercase'}}>SHADOW TEAM · {formation.name}</div>
              </div>
              <div id="shadowPitch" style={{position:'relative',width:'100%',paddingBottom:'165%'}}>
                <div style={{position:'absolute',inset:0,borderRadius:10,overflow:'hidden',background:shadowGrass,boxShadow:'inset 0 0 50px rgba(0,0,0,0.35)'}}>
                  <PitchLines/>
                </div>
                <div style={{position:'absolute',inset:0,overflow:'visible'}}>
                  {formation.positions.map(pos=>{
                    const cands=athletes.filter(a=>(shadowCandidates[pos.id]||[]).includes(a.PlayerID));
                    return(
                      <ShadowSlot key={pos.id} pos={pos} candidates={cands} allAthletes={athletes}
                        show={show} onAdd={id=>addCandidate(pos.id,id)} onRemove={id=>removeCandidate(pos.id,id)}/>
                    );
                  })}
                </div>
              </div>
              <div style={{textAlign:'center',marginTop:10,fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:3,textTransform:'uppercase'}}>
                {formation.name} · {mode==='11'?'11v11':'7v7'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FC26 SCENE ── */}
      {!shadowMode&&<div id="lineupScene" style={{display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>

        {/* ── LEFT: Dark scene ── */}
        <div style={{flex:'1 1 600px',minWidth:380,maxWidth:820}}>

          {/* Dark container */}
          <div style={{
            borderRadius:18, overflow:'hidden',
            background:'linear-gradient(160deg,#03081e 0%,#060d28 40%,#030a1c 100%)',
            border:'1px solid rgba(56,189,248,0.15)',
            boxShadow:'0 0 60px rgba(0,50,200,0.15)',
            padding:'20px 16px 16px',
          }}>
            {/* Team banner */}
            <div className="team-banner" style={{textAlign:'center',marginBottom:12}}>
              {teamLogo&&<img src={teamLogo} alt="" style={{width:52,height:52,objectFit:'contain',margin:'0 auto 8px',display:'block',filter:'drop-shadow(0 4px 12px rgba(255,255,255,0.2))'}}/>}
              {teamName ? (
                <>
                  <div style={{fontSize:'2.2rem',fontWeight:900,color:'white',letterSpacing:3,textTransform:'uppercase',textShadow:'0 0 30px rgba(56,189,248,0.6), 0 2px 4px rgba(0,0,0,0.8)',lineHeight:1.1}}>
                    {teamName}
                  </div>
                  <div style={{fontSize:'0.85rem',fontWeight:700,color:'#38bdf8',letterSpacing:4,textTransform:'uppercase',marginTop:4,textShadow:'0 0 20px rgba(56,189,248,0.8)'}}>
                    LINE-UP
                  </div>
                </>
              ) : (
                <div style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(56,189,248,0.6)',letterSpacing:3,textTransform:'uppercase'}}>ใส่ชื่อทีมในช่องด้านขวา</div>
              )}
            </div>

            {/* Pitch */}
            <div id="lineupPitch" style={{position:'relative',width:'100%',paddingBottom:'165%'}}>
              {/* Grass layer */}
              <div style={{
                position:'absolute',inset:0,borderRadius:10,overflow:'hidden',
                background:'linear-gradient(180deg,#0e4020 0%,#145c2a 18%,#1a7835 50%,#145c2a 82%,#0e4020 100%)',
                boxShadow:'inset 0 0 50px rgba(0,0,0,0.35), 0 0 40px rgba(20,100,50,0.3)',
              }}>
                <PitchLines/>
              </div>
              {/* Cards layer (overflow visible for edge players) */}
              <div style={{position:'absolute',inset:0}} onDragOver={e=>e.preventDefault()} onDrop={onRosterDrop}>
                {formation.positions.map(pos=>{
                  const athlete=athletes.find(a=>a.PlayerID===assign[pos.id]);
                  return(
                    <FC26Card key={pos.id} pos={pos} athlete={athlete} isOver={over===pos.id}
                      teamLogo={teamLogo}
                      onDragStart={e=>onSlotDragStart(e,pos.id)}
                      onDragOver={e=>{e.preventDefault();setOver(pos.id);}}
                      onDrop={e=>onSlotDrop(e,pos.id)}
                      onDragLeave={()=>setOver(null)}
                      onClick={()=>onSlotClick(pos.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Bottom: formation label */}
            <div style={{textAlign:'center',marginTop:12,fontSize:'0.75rem',fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:3,textTransform:'uppercase'}}>
              {formation.name} · {mode==='11'?'11v11':'7v7'}
            </div>
          </div>
        </div>

        {/* ── PRINT-ONLY: Lineup roster panel (right column) ── */}
        <div id="lineupPrintRoster" style={{display:'none'}}>
          {/* Header */}
          <div style={{fontWeight:900,fontSize:'0.85rem',letterSpacing:2,textTransform:'uppercase',
            paddingBottom:5,marginBottom:6,borderBottom:'2pt solid #0f172a',color:'#0f172a'}}>
            {teamName||'LINE-UP'}
            <span style={{marginLeft:8,fontSize:'0.58rem',fontWeight:600,color:'#64748b',letterSpacing:1}}>
              {formation.name} · {mode==='11'?'11v11':'7v7'}
            </span>
          </div>
          {/* Roster table: POS | ชื่อจริง | ชื่อเล่น | อายุ | OVR */}
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {[
                  {h:'POS',   align:'center' as const, w:34},
                  {h:'ชื่อจริง', align:'left'   as const, w:undefined},
                  {h:'ชื่อเล่น', align:'left'   as const, w:undefined},
                  {h:'อายุ',  align:'center' as const, w:32},
                  {h:'OVR',   align:'center' as const, w:36},
                ].map(({h,align,w})=>(
                  <th key={h} style={{
                    padding:'3px 5px',fontSize:'0.55rem',fontWeight:800,letterSpacing:1,
                    color:'#64748b',textTransform:'uppercase',borderBottom:'1.5pt solid #cbd5e1',
                    textAlign:align, whiteSpace:'nowrap', width:w,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formation.positions.map((pos,idx)=>{
                const ath=athletes.find(a=>a.PlayerID===assign[pos.id]);
                const rating=Math.round(Number(ath?.Latest?.Rating)||0);
                const dob=ath?.DOB||'';
                const age=dob&&dob!=='-'
                  ? (()=>{ const d=new Date(dob); return isNaN(d.getTime())?null:Math.floor((Date.now()-d.getTime())/31557600000); })()
                  : null;
                return(
                  <tr key={pos.id} style={{background:idx%2===0?'#fff':'#f8fafc',borderBottom:'0.5pt solid #f1f5f9'}}>
                    <td style={{padding:'6px 5px',textAlign:'center'}}>
                      <span style={{background:'#0f172a',color:'white',borderRadius:3,padding:'2px 5px',
                        fontSize:'0.58rem',fontWeight:800,display:'inline-block'}}>
                        {pos.label}
                      </span>
                    </td>
                    <td style={{padding:'6px 5px',fontSize:'0.72rem',fontWeight:600,
                      color:ath?'#1e293b':'#cbd5e1',maxWidth:120,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {ath?.Name||<em style={{fontStyle:'italic',color:'#cbd5e1',fontWeight:400}}>—</em>}
                    </td>
                    <td style={{padding:'6px 5px',fontSize:'0.72rem',fontWeight:700,
                      color:ath?.Nickname?'#0f172a':'#cbd5e1',maxWidth:100,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {ath?.Nickname||<em style={{fontStyle:'italic',color:'#cbd5e1',fontWeight:400}}>—</em>}
                    </td>
                    <td style={{padding:'6px 5px',textAlign:'center',fontSize:'0.72rem',
                      fontWeight:600,color:age!=null?'#334155':'#cbd5e1'}}>
                      {age!=null?age:'—'}
                    </td>
                    <td style={{padding:'6px 5px',textAlign:'center',fontWeight:900,
                      fontSize:'0.85rem',color:ath&&rating?'#0f172a':'#cbd5e1'}}>
                      {ath&&rating?rating:'—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{marginTop:10,fontSize:'0.52rem',fontWeight:600,color:'#94a3b8',
            letterSpacing:2,textTransform:'uppercase',textAlign:'center'}}>
            ISP
          </div>
        </div>

        {/* ── RIGHT: Roster panel ── */}
        {showPanel&&(
          <div className="no-print" style={{flex:'0 0 260px',display:'flex',flexDirection:'column',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:14,position:'sticky',top:80}}
            onDragOver={e=>e.preventDefault()} onDrop={onRosterDrop}>

            <div style={{fontWeight:700,fontSize:'0.875rem',marginBottom:10,display:'flex',justifyContent:'space-between'}}>
              <span><i className="bi bi-people-fill me-2" style={{color:'#38bdf8'}}/>นักกีฬา</span>
              <span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{athletes.length-assignedIds.size} เหลือ</span>
            </div>

            <input className="form-control" style={{fontSize:'0.78rem',marginBottom:6}} placeholder="ชื่อทีม (แสดงบนสนาม)..." value={teamName} onChange={e=>setTeamName(e.target.value)}/>
            <input className="form-control" style={{fontSize:'0.78rem',marginBottom:8}} placeholder="URL โลโก้ทีม (ถ้ามี)..." value={teamLogo} onChange={e=>setTeamLogo(e.target.value)}/>

            <div className="search-wrap" style={{marginBottom:8}}>
              <i className="bi bi-search"/><input className="form-control" placeholder="ค้นหา..." value={search} onChange={e=>setSearch(e.target.value)} style={{fontSize:'0.8rem'}}/>
            </div>

            <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
              {(['ALL','GK','DEF','MID','FWD'] as const).map(r=>(
                <button key={r} onClick={()=>setRf(r)} style={{padding:'3px 8px',borderRadius:5,fontSize:'0.68rem',fontWeight:700,cursor:'pointer',background:rf===r?'#38bdf8':'var(--bg)',color:rf===r?'white':'var(--text-muted)',border:`1px solid ${rf===r?'transparent':'var(--border)'}`}}>{r}</button>
              ))}
            </div>

            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <input className="form-control" style={{fontSize:'0.75rem',flex:1}} placeholder="ชื่อ lineup..." value={lname} onChange={e=>setLname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSave()}/>
              <button className="btn-primary btn-sm" onClick={handleSave}><i className="bi bi-save"/></button>
            </div>

            {selAth&&<div style={{marginBottom:8,padding:'6px 10px',background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:7,fontSize:'0.7rem',color:'#38bdf8',fontWeight:600}}><i className="bi bi-cursor-fill me-1"/>กดตำแหน่งบนสนามเพื่อวาง</div>}

            <div style={{maxHeight:'calc(100vh - 500px)',overflowY:'auto',display:'flex',flexDirection:'column',gap:5}}>
              {roster.length===0&&<div style={{textAlign:'center',padding:16,color:'var(--text-muted)',fontSize:'0.8rem'}}>ไม่พบนักกีฬา</div>}
              {roster.map(a=>{
                const inLU=assignedIds.has(a.PlayerID);const isSel=selAth===a.PlayerID;
                const rating=Number(a.Latest?.Rating)||0;
                return(
                  <div key={a.PlayerID} draggable={!inLU} onDragStart={e=>!inLU&&onRosterDragStart(e,a.PlayerID)}
                    onClick={()=>!inLU&&setSelAth(prev=>prev===a.PlayerID?null:a.PlayerID)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'6px 9px',borderRadius:9,border:`2px solid ${isSel?'#38bdf8':'var(--border)'}`,background:inLU?'var(--bg)':isSel?'rgba(56,189,248,0.08)':'var(--bg)',opacity:inLU?0.35:1,cursor:inLU?'default':'grab',transition:'all 0.12s'}}
                  >
                    {/* Mini gold card */}
                    <div style={{width:34,height:47,borderRadius:5,flexShrink:0,overflow:'hidden',position:'relative',background:'linear-gradient(160deg,#a06a00,#f0d050,#c89020)',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>
                      {a.PhotoUrl?<img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>
                        :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:'0.65rem',fontWeight:900,color:'rgba(0,0,0,0.4)'}}>{ini(a.Name)}</span></div>}
                      <div style={{position:'absolute',top:1,left:2,fontSize:'0.42rem',fontWeight:900,color:'rgba(0,0,0,0.6)',lineHeight:1}}>{rating||'—'}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.Name}</div>
                      <div style={{display:'flex',gap:4,marginTop:2}}>
                        {a.Position&&<span style={{fontSize:'0.58rem',fontWeight:700,background:'rgba(56,189,248,0.12)',color:'#38bdf8',borderRadius:3,padding:'1px 4px'}}>{a.Position}</span>}
                        {a.Team&&<span style={{fontSize:'0.58rem',color:'var(--text-muted)'}}>{a.Team}</span>}
                      </div>
                    </div>
                    {inLU&&<i className="bi bi-check-circle-fill" style={{color:'#10b981',fontSize:'0.8rem',flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>}

    </div>
  );
}
