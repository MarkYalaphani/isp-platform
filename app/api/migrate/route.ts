import { NextResponse } from 'next/server';
import { supabase as sb } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { getScorePoint } from '@/lib/score';
import { calcYoyoDist, calcVo2 } from '@/lib/devData';

const GAS_URL = process.env.GAS_WEB_APP_URL!;

async function callGAS(action: string, params = {}) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  return res.json();
}

function calcRating(scores: Record<string, number>) {
  const v = Object.values(scores).filter(s => s > 0);
  return v.length ? Math.round(v.reduce((a,b)=>a+b,0)/(v.length*5)*100) : 0;
}

export async function POST() {
  const log: string[] = [];
  let athletes = 0, tests = 0, irs = 0, users = 0, errors = 0;

  try {
    // ── 0a. Fix role CHECK constraint to include club_pro ──────────────────
    try {
      const { error: rpcErr } = await sb.rpc('fix_role_constraint');
      if (rpcErr) throw rpcErr;
      log.push('✓ role constraint updated → admin | club | club_pro');
    } catch {
      log.push('⚠️ ต้องรัน SQL ใน Supabase SQL Editor:\nALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;\nALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (\'admin\',\'club\',\'club_pro\'));');
    }

    // ── 0b. Ensure app_settings table exists ─────────────────────────────
    try {
      await sb.from('app_settings').upsert(
        { key: 'club_allowed_pages', value: 'dashboard,roster,scout,teamreport,compare,lineup,ir,performance,quicktest,register,training' },
        { onConflict: 'key', ignoreDuplicates: true }
      );
      log.push('✓ app_settings table ready');
    } catch { log.push('⚠️ app_settings: ต้องสร้าง table ใน Supabase SQL editor:\nCREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());'); }

    // ── 1. Setup admin if no users ───────────────────────────────────────────
    const { count: userCount } = await sb.from('users').select('*',{count:'exact',head:true});
    if (!userCount || userCount === 0) {
      const hash = await bcrypt.hash('admin1234', 10);
      await sb.from('users').insert({ username:'admin', password_hash:hash, role:'admin', display_name:'Administrator', club_id:'' });
      log.push('✓ สร้าง admin user (admin / admin1234)');
      users++;
    } else {
      log.push(`ℹ️ มี users อยู่แล้ว ${userCount} คน`);
    }

    // ── 2. Import Users from GAS ─────────────────────────────────────────────
    try {
      const gasUsers = await callGAS('getUsers');
      if (Array.isArray(gasUsers)) {
        for (const u of gasUsers) {
          if (u.Username === 'admin') continue;
          const { error } = await sb.from('users').insert({
            username: u.Username,
            password_hash: await bcrypt.hash('Welcome123!', 10),
            role: u.Role || 'club',
            display_name: u.DisplayName || u.Username,
            club_id: u.ClubID || '',
          });
          if (!error) { users++; }
          else if (error.code !== '23505') { errors++; log.push(`✗ User ${u.Username}: ${error.message}`); }
        }
        log.push(`✓ Import users: ${users} คน (รหัสผ่านชั่วคราว: Welcome123!)`);
      }
    } catch { log.push('⚠️ ไม่สามารถ import users (ข้ามไป)'); }

    // ── 3. Import Athletes + Test Records from GAS ───────────────────────────
    let gasAthletes: Record<string,unknown>[] = [];
    try {
      const res = await callGAS('getAthleteData');
      if (Array.isArray(res)) gasAthletes = res;
      log.push(`ℹ️ พบ ${gasAthletes.length} นักกีฬาใน Google Sheets`);
    } catch { log.push('✗ ไม่สามารถดึงข้อมูลจาก Google Sheets'); return NextResponse.json({ ok: false, log }); }

    for (const a of gasAthletes) {
      const pid = String(a.PlayerID || '');
      if (!pid || !a.Name) { errors++; continue; }

      // Check if already exists
      const { data: existing } = await sb.from('athletes').select('player_id').eq('player_id', pid).maybeSingle();
      if (!existing) {
        const { error } = await sb.from('athletes').insert({
          player_id: pid,
          name: String(a.Name||''), nickname: String(a.Nickname||''),
          dob: String(a.DOB||''), team: String(a.Team||''),
          dom_hand: String(a.DomHand||'Right'), dom_foot: String(a.DomFoot||'Right'),
          position: String(a.Position||''), club: String(a.Club||''),
          province: String(a.Province||''), club_id: String(a.ClubID||''),
          photo_url: String(a.PhotoUrl||''),
        });
        if (error) { errors++; log.push(`✗ Athlete ${a.Name}: ${error.message}`); continue; }
        athletes++;
      }

      // Import test history
      const history = (a.History as Record<string,unknown>[]) || [];
      for (const t of history) {
        const dob = String(a.DOB||'');
        const agility = t.AgiL && t.AgiR
          ? (parseFloat(String(t.AgiL)) + parseFloat(String(t.AgiR))).toFixed(2)
          : String(t.Agility||'');
        const rawYoyo = String(t.YoYo||'') || (t.YoYoLevel && t.YoYoShuttle ? String(calcYoyoDist(String(t.YoYoLevel), String(t.YoYoShuttle))) : '');
        const vo2max = String(t.VO2Max||'') || (rawYoyo ? String(calcVo2(parseFloat(rawYoyo))) : '');

        const vals: Record<string,string> = {
          speed30: String(t.Speed30||''), cmj: String(t.CMJ||''), agility,
          situp: String(t.Situp||''), longjump: String(t.LongJump||''),
          yoyo: rawYoyo, pushup: String(t.Pushup||''), sitreach: String(t.SitAndReach||''),
        };
        const scores: Record<string,number> = {};
        Object.keys(vals).forEach(k => { scores[k] = getScorePoint(k, vals[k], dob); });
        const rating = Number(t.Rating||0) || calcRating(scores);

        const { error } = await sb.from('test_records').insert({
          player_id: pid,
          timestamp: t.Timestamp ? new Date(String(t.Timestamp)).toISOString() : new Date().toISOString(),
          height: String(t.Height||''), weight: String(t.Weight||''),
          muscle: String(t.Muscle||''), fat: String(t.Fat||''),
          cmj: String(t.CMJ||''), peak_power: String(t.PeakPower||''),
          bmi: String(t.BMI||''), rating,
          speed30: String(t.Speed30||''), agility, yoyo: rawYoyo,
          situp: String(t.Situp||''), long_jump: String(t.LongJump||''),
          pushup: String(t.Pushup||''), sit_and_reach: String(t.SitAndReach||''),
          agi_l: String(t.AgiL||''), agi_r: String(t.AgiR||''),
          yoyo_level: String(t.YoYoLevel||''), yoyo_shuttle: String(t.YoYoShuttle||''),
          vo2max,
        });
        if (!error) tests++;
        else errors++;
      }

      // Import IR history
      try {
        const irData = await callGAS('getIRHistory', { playerId: pid });
        if (Array.isArray(irData)) {
          for (const ir of irData) {
            const avg = (keys: string[]) => {
              const v = keys.map(k => Number(ir[k]||0)).filter(x=>x>0);
              return v.length ? v.reduce((a:number,b:number)=>a+b,0)/v.length : 0;
            };
            const bA = avg(['B_OnTime','B_Effort','B_Teamwork','B_Respect','B_Attendance','B_Participation','B_Improvement']);
            const lA = avg(['L_Sleep','L_Hydration','L_Diet','L_ScreenTime']);
            const tA = avg(['T_Motricity','T_Technical','T_Tactic','T_OffFundam','T_DefFundam','T_Fitness']);

            await sb.from('ir_reports').insert({
              player_id: pid,
              timestamp: ir.Timestamp ? new Date(String(ir.Timestamp)).toISOString() : new Date().toISOString(),
              coach: ir.Coach||'', period: ir.Period||'', season: ir.Season||'Pre-Season',
              b_ontime: +ir.B_OnTime||0, b_effort: +ir.B_Effort||0,
              b_teamwork: +ir.B_Teamwork||0, b_respect: +ir.B_Respect||0,
              b_attendance: +ir.B_Attendance||0, b_participation: +ir.B_Participation||0,
              b_improvement: +ir.B_Improvement||0,
              l_sleep: +ir.L_Sleep||0, l_hydration: +ir.L_Hydration||0,
              l_diet: +ir.L_Diet||0, l_screentime: +ir.L_ScreenTime||0,
              t_motricity: +ir.T_Motricity||0, t_technical: +ir.T_Technical||0,
              t_tactic: +ir.T_Tactic||0, t_offfundam: +ir.T_OffFundam||0,
              t_deffundam: +ir.T_DefFundam||0, t_fitness: +ir.T_Fitness||0,
              good_level: ir.GoodLevel||'', to_improve: ir.ToImprove||'', comments: ir.Comments||'',
              behaviour_score: Math.round((bA/5)*100),
              lifestyle_score: Math.round((lA/5)*100),
              technical_score: Math.round((tA/5)*100),
              overall_ir_score: Math.round(((bA+lA+tA)/15)*100),
            });
            irs++;
          }
        }
      } catch { /* IR optional */ }
    }

    log.push(`✓ นักกีฬา: ${athletes} คน`);
    log.push(`✓ ผลการทดสอบ: ${tests} records`);
    log.push(`✓ IR Reports: ${irs} records`);
    if (errors > 0) log.push(`⚠️ Errors: ${errors} (ดู console)`);

    return NextResponse.json({ ok: true, athletes, tests, irs, users, errors, log });
  } catch (err) {
    console.error('[Migrate]', err);
    return NextResponse.json({ ok: false, log: [...log, `✗ Fatal: ${err}`] });
  }
}
