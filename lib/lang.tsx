'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Lang = 'th' | 'en';

const LABELS: Record<string, Record<Lang, string>> = {
  // Sidebar
  'Home':             { th:'Home',              en:'Home' },
  'คู่มือการใช้งาน':  { th:'คู่มือการใช้งาน',   en:'Help' },
  'Dashboard':        { th:'Dashboard',          en:'Dashboard' },
  'Roster':           { th:'Roster',             en:'Roster' },
  'Scout Report':     { th:'Scout Report',       en:'Scout Report' },
  'Skill Assessment': { th:'Skill Assessment',   en:'Skill Assessment' },
  'เช็คชื่อซ้อม':     { th:'เช็คชื่อซ้อม',       en:'Attendance' },
  'Wellness & Load':  { th:'Wellness & Load',    en:'Wellness & Load' },
  'IDP':              { th:'IDP',                en:'IDP' },
  'Compare':          { th:'Compare',            en:'Compare' },
  'Line Up':          { th:'Line Up',            en:'Line Up' },
  'Video Training':   { th:'Video Training',     en:'Video Training' },
  'Leaderboard':      { th:'Leaderboard',        en:'Leaderboard' },
  'Team Report':      { th:'Team Report',        en:'Team Report' },
  'Match Log':        { th:'Match Log',          en:'Match Log' },
  'ตารางซ้อม/แข่ง':   { th:'ตารางซ้อม/แข่ง',    en:'Calendar' },
  'Training Program': { th:'Training Program',   en:'Training Program' },
  'Update Results':   { th:'Update Results',     en:'Update Results' },
  'Quick Test':       { th:'Quick Test',         en:'Quick Test' },
  'Add Athlete':      { th:'Add Athlete',        en:'Add Athlete' },
  'เพิ่มหลายคน':      { th:'เพิ่มหลายคน',       en:'Batch Add' },
  'User Management':  { th:'User Management',    en:'User Management' },
  'Migrate Data':     { th:'Migrate Data',       en:'Migrate Data' },
  'System Tester':    { th:'System Tester',      en:'System Tester' },
  // Page titles
  'Athlete Roster':   { th:'Athlete Roster',     en:'Athlete Roster' },
  'Wellness & Training Load': { th:'Wellness & Training Load', en:'Wellness & Training Load' },
  'Add New Athlete':  { th:'Add New Athlete',    en:'Add New Athlete' },
  'ลงทะเบียนนักกีฬาใหม่': { th:'ลงทะเบียนนักกีฬาใหม่', en:'Register new athlete' },
};

interface LangCtx { lang: Lang; toggle: () => void; t: (key: string) => string; }
const LangContext = createContext<LangCtx>({ lang:'th', toggle:()=>{}, t:(k)=>k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('th');
  useEffect(() => {
    const saved = localStorage.getItem('appLang') as Lang;
    if (saved === 'en' || saved === 'th') setLang(saved);
  }, []);
  const toggle = () => setLang(l => {
    const next: Lang = l === 'th' ? 'en' : 'th';
    localStorage.setItem('appLang', next);
    return next;
  });
  const t = (key: string) => LABELS[key]?.[lang] ?? key;
  return <LangContext.Provider value={{ lang, toggle, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
