import { NextRequest, NextResponse } from 'next/server';
import { supabase as sb } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { getScorePoint } from '@/lib/score';
import { calcYoyoDist, calcVo2 } from '@/lib/devData';
import { signToken, verifyToken, SessionPayload } from '@/lib/session';

// Actions that don't require a login token
const PUBLIC_ACTIONS = new Set(['login', 'setup', 'getCheckInInfo', 'submitCheckIn']);
// Actions that require admin role
const ADMIN_ONLY_ACTIONS = new Set(['deleteAthlete', 'deleteUser', 'deleteIR', 'deleteTestRecord', 'deleteTrainingVideo']);

function getSession(req: NextRequest): SessionPayload | null {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
}

// ─── Transformers ─────────────────────────────────────────────────────────────
function toTestRecord(r: Record<string, unknown>) {
  return {
    id:           String(r.id           || ''),
    Timestamp:    String(r.timestamp    || ''),
    PlayerID:     String(r.player_id    || ''),
    Height:       String(r.height       || ''),
    Weight:       String(r.weight       || ''),
    Muscle:       String(r.muscle       || ''),
    Fat:          String(r.fat          || ''),
    CMJ:          String(r.cmj          || ''),
    PeakPower:    String(r.peak_power   || ''),
    BMI:          String(r.bmi          || ''),
    Rating:       Number(r.rating       || 0),
    Speed30:      String(r.speed30      || ''),
    Agility:      String(r.agility      || ''),
    YoYo:         String(r.yoyo         || ''),
    Situp:        String(r.situp        || ''),
    LongJump:     String(r.long_jump    || ''),
    Pushup:       String(r.pushup       || ''),
    SitAndReach:  String(r.sit_and_reach|| ''),
    AgiL:         String(r.agi_l        || ''),
    AgiR:         String(r.agi_r        || ''),
    YoYoLevel:    String(r.yoyo_level   || ''),
    YoYoShuttle:  String(r.yoyo_shuttle || ''),
    VO2Max:       String(r.vo2max       || ''),
  };
}

function toIRReport(r: Record<string, unknown>) {
  return {
    id:              String(r.id               || ''),
    Timestamp:       String(r.timestamp        || ''),
    PlayerID:        String(r.player_id         || ''),
    Coach:           String(r.coach             || ''),
    Period:          String(r.period            || ''),
    Season:          String(r.season            || ''),
    B_OnTime:        Number(r.b_ontime          || 0),
    B_Effort:        Number(r.b_effort          || 0),
    B_Teamwork:      Number(r.b_teamwork        || 0),
    B_Respect:       Number(r.b_respect         || 0),
    B_Attendance:    Number(r.b_attendance      || 0),
    B_Participation: Number(r.b_participation   || 0),
    B_Improvement:   Number(r.b_improvement     || 0),
    L_Sleep:         Number(r.l_sleep           || 0),
    L_Hydration:     Number(r.l_hydration       || 0),
    L_Diet:          Number(r.l_diet            || 0),
    L_ScreenTime:    Number(r.l_screentime      || 0),
    T_Motricity:     Number(r.t_motricity       || 0),
    T_Technical:     Number(r.t_technical       || 0),
    T_Tactic:        Number(r.t_tactic          || 0),
    T_OffFundam:     Number(r.t_offfundam       || 0),
    T_DefFundam:     Number(r.t_deffundam       || 0),
    T_Fitness:       Number(r.t_fitness         || 0),
    Med_Period1:     String(r.med_period1       || ''),
    Med_Injury1:     String(r.med_injury1       || ''),
    Med_Absence1:    String(r.med_absence1      || ''),
    Med_Period2:     String(r.med_period2       || ''),
    Med_Injury2:     String(r.med_injury2       || ''),
    Med_Absence2:    String(r.med_absence2      || ''),
    GoodLevel:       String(r.good_level        || ''),
    ToImprove:       String(r.to_improve        || ''),
    Comments:        String(r.comments          || ''),
    BehaviourScore:  Number(r.behaviour_score   || 0),
    LifestyleScore:  Number(r.lifestyle_score   || 0),
    TechnicalScore:  Number(r.technical_score   || 0),
    OverallIRScore:  Number(r.overall_ir_score  || 0),
  };
}

function toSkillAssessment(r: Record<string, unknown>) {
  return {
    id: String(r.id || ''),
    playerId: String(r.player_id || ''),
    assessedAt: String(r.assessed_at || ''),
    assessedBy: String(r.assessed_by || ''),
    season: String(r.season || ''),
    skFirstTouch: Number(r.sk_first_touch || 0), skBallControl: Number(r.sk_ball_control || 0),
    skReceiving: Number(r.sk_receiving || 0),     skWeakFoot: Number(r.sk_weak_foot || 0),
    skPressureCtrl: Number(r.sk_pressure_ctrl || 0),
    skPassAccuracy: Number(r.sk_pass_accuracy || 0), skShortPass: Number(r.sk_short_pass || 0),
    skLongPass: Number(r.sk_long_pass || 0),     skThroughPass: Number(r.sk_through_pass || 0),
    skOneTouch: Number(r.sk_one_touch || 0),     skPassPressure: Number(r.sk_pass_pressure || 0),
    skDribbleSpeed: Number(r.sk_dribble_speed || 0), skDirectionChange: Number(r.sk_direction_change || 0),
    skBeatOpp: Number(r.sk_beat_opp || 0),       skTightSpace: Number(r.sk_tight_space || 0),
    skSkillExec: Number(r.sk_skill_exec || 0),
    skShootAccuracy: Number(r.sk_shoot_accuracy || 0), skShotPower: Number(r.sk_shot_power || 0),
    skWeakFinish: Number(r.sk_weak_finish || 0), skFinishPressure: Number(r.sk_finish_pressure || 0),
    skFirstTime: Number(r.sk_first_time || 0),
    skPositioning: Number(r.sk_positioning || 0), skScanning: Number(r.sk_scanning || 0),
    skDecision: Number(r.sk_decision || 0),      skOffBall: Number(r.sk_off_ball || 0),
    skSpatial: Number(r.sk_spatial || 0),        skTransition: Number(r.sk_transition || 0),
    scoreBallControl: Number(r.score_ball_control || 0), scorePassing: Number(r.score_passing || 0),
    scoreDribbling: Number(r.score_dribbling || 0),      scoreShooting: Number(r.score_shooting || 0),
    scoreTactical: Number(r.score_tactical || 0),        scoreTotal: Number(r.score_total || 0),
    notes: String(r.notes || ''),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function uploadPhoto(playerId: string, base64: string, mimeType: string): Promise<string> {
  if (!base64 || !base64.startsWith('data:')) return '';
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(data, 'base64');
  const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `athletes/${playerId}.${ext}`;
  const { error } = await sb.storage.from('athlete-photos').upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) { console.error('Photo upload:', error.message); return ''; }
  return sb.storage.from('athlete-photos').getPublicUrl(path).data.publicUrl;
}

async function uploadLogo(username: string, base64: string, mimeType: string): Promise<string> {
  if (!base64 || !base64.startsWith('data:')) return '';
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(data, 'base64');
  const ext = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const path = `logos/${username}.${ext}`;
  const { error } = await sb.storage.from('athlete-photos').upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) { console.error('Logo upload:', error.message); return ''; }
  return sb.storage.from('athlete-photos').getPublicUrl(path).data.publicUrl;
}

function genPlayerId(): string {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `ATH-${ds}-${Math.floor(Math.random()*900+100)}`;
}

function calcRating(scores: Record<string, number>): number {
  const valid = Object.values(scores).filter(s => s > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / (valid.length * 5) * 100);
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: 'ok', backend: 'supabase' });
}

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await req.json() as any;
  const action: string = body.action ?? '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = body.params ?? {};

  // ── Auth gate ────────────────────────────────────────────────────────────
  let session: SessionPayload | null = null;
  if (!PUBLIC_ACTIONS.has(action)) {
    session = getSession(req);
    if (!session) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }
    if (ADMIN_ONLY_ACTIONS.has(action) && session.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    switch (action) {

      // ── SETUP: สร้าง admin ครั้งแรก ──────────────────────────────────────
      case 'setup': {
        const { count } = await sb.from('users').select('*', { count: 'exact', head: true });
        if (count && count > 0)
          return NextResponse.json({ status: 'exists', message: 'มีผู้ใช้ในระบบแล้ว' });
        const hash = await bcrypt.hash('admin1234', 10);
        const { error } = await sb.from('users').insert({
          username: 'admin', password_hash: hash,
          role: 'admin', display_name: 'Administrator', club_id: '',
        });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'สร้าง admin สำเร็จ (รหัสผ่าน: admin1234)' });
      }

      // ── LOGIN ──────────────────────────────────────────────────────────────
      case 'login': {
        const { username, password } = params;
        const { data: user } = await sb.from('users').select('*').eq('username', username).single();
        if (!user) return NextResponse.json({ status: 'error', message: 'ไม่พบผู้ใช้' });

        const valid = user.password_hash.startsWith('$2')
          ? await bcrypt.compare(password, user.password_hash)
          : password === user.password_hash;

        if (!valid) return NextResponse.json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });

        const token = signToken({ username: user.username, role: user.role, clubId: user.club_id || '', iat: Date.now() });
        return NextResponse.json({
          status: 'success',
          token,
          user: { username: user.username, role: user.role, displayName: user.display_name, clubId: user.club_id, logoUrl: user.logo_url || '' },
        });
      }

      // ── GET ATHLETES ───────────────────────────────────────────────────────
      case 'getAthleteData': {
        // Use verified session — never trust role/clubId from client
        const { role, clubId } = session!;
        let q = sb.from('athletes').select('*, test_records(*)').order('name');
        if (role !== 'admin' && clubId) q = q.eq('club_id', clubId);

        const { data, error } = await q;
        if (error) throw error;

        return NextResponse.json((data || []).map(a => {
          const records = ((a.test_records as Record<string,unknown>[]) || [])
            .sort((x, y) => new Date(String(x.timestamp)).getTime() - new Date(String(y.timestamp)).getTime());
          return {
            PlayerID: a.player_id, Name: a.name, Nickname: a.nickname || '',
            DOB: a.dob || '', Team: a.team || '', DomHand: a.dom_hand || '',
            DomFoot: a.dom_foot || '', Position: a.position || '',
            Club: a.club || '', Province: a.province || '',
            ClubID: a.club_id || '', PhotoUrl: a.photo_url || '',
            History: records.map(toTestRecord),
            Latest: records.length ? toTestRecord(records[records.length - 1]) : {},
          };
        }));
      }

      // ── SAVE ATHLETE ───────────────────────────────────────────────────────
      case 'saveAthlete': {
        const { name, nickname, dob, team, domHand, domFoot, position, club, province, clubId, photoBase64, photoMimeType } = params;
        if (!name) return NextResponse.json({ status: 'error', message: 'กรุณากรอกชื่อ' });

        let playerId = genPlayerId();
        for (let i = 0; i < 5; i++) {
          const { data } = await sb.from('athletes').select('player_id').eq('player_id', playerId).maybeSingle();
          if (!data) break;
          playerId = genPlayerId();
        }

        const photoUrl = photoBase64 ? await uploadPhoto(playerId, photoBase64, photoMimeType || 'image/jpeg') : '';

        const { error } = await sb.from('athletes').insert({
          player_id: playerId, name, nickname: nickname || '', dob: dob || '',
          team: team || '', dom_hand: domHand || 'Right', dom_foot: domFoot || 'Right',
          position: position || '', club: club || '', province: province || '',
          club_id: clubId || '', photo_url: photoUrl,
        });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: `ลงทะเบียน ${name} สำเร็จ (ID: ${playerId})` });
      }

      // ── UPDATE ATHLETE ─────────────────────────────────────────────────────
      case 'updateAthlete': {
        const { playerId, name, nickname, dob, team, domHand, domFoot, position, club, province, photoBase64, photoMimeType } = params;
        const upd: Record<string, unknown> = {
          name, nickname: nickname || '', dob: dob || '', team: team || '',
          dom_hand: domHand || 'Right', dom_foot: domFoot || 'Right',
          position: position || '', club: club || '', province: province || '',
        };
        if (photoBase64) {
          const url = await uploadPhoto(playerId, photoBase64, photoMimeType || 'image/jpeg');
          if (url) upd.photo_url = url;
        }
        const { error } = await sb.from('athletes').update(upd).eq('player_id', playerId);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'อัปเดตข้อมูลสำเร็จ' });
      }

      // ── DELETE ATHLETE ─────────────────────────────────────────────────────
      case 'deleteAthlete': {
        const { playerId } = params;
        const { error } = await sb.from('athletes').delete().eq('player_id', playerId);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'ลบสำเร็จ' });
      }

      // ── SAVE TEST ──────────────────────────────────────────────────────────
      case 'saveTest': {
        const f = params;
        if (!f.playerId) return NextResponse.json({ status: 'error', message: 'ไม่พบนักกีฬา' });

        const { data: ath } = await sb.from('athletes').select('dob').eq('player_id', f.playerId).single();
        const dob = ath?.dob || '';

        const bmi = f.height && f.weight
          ? (parseFloat(f.weight) / Math.pow(parseFloat(f.height) / 100, 2)).toFixed(2) : f.bmi || '';
        const peakPower = f.cmj && f.weight
          ? String(Math.max(0, Math.round(60.7 * parseFloat(f.cmj) + 45.3 * parseFloat(f.weight) - 2055))) : '';
        const agility = f.agiL && f.agiR
          ? (parseFloat(f.agiL) + parseFloat(f.agiR)).toFixed(2) : f.agility || '';

        const rawYoyo = f.yoyo || (f.yoyoLevel && f.yoyoShuttle ? String(calcYoyoDist(f.yoyoLevel, f.yoyoShuttle)) : '');
        const vo2max  = f.vo2max || (rawYoyo ? String(calcVo2(parseFloat(rawYoyo))) : '');

        const vals: Record<string, string> = {
          speed30: f.speed30||'', cmj: f.cmj||'', agility,
          situp: f.situp||'', longjump: f.longJump||'',
          yoyo: rawYoyo, pushup: f.pushup||'', sitreach: f.sitReach||'',
        };
        const scores: Record<string, number> = {};
        Object.keys(vals).forEach(k => { scores[k] = getScorePoint(k, vals[k], dob); });
        const rating = calcRating(scores);

        const { error } = await sb.from('test_records').insert({
          player_id: f.playerId,
          height: f.height||'', weight: f.weight||'', muscle: f.muscle||'', fat: f.fat||'',
          cmj: f.cmj||'', peak_power: peakPower, bmi, rating,
          speed30: f.speed30||'', agility, yoyo: rawYoyo,
          situp: f.situp||'', long_jump: f.longJump||'', pushup: f.pushup||'',
          sit_and_reach: f.sitReach||'', agi_l: f.agiL||'', agi_r: f.agiR||'',
          yoyo_level: f.yoyoLevel||'', yoyo_shuttle: f.yoyoShuttle||'', vo2max,
        });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'บันทึกผลการทดสอบสำเร็จ' });
      }

      // ── SAVE IR ────────────────────────────────────────────────────────────
      case 'saveIR': {
        const f = params;
        if (!f.playerId) return NextResponse.json({ status: 'error', message: 'ไม่พบนักกีฬา' });

        const avg = (keys: string[]) => {
          const v = keys.map(k => Number(f[k]||0)).filter(x => x > 0);
          return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
        };
        const bAvg = avg(['b_ontime','b_effort','b_teamwork','b_respect','b_attendance','b_participation','b_improvement']);
        const lAvg = avg(['l_sleep','l_hydration','l_diet','l_screentime']);
        const tAvg = avg(['t_motricity','t_technical','t_tactic','t_offfundam','t_deffundam','t_fitness']);

        const { error } = await sb.from('ir_reports').insert({
          player_id: f.playerId, coach: f.coach||'', period: f.period||'', season: f.season||'Pre-Season',
          b_ontime: +f.b_ontime||0, b_effort: +f.b_effort||0, b_teamwork: +f.b_teamwork||0,
          b_respect: +f.b_respect||0, b_attendance: +f.b_attendance||0,
          b_participation: +f.b_participation||0, b_improvement: +f.b_improvement||0,
          l_sleep: +f.l_sleep||0, l_hydration: +f.l_hydration||0, l_diet: +f.l_diet||0, l_screentime: +f.l_screentime||0,
          t_motricity: +f.t_motricity||0, t_technical: +f.t_technical||0, t_tactic: +f.t_tactic||0,
          t_offfundam: +f.t_offfundam||0, t_deffundam: +f.t_deffundam||0, t_fitness: +f.t_fitness||0,
          med_period1: f.med_period1||'', med_injury1: f.med_injury1||'', med_absence1: f.med_absence1||'',
          med_period2: f.med_period2||'', med_injury2: f.med_injury2||'', med_absence2: f.med_absence2||'',
          good_level: f.goodLevel||'', to_improve: f.toImprove||'', comments: f.comments||'',
          behaviour_score: Math.round((bAvg/5)*100),
          lifestyle_score:  Math.round((lAvg/5)*100),
          technical_score:  Math.round((tAvg/5)*100),
          overall_ir_score: Math.round(((bAvg+lAvg+tAvg)/15)*100),
        });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'บันทึก IR สำเร็จ' });
      }

      // ── GET IR HISTORY ─────────────────────────────────────────────────────
      case 'getIRHistory': {
        const { playerId } = params;
        const { data, error } = await sb.from('ir_reports').select('*')
          .eq('player_id', playerId).order('timestamp', { ascending: false });
        if (error) throw error;
        return NextResponse.json((data||[]).map(r => toIRReport(r as Record<string,unknown>)));
      }

      case 'deleteIR': {
        const { id } = params as { id: string };
        const { error } = await sb.from('ir_reports').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      // ── USERS ──────────────────────────────────────────────────────────────
      case 'getUsers': {
        const { data, error } = await sb.from('users')
          .select('username,role,display_name,club_id,created_at,logo_url').order('created_at');
        if (error) throw error;
        return NextResponse.json((data||[]).map(u => ({
          Username: u.username, Role: u.role,
          DisplayName: u.display_name, ClubID: u.club_id,
          CreatedAt: u.created_at, Password: '••••••••',
          LogoUrl: u.logo_url || '',
        })));
      }

      case 'addUser':
      case 'saveUser': {
        const { username, password, role, displayName, clubId } = params;
        if (!username||!password) return NextResponse.json({ status: 'error', message: 'กรุณากรอกข้อมูล' });
        const hash = await bcrypt.hash(password, 10);
        const { error } = await sb.from('users').insert({
          username, password_hash: hash, role: role||'club',
          display_name: displayName||username, club_id: clubId||'',
        });
        if (error?.code === '23505') return NextResponse.json({ status: 'error', message: 'Username นี้มีอยู่แล้ว' });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'เพิ่มผู้ใช้สำเร็จ' });
      }

      case 'updateUser': {
        const { username, role, displayName, newPassword, logoBase64, logoMimeType } = params;
        const upd: Record<string, unknown> = {
          role: role || 'club',
          display_name: displayName || username,
        };
        if (newPassword) upd.password_hash = await bcrypt.hash(newPassword, 10);
        if (logoBase64) {
          const logoUrl = await uploadLogo(username, logoBase64, logoMimeType || 'image/png');
          if (logoUrl) upd.logo_url = logoUrl;
        }
        const { error } = await sb.from('users').update(upd).eq('username', username);
        if (error) {
          // CHECK constraint violation → users table has old constraint without club_pro
          if (error.code === '23514' || error.message?.includes('users_role_check')) {
            // Try to fix constraint automatically first
            const { error: rpcErr } = await sb.rpc('fix_role_constraint');
            if (!rpcErr) {
              // Retry update after fixing constraint
              const { error: retryErr } = await sb.from('users').update(upd).eq('username', username);
              if (!retryErr) return NextResponse.json({ status: 'success', message: 'แก้ไขผู้ใช้สำเร็จ (อัพเดท constraint อัตโนมัติ)' });
            }
            return NextResponse.json({
              status: 'error',
              message: 'ต้องรัน SQL ใน Supabase SQL Editor ก่อน:\nALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;\nALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (\'admin\',\'club\',\'club_pro\'));\nหรือไปที่หน้า Migrate แล้วกด Run Migration'
            });
          }
          throw error;
        }
        return NextResponse.json({ status: 'success', message: 'แก้ไขผู้ใช้สำเร็จ' });
      }

      case 'deleteUser': {
        const { username } = params;
        const { error } = await sb.from('users').delete().eq('username', username);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'ลบผู้ใช้สำเร็จ' });
      }

      // ── GLOBAL CLUB SETTINGS ───────────────────────────────────────────────
      case 'getClubSettings': {
        const allPages = 'dashboard,roster,scout,skill,attendance,wellness,ir,compare,lineup,teamreport,performance,quicktest,register,training';
        try {
          const { data } = await sb.from('app_settings').select('value').eq('key','club_allowed_pages').single();
          return NextResponse.json({ pages: data?.value ?? allPages });
        } catch {
          return NextResponse.json({ pages: allPages });
        }
      }

      case 'saveClubSettings': {
        const { pages } = params as { pages: string };
        const { error } = await sb.from('app_settings')
          .upsert({ key: 'club_allowed_pages', value: pages, updated_at: new Date().toISOString() });
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      case 'updateProfile': {
        const { username, displayName, logoBase64, logoMimeType } = params;
        const upd: Record<string, unknown> = { display_name: displayName || '' };
        let logoUrl = '';
        if (logoBase64) {
          logoUrl = await uploadLogo(username, logoBase64, logoMimeType || 'image/png');
          if (logoUrl) upd.logo_url = logoUrl;
        }
        const { error } = await sb.from('users').update(upd).eq('username', username);
        if (error) {
          if (error.message?.includes('logo_url')) {
            delete upd.logo_url;
            const { error: e2 } = await sb.from('users').update(upd).eq('username', username);
            if (e2) throw e2;
            return NextResponse.json({ status: 'success', logoUrl: '', message: 'บันทึกสำเร็จ (logo ต้องเพิ่มคอลัมน์ logo_url ใน users table)' });
          }
          throw error;
        }
        return NextResponse.json({ status: 'success', logoUrl });
      }

      // ── SKILL ASSESSMENTS ──────────────────────────────────────────────────
      case 'getSkillAssessments': {
        const { playerId } = params as { playerId: string };
        const q = sb.from('skill_assessments').select('*').order('assessed_at', { ascending: false });
        const { data, error } = playerId ? await q.eq('player_id', playerId) : await q.limit(200);
        if (error) throw error;
        return NextResponse.json((data || []).map(toSkillAssessment));
      }

      case 'saveSkillAssessment': {
        const p = params as Record<string, unknown>;
        const row = {
          player_id: p.playerId,
          assessed_at: p.assessedAt || new Date().toISOString(),
          assessed_by: p.assessedBy || '',
          season: p.season || '',
          sk_first_touch: p.skFirstTouch||0, sk_ball_control: p.skBallControl||0,
          sk_receiving: p.skReceiving||0,    sk_weak_foot: p.skWeakFoot||0,
          sk_pressure_ctrl: p.skPressureCtrl||0,
          sk_pass_accuracy: p.skPassAccuracy||0, sk_short_pass: p.skShortPass||0,
          sk_long_pass: p.skLongPass||0,    sk_through_pass: p.skThroughPass||0,
          sk_one_touch: p.skOneTouch||0,    sk_pass_pressure: p.skPassPressure||0,
          sk_dribble_speed: p.skDribbleSpeed||0, sk_direction_change: p.skDirectionChange||0,
          sk_beat_opp: p.skBeatOpp||0,      sk_tight_space: p.skTightSpace||0,
          sk_skill_exec: p.skSkillExec||0,
          sk_shoot_accuracy: p.skShootAccuracy||0, sk_shot_power: p.skShotPower||0,
          sk_weak_finish: p.skWeakFinish||0, sk_finish_pressure: p.skFinishPressure||0,
          sk_first_time: p.skFirstTime||0,
          sk_positioning: p.skPositioning||0, sk_scanning: p.skScanning||0,
          sk_decision: p.skDecision||0,     sk_off_ball: p.skOffBall||0,
          sk_spatial: p.skSpatial||0,       sk_transition: p.skTransition||0,
          score_ball_control: p.scoreBallControl||0, score_passing: p.scorePassing||0,
          score_dribbling: p.scoreDribbling||0,      score_shooting: p.scoreShooting||0,
          score_tactical: p.scoreTactical||0,        score_total: p.scoreTotal||0,
          notes: p.notes || '',
        };
        if (p.id) {
          const { error } = await sb.from('skill_assessments').update(row).eq('id', p.id as string);
          if (error) throw error;
        } else {
          const { error } = await sb.from('skill_assessments').insert(row);
          if (error) throw error;
        }
        return NextResponse.json({ status: 'success', message: 'บันทึกผลการประเมินสำเร็จ' });
      }

      case 'deleteSkillAssessment': {
        const { id } = params as { id: string };
        const { error } = await sb.from('skill_assessments').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      // ── ATTENDANCE ─────────────────────────────────────────────────────────
      case 'getAttendanceSessions': {
        // Returns distinct sessions (date+name+type) ordered by date desc
        const { data, error } = await sb.from('attendance')
          .select('session_date,session_name,session_type')
          .order('session_date', { ascending: false });
        if (error) throw error;
        // Deduplicate
        const seen = new Set<string>();
        const sessions = (data || []).filter(r => {
          const k = `${r.session_date}|${r.session_name}`;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        });
        return NextResponse.json(sessions);
      }

      case 'getAttendanceBySession': {
        const { sessionDate, sessionName } = params as { sessionDate: string; sessionName: string };
        const { data, error } = await sb.from('attendance')
          .select('*').eq('session_date', sessionDate).eq('session_name', sessionName);
        if (error) throw error;
        return NextResponse.json((data || []).map(r => ({
          id: r.id, sessionDate: r.session_date, sessionName: r.session_name,
          sessionType: r.session_type, playerId: r.player_id,
          status: r.status, notes: r.notes || '', createdBy: r.created_by || '',
        })));
      }

      case 'getAttendanceByPlayer': {
        const { playerId } = params as { playerId: string };
        const { data, error } = await sb.from('attendance')
          .select('*').eq('player_id', playerId).order('session_date', { ascending: false });
        if (error) throw error;
        return NextResponse.json((data || []).map(r => ({
          id: r.id, sessionDate: r.session_date, sessionName: r.session_name,
          sessionType: r.session_type, playerId: r.player_id,
          status: r.status, notes: r.notes || '', createdBy: r.created_by || '',
        })));
      }

      case 'saveAttendance': {
        // Upsert multiple records for a session
        const { records } = params as { records: Array<{ sessionDate:string; sessionName:string; sessionType:string; playerId:string; status:string; notes?:string; createdBy?:string }> };
        if (!records?.length) return NextResponse.json({ status:'success' });
        const rows = records.map(r => ({
          session_date: r.sessionDate, session_name: r.sessionName,
          session_type: r.sessionType || 'training', player_id: r.playerId,
          status: r.status, notes: r.notes || '', created_by: r.createdBy || '',
        }));
        const { error } = await sb.from('attendance')
          .upsert(rows, { onConflict: 'session_date,session_name,player_id' });
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: `บันทึก ${rows.length} รายการ` });
      }

      case 'deleteAttendanceSession': {
        const { sessionDate, sessionName } = params as { sessionDate: string; sessionName: string };
        const { error } = await sb.from('attendance')
          .delete().eq('session_date', sessionDate).eq('session_name', sessionName);
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      // ── WELLNESS CHECK ────────────────────────────────────────────────────
      case 'saveWellness': {
        const { records } = params as { records: Array<{ playerId:string; checkDate:string; fatigue:number; sleepQuality:number; soreness:number; stress:number; mood:number; notes?:string; createdBy?:string }> };
        if (!records?.length) return NextResponse.json({ status:'success', message:'0 รายการ' });
        const rows = records.map(r => {
          const ws = Math.round(([r.fatigue,r.sleepQuality,r.soreness,r.stress,r.mood].reduce((a,b)=>a+b,0)/25)*100);
          return { player_id:r.playerId, check_date:r.checkDate, fatigue:r.fatigue, sleep_quality:r.sleepQuality, soreness:r.soreness, stress:r.stress, mood:r.mood, wellness_score:ws, notes:r.notes||'', created_by:r.createdBy||'' };
        });
        const { error } = await sb.from('wellness_checks').upsert(rows, { onConflict:'player_id,check_date' });
        if (error) throw error;
        return NextResponse.json({ status:'success', message:`บันทึก ${rows.length} รายการ` });
      }

      case 'getWellnessByDate': {
        const { checkDate } = params as { checkDate:string };
        const { data, error } = await sb.from('wellness_checks').select('*').eq('check_date', checkDate);
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, playerId:r.player_id, checkDate:r.check_date, fatigue:r.fatigue, sleepQuality:r.sleep_quality, soreness:r.soreness, stress:r.stress, mood:r.mood, wellnessScore:r.wellness_score, notes:r.notes||'', createdBy:r.created_by||'' })));
      }

      case 'getWellnessByPlayer': {
        const { playerId, limit: lim } = params as { playerId:string; limit?:number };
        const { data, error } = await sb.from('wellness_checks').select('*').eq('player_id', playerId).order('check_date',{ascending:false}).limit(lim||30);
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, playerId:r.player_id, checkDate:r.check_date, fatigue:r.fatigue, sleepQuality:r.sleep_quality, soreness:r.soreness, stress:r.stress, mood:r.mood, wellnessScore:r.wellness_score, notes:r.notes||'', createdBy:r.created_by||'' })));
      }

      // ── TRAINING RPE ───────────────────────────────────────────────────────
      case 'saveRPE': {
        const { records } = params as { records: Array<{ playerId:string; sessionDate:string; sessionName:string; sessionType:string; rpe:number; durationMin:number; notes?:string; createdBy?:string }> };
        if (!records?.length) return NextResponse.json({ status:'success', message:'0 รายการ' });
        const rows = records.map(r => ({
          player_id:r.playerId, session_date:r.sessionDate, session_name:r.sessionName,
          session_type:r.sessionType||'training', rpe:r.rpe, duration_min:r.durationMin,
          training_load:r.rpe*r.durationMin, notes:r.notes||'', created_by:r.createdBy||'',
        }));
        const { error } = await sb.from('training_rpe').upsert(rows, { onConflict:'player_id,session_date,session_name' });
        if (error) throw error;
        return NextResponse.json({ status:'success', message:`บันทึก ${rows.length} รายการ` });
      }

      case 'getRPEByDate': {
        const { sessionDate, sessionName } = params as { sessionDate:string; sessionName?:string };
        let q = sb.from('training_rpe').select('*').eq('session_date', sessionDate);
        if (sessionName) q = q.eq('session_name', sessionName);
        const { data, error } = await q;
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, playerId:r.player_id, sessionDate:r.session_date, sessionName:r.session_name, sessionType:r.session_type, rpe:r.rpe, durationMin:r.duration_min, trainingLoad:r.training_load, notes:r.notes||'', createdBy:r.created_by||'' })));
      }

      case 'getRPEByPlayer': {
        const { playerId, limit: lim } = params as { playerId:string; limit?:number };
        const { data, error } = await sb.from('training_rpe').select('*').eq('player_id', playerId).order('session_date',{ascending:false}).limit(lim||30);
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, playerId:r.player_id, sessionDate:r.session_date, sessionName:r.session_name, sessionType:r.session_type, rpe:r.rpe, durationMin:r.duration_min, trainingLoad:r.training_load, notes:r.notes||'', createdBy:r.created_by||'' })));
      }

      // ── TEAM TREND SUMMARIES ───────────────────────────────────────────────
      case 'getTeamWellnessSummary': {
        const { playerIds, days } = params as { playerIds: string[]; days?: number };
        if (!playerIds?.length) return NextResponse.json([]);
        let q = sb.from('wellness_checks').select('player_id,check_date,fatigue,sleep_quality,soreness,stress,mood,wellness_score').in('player_id', playerIds);
        if (days) {
          const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
          q = q.gte('check_date', from);
        }
        const { data, error } = await q.order('check_date', { ascending: true });
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ playerId:r.player_id, checkDate:r.check_date, fatigue:r.fatigue, sleepQuality:r.sleep_quality, soreness:r.soreness, stress:r.stress, mood:r.mood, wellnessScore:r.wellness_score })));
      }

      case 'getTeamRPESummary': {
        const { playerIds, days } = params as { playerIds: string[]; days?: number };
        if (!playerIds?.length) return NextResponse.json([]);
        let q = sb.from('training_rpe').select('player_id,session_date,session_name,session_type,rpe,duration_min,training_load').in('player_id', playerIds);
        if (days) {
          const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
          q = q.gte('session_date', from);
        }
        const { data, error } = await q.order('session_date', { ascending: true });
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ playerId:r.player_id, sessionDate:r.session_date, sessionName:r.session_name, sessionType:r.session_type, rpe:r.rpe, durationMin:r.duration_min, trainingLoad:r.training_load })));
      }

      // ── MATCH LOG ─────────────────────────────────────────────────────────
      case 'saveMatch': {
        const { stats: matchStats, ...matchData } = params as { stats?: unknown[]; [k: string]: unknown };
        const { data: m, error: me } = await sb.from('matches').insert({ club_id: matchData.clubId, match_date: matchData.matchDate, opponent: matchData.opponent, venue: matchData.venue||'', match_type: matchData.matchType||'ลีก', team_name: matchData.teamName||'', score_for: Number(matchData.scoreFor)||0, score_against: Number(matchData.scoreAgainst)||0, result: matchData.result, notes: matchData.notes||'', created_by: matchData.createdBy||'' }).select().single();
        if (me) throw me;
        if (m && Array.isArray(matchStats) && matchStats.length > 0) {
          const rows = (matchStats as {playerId:string;minutesPlayed:number;goals:number;assists:number;yellowCards:number;redCards:number;rating:number;notes:string}[]).map(s => ({ match_id: m.id, player_id: s.playerId, minutes_played: s.minutesPlayed||0, goals: s.goals||0, assists: s.assists||0, yellow_cards: s.yellowCards||0, red_cards: s.redCards||0, rating: s.rating||0, notes: s.notes||'' }));
          await sb.from('match_stats').insert(rows);
        }
        return NextResponse.json({ status:'success', message:'บันทึกผลแข่งขันสำเร็จ' });
      }
      case 'getMatches': {
        const { clubId, teamName } = params as { clubId?:string; teamName?:string };
        let q = sb.from('matches').select('*').order('match_date',{ascending:false});
        if (clubId) q = q.eq('club_id', clubId);
        if (teamName) q = q.eq('team_name', teamName);
        const { data, error } = await q;
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, matchDate:r.match_date, opponent:r.opponent, venue:r.venue||'', matchType:r.match_type, teamName:r.team_name||'', scoreFor:r.score_for, scoreAgainst:r.score_against, result:r.result, notes:r.notes||'', createdBy:r.created_by||'' })));
      }
      case 'getMatchStats': {
        const { matchId } = params as { matchId: string };
        const { data, error } = await sb.from('match_stats').select('*').eq('match_id', matchId);
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, matchId:r.match_id, playerId:r.player_id, minutesPlayed:r.minutes_played, goals:r.goals, assists:r.assists, yellowCards:r.yellow_cards, redCards:r.red_cards, rating:r.rating, notes:r.notes||'' })));
      }
      case 'getMatchStatsByPlayer': {
        const { playerId } = params as { playerId: string };
        // Step 1: fetch stats for this player
        const { data: statsData, error: statsErr } = await sb.from('match_stats')
          .select('*')
          .eq('player_id', playerId);
        if (statsErr) throw statsErr;
        if (!statsData || statsData.length === 0) return NextResponse.json([]);
        // Step 2: fetch match details for those match IDs
        const matchIds = [...new Set(statsData.map(r => r.match_id).filter(Boolean))];
        const { data: matchesData } = await sb.from('matches')
          .select('id,match_date,opponent,team_name,match_type,score_for,score_against,result')
          .in('id', matchIds);
        const matchMap: Record<string, Record<string,unknown>> = {};
        for (const m of matchesData || []) matchMap[m.id] = m;
        // Step 3: join and sort by match_date desc
        const rows = statsData.map(r => {
          const m = matchMap[r.match_id] || {};
          return {
            id: r.id, matchId: r.match_id, playerId: r.player_id,
            minutesPlayed: r.minutes_played, goals: r.goals, assists: r.assists,
            yellowCards: r.yellow_cards, redCards: r.red_cards, rating: r.rating, notes: r.notes||'',
            matchDate: m.match_date||'', opponent: m.opponent||'', teamName: m.team_name||'',
            matchType: m.match_type||'', scoreFor: m.score_for, scoreAgainst: m.score_against, result: m.result||'',
          };
        });
        rows.sort((a, b) => String(b.matchDate).localeCompare(String(a.matchDate)));
        return NextResponse.json(rows);
      }

      // ── CALENDAR ──────────────────────────────────────────────────────────
      case 'saveCalendarEvent': {
        const p = params as {title:string;eventDate:string;eventType:string;teamName:string;venue:string;notes:string;clubId:string;createdBy:string};
        const { error } = await sb.from('calendar_events').insert({ club_id:p.clubId, event_date:p.eventDate, title:p.title, event_type:p.eventType||'training', team_name:p.teamName||'', venue:p.venue||'', notes:p.notes||'', created_by:p.createdBy||'' });
        if (error) throw error;
        return NextResponse.json({ status:'success', message:'บันทึกสำเร็จ' });
      }
      case 'getCalendarEvents': {
        const { yearMonth, clubId } = params as { yearMonth:string; clubId?:string };
        const [ym_y, ym_m] = yearMonth.split('-').map(Number);
        const startDate = `${yearMonth}-01`;
        const nextY = ym_m === 12 ? ym_y + 1 : ym_y;
        const nextM = ym_m === 12 ? 1 : ym_m + 1;
        const endDate = `${nextY}-${String(nextM).padStart(2,'0')}-01`;
        let q = sb.from('calendar_events').select('*')
          .gte('event_date', startDate).lt('event_date', endDate).order('event_date');
        if (clubId) q = q.eq('club_id', clubId);
        const { data, error } = await q;
        if (error) throw error;
        return NextResponse.json((data||[]).map(r=>({ id:r.id, eventDate:r.event_date, title:r.title, eventType:r.event_type, teamName:r.team_name||'', venue:r.venue||'', notes:r.notes||'', createdBy:r.created_by||'' })));
      }
      case 'deleteCalendarEvent': {
        const { id } = params as { id:string };
        const { error } = await sb.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ status:'success' });
      }

      // ── SAVE TRAINING PROGRAM → CALENDAR ──────────────────────────────────
      case 'saveTrainingProgram': {
        const { weekPlan, clubId, teamName, createdBy } = params as {
          weekPlan: Array<{ date: string; sessions: Array<{ focus: string; intensity: string; duration: number; notes: string }> }>;
          clubId: string; teamName: string; createdBy: string;
        };
        if (!weekPlan?.length) return NextResponse.json({ status:'success', message:'0 session' });
        const rows = weekPlan.flatMap(day =>
          day.sessions.filter(s => s.intensity !== 'rest').map(s => ({
            club_id: clubId || '',
            event_date: day.date,
            title: s.focus,
            event_type: 'training',
            team_name: teamName || '',
            venue: '',
            notes: [s.intensity === 'light' ? 'เบา' : s.intensity === 'moderate' ? 'ปานกลาง' : 'หนัก', s.duration ? `${s.duration} นาที` : '', s.notes].filter(Boolean).join(' · '),
            created_by: createdBy || '',
          }))
        );
        if (!rows.length) return NextResponse.json({ status:'success', message:'ไม่มี session ที่บันทึก (วันพัก)' });
        const { error } = await sb.from('calendar_events').insert(rows);
        if (error) throw error;
        return NextResponse.json({ status:'success', message:`บันทึก ${rows.length} session ลงปฏิทินสำเร็จ` });
      }

      // ── TRAINING VIDEOS (Admin CRUD) ───────────────────────────────────────
      case 'getTrainingVideos': {
        const { data, error } = await sb.from('training_videos')
          .select('*').order('category').order('vol');
        if (error) throw error;
        return NextResponse.json((data || []).map(r => ({
          dbId: r.id, id: r.video_id, title: r.title, category: r.category, vol: r.vol ?? 1,
        })));
      }

      case 'saveTrainingVideo': {
        const { video } = params as { video: { dbId?: string; id: string; title: string; category: string; vol?: number } };
        if (video.dbId) {
          const { error } = await sb.from('training_videos').update({
            video_id: video.id, title: video.title, category: video.category,
            vol: video.vol ?? 1, updated_at: new Date().toISOString(),
          }).eq('id', video.dbId);
          if (error) throw error;
        } else {
          const { error } = await sb.from('training_videos').insert({
            video_id: video.id, title: video.title, category: video.category, vol: video.vol ?? 1,
          });
          if (error) throw error;
        }
        return NextResponse.json({ status: 'success' });
      }

      case 'deleteTrainingVideo': {
        const { dbId } = params as { dbId: string };
        const { error } = await sb.from('training_videos').delete().eq('id', dbId);
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      case 'seedTrainingVideos': {
        // Insert default VIDEO_DB into training_videos (only if table is empty)
        const { count } = await sb.from('training_videos').select('*', { count: 'exact', head: true });
        if ((count ?? 0) > 0) return NextResponse.json({ status: 'skipped', message: 'มีข้อมูลอยู่แล้ว' });
        const { videos } = params as { videos: Array<{ id: string; title: string; category: string; vol?: number }> };
        const rows = videos.map(v => ({ video_id: v.id, title: v.title, category: v.category, vol: v.vol ?? 1 }));
        const { error } = await sb.from('training_videos').insert(rows);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: `เพิ่ม ${rows.length} วิดีโอ` });
      }

      case 'changePassword':
      case 'updatePassword': {
        const { username, newPassword, currentPassword } = params as { username: string; newPassword: string; currentPassword?: string };
        // Non-admin can only change their own password and must provide current password
        if (session!.role !== 'admin') {
          if (session!.username !== username)
            return NextResponse.json({ status: 'error', message: 'ไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้อื่น' }, { status: 403 });
          if (!currentPassword)
            return NextResponse.json({ status: 'error', message: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
          const { data: u } = await sb.from('users').select('password_hash').eq('username', username).single();
          if (!u || !await bcrypt.compare(currentPassword, u.password_hash))
            return NextResponse.json({ status: 'error', message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }
        const hash = await bcrypt.hash(String(newPassword), 10);
        const { error } = await sb.from('users').update({ password_hash: hash }).eq('username', username);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
      }

      // ── UPDATE TEST RECORD ─────────────────────────────────────────────────
      case 'updateTestRecord': {
        const f = params as Record<string, string>;
        if (!f.testId) return NextResponse.json({ status: 'error', message: 'ไม่พบ testId' });
        const { data: ath } = await sb.from('athletes').select('dob').eq('player_id', f.playerId).single();
        const dob = ath?.dob || '';
        const bmi = f.height && f.weight
          ? (parseFloat(f.weight) / Math.pow(parseFloat(f.height) / 100, 2)).toFixed(2) : '';
        const peakPower = f.cmj && f.weight
          ? String(Math.max(0, Math.round(60.7 * parseFloat(f.cmj) + 45.3 * parseFloat(f.weight) - 2055))) : '';
        const agility = f.agiL && f.agiR
          ? (parseFloat(f.agiL) + parseFloat(f.agiR)).toFixed(2) : f.agility || '';
        const rawYoyo = f.yoyo || (f.yoyoLevel && f.yoyoShuttle ? String(calcYoyoDist(f.yoyoLevel, f.yoyoShuttle)) : '');
        const vo2max = f.vo2max || (rawYoyo ? String(calcVo2(parseFloat(rawYoyo))) : '');
        const vals: Record<string, string> = {
          speed30: f.speed30||'', cmj: f.cmj||'', agility,
          situp: f.situp||'', longjump: f.longJump||'',
          yoyo: rawYoyo, pushup: f.pushup||'', sitreach: f.sitReach||'',
        };
        const scores: Record<string, number> = {};
        Object.keys(vals).forEach(k => { scores[k] = getScorePoint(k, vals[k], dob); });
        const rating = calcRating(scores);
        const { error } = await sb.from('test_records').update({
          height: f.height||'', weight: f.weight||'', muscle: f.muscle||'', fat: f.fat||'',
          cmj: f.cmj||'', peak_power: peakPower, bmi, rating,
          speed30: f.speed30||'', agility, yoyo: rawYoyo,
          situp: f.situp||'', long_jump: f.longJump||'', pushup: f.pushup||'',
          sit_and_reach: f.sitReach||'', agi_l: f.agiL||'', agi_r: f.agiR||'',
          yoyo_level: f.yoyoLevel||'', yoyo_shuttle: f.yoyoShuttle||'', vo2max,
        }).eq('id', f.testId);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'อัปเดตผลเทสสำเร็จ' });
      }

      // ── DELETE TEST RECORD ─────────────────────────────────────────────────
      case 'deleteTestRecord': {
        const { testId } = params as { testId: string };
        if (!testId) return NextResponse.json({ status: 'error', message: 'ไม่พบ testId' });
        const { error } = await sb.from('test_records').delete().eq('id', testId);
        if (error) throw error;
        return NextResponse.json({ status: 'success', message: 'ลบผลเทสสำเร็จ' });
      }

      // ── QR CHECK-IN (PUBLIC) ───────────────────────────────────────────────
      case 'getCheckInInfo': {
        const { clubId, sessionDate, sessionName } = params as { clubId:string; sessionDate:string; sessionName:string };
        const [{ data: aths }, { data: recs }] = await Promise.all([
          sb.from('athletes').select('player_id,name,nickname,team,photo_url').eq('club_id', clubId).order('name'),
          sb.from('attendance').select('player_id,status').eq('session_date', sessionDate).eq('session_name', sessionName),
        ]);
        const checkedIn = new Set((recs || []).filter(r => r.status === 'present').map(r => r.player_id));
        return NextResponse.json({
          athletes: (aths || []).map(a => ({ playerId: a.player_id, name: a.name, nickname: a.nickname||'', team: a.team||'', photoUrl: a.photo_url||'' })),
          checkedIn: Array.from(checkedIn),
        });
      }

      case 'submitCheckIn': {
        const { playerId, sessionDate, sessionName, sessionType, clubId } = params as { playerId:string; sessionDate:string; sessionName:string; sessionType:string; clubId:string };
        // Verify athlete belongs to this club (basic guard)
        const { data: ath } = await sb.from('athletes').select('player_id').eq('player_id', playerId).eq('club_id', clubId).maybeSingle();
        if (!ath) return NextResponse.json({ status: 'error', message: 'ไม่พบนักกีฬา' });
        const { error } = await sb.from('attendance').upsert({
          session_date: sessionDate, session_name: sessionName,
          session_type: sessionType || 'training', player_id: playerId,
          status: 'present', notes: 'QR Check-in', created_by: 'QR',
        }, { onConflict: 'session_date,session_name,player_id' });
        if (error) throw error;
        return NextResponse.json({ status: 'success' });
      }

      default:
        return NextResponse.json({ status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[DB] ${action}:`, err);
    return NextResponse.json({ status: 'error', message: 'Database error - ตรวจสอบ console' });
  }
}
