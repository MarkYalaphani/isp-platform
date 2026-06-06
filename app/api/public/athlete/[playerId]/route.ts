import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function mapRecord(r: Record<string, unknown>) {
  return {
    Timestamp:   String(r.timestamp     || ''),
    Rating:      Number(r.rating        || 0),
    Speed30:     String(r.speed30       || ''),
    CMJ:         String(r.cmj           || ''),
    PeakPower:   String(r.peak_power    || ''),
    Agility:     String(r.agility       || ''),
    AgiL:        String(r.agi_l         || ''),
    AgiR:        String(r.agi_r         || ''),
    Situp:       String(r.situp         || ''),
    LongJump:    String(r.long_jump     || ''),
    YoYo:        String(r.yoyo          || ''),
    YoyoLevel:   String(r.yoyo_level    || ''),
    YoyoShuttle: String(r.yoyo_shuttle  || ''),
    Pushup:      String(r.pushup        || ''),
    SitAndReach: String(r.sit_and_reach || ''),
    Height:      String(r.height        || ''),
    Weight:      String(r.weight        || ''),
    BMI:         String(r.bmi           || ''),
    Fat:         String(r.fat           || ''),
    Muscle:      String(r.muscle        || ''),
    VO2Max:      String(r.vo2max        || ''),
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;

  // Fetch all data in parallel
  const [athleteRes, irRes, skillRes, attendRes, wellnessRes, rpeRes, matchStatsRes] = await Promise.all([
    supabase.from('athletes').select('*, test_records(*)').eq('player_id', playerId).single(),
    supabase.from('ir_reports').select('*').eq('player_id', playerId).order('timestamp', { ascending: false }),
    supabase.from('skill_assessments').select('*').eq('player_id', playerId).order('assessed_at', { ascending: false }).limit(1),
    supabase.from('attendance').select('status').eq('player_id', playerId),
    supabase.from('wellness_checks').select('*').eq('player_id', playerId).order('check_date', { ascending: false }).limit(20),
    supabase.from('training_rpe').select('*').eq('player_id', playerId).order('session_date', { ascending: false }).limit(20),
    supabase.from('match_stats').select('*, matches(match_date,opponent,match_type,result,score_for,score_against)').eq('player_id', playerId).order('id', { ascending: false }).limit(10),
  ]);

  if (athleteRes.error || !athleteRes.data) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลนักกีฬา' }, { status: 404 });
  }

  const athlete = athleteRes.data;
  const records = ((athlete.test_records as Record<string, unknown>[]) || [])
    .sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime());
  const latest = records.length ? records[records.length - 1] : null;

  // ── IDP ──────────────────────────────────────────────────────────────────────
  const irReports = (irRes.data || []).map((r: Record<string, unknown>) => ({
    id: String(r.id || ''), Timestamp: String(r.timestamp || ''),
    Coach: String(r.coach || ''), Period: String(r.period || ''), Season: String(r.season || ''),
    B_OnTime: Number(r.b_ontime||0), B_Effort: Number(r.b_effort||0), B_Teamwork: Number(r.b_teamwork||0),
    B_Respect: Number(r.b_respect||0), B_Attendance: Number(r.b_attendance||0),
    B_Participation: Number(r.b_participation||0), B_Improvement: Number(r.b_improvement||0),
    L_Sleep: Number(r.l_sleep||0), L_Hydration: Number(r.l_hydration||0),
    L_Diet: Number(r.l_diet||0), L_ScreenTime: Number(r.l_screentime||0),
    T_Motricity: Number(r.t_motricity||0), T_Technical: Number(r.t_technical||0),
    T_Tactic: Number(r.t_tactic||0), T_OffFundam: Number(r.t_offfundam||0),
    T_DefFundam: Number(r.t_deffundam||0), T_Fitness: Number(r.t_fitness||0),
    GoodLevel: String(r.good_level||''), ToImprove: String(r.to_improve||''),
    Comments: String(r.comments||''),
    BehaviourComment: String(r.behaviour_comment||''), LifestyleComment: String(r.lifestyle_comment||''),
    TechnicalComment: String(r.technical_comment||''),
    IdpGoalShort: String(r.idp_goal_short||''), IdpGoalLong: String(r.idp_goal_long||''),
    IdpAction: String(r.idp_action||''), IdpDream: String(r.idp_dream||''),
    BehaviourScore: Number(r.behaviour_score||0), LifestyleScore: Number(r.lifestyle_score||0),
    TechnicalScore: Number(r.technical_score||0), OverallIRScore: Number(r.overall_ir_score||0),
  }));

  // ── Skill Assessment ─────────────────────────────────────────────────────────
  const skillRaw = skillRes.data?.[0] as Record<string, unknown> | undefined;
  const latestSkill = skillRaw ? {
    assessedAt: String(skillRaw.assessed_at || ''),
    assessedBy: String(skillRaw.assessed_by || ''),
    season: String(skillRaw.season || ''),
    scoreBallControl: Number(skillRaw.sk_ball_control||0),
    scorePassing: Number(skillRaw.sk_first_touch||0),
    scoreDribbling: Number(skillRaw.sk_dribbling||skillRaw.sk_weak_foot||0),
    scoreShooting: Number(skillRaw.sk_shooting||0),
    scoreTactical: Number(skillRaw.sk_positioning||skillRaw.sk_decision||0),
    skFirstTouch: Number(skillRaw.sk_first_touch||0),
    skBallControl: Number(skillRaw.sk_ball_control||0),
    skReceiving: Number(skillRaw.sk_receiving||0),
    skWeakFoot: Number(skillRaw.sk_weak_foot||0),
    skDribbling: Number(skillRaw.sk_dribbling||0),
    skShooting: Number(skillRaw.sk_shooting||0),
    skLongPass: Number(skillRaw.sk_long_pass||0),
    skPositioning: Number(skillRaw.sk_positioning||0),
    skDecision: Number(skillRaw.sk_decision||0),
    skScanning: Number(skillRaw.sk_scanning||0),
    skPressure: Number(skillRaw.sk_pressure||0),
    skHeading: Number(skillRaw.sk_heading||0),
  } : null;

  // ── Attendance Aggregated ────────────────────────────────────────────────────
  const attendRows = attendRes.data || [];
  const attendStats = {
    total:   attendRows.length,
    present: attendRows.filter((r: Record<string,unknown>) => r.status === 'present').length,
    late:    attendRows.filter((r: Record<string,unknown>) => r.status === 'late').length,
    absent:  attendRows.filter((r: Record<string,unknown>) => r.status === 'absent').length,
    excuse:  attendRows.filter((r: Record<string,unknown>) => r.status === 'excuse').length,
    rate:    attendRows.length > 0
      ? Math.round((attendRows.filter((r: Record<string,unknown>) => r.status === 'present' || r.status === 'late').length / attendRows.length) * 100)
      : 0,
  };

  // ── Wellness ─────────────────────────────────────────────────────────────────
  const wellnessRows = (wellnessRes.data || []) as Record<string, unknown>[];
  const wellnessSummary = wellnessRows.length > 0 ? {
    count: wellnessRows.length,
    avgWellness: Math.round(wellnessRows.reduce((s, r) => s + Number(r.wellness_score||0), 0) / wellnessRows.length),
    avgFatigue:  Math.round(wellnessRows.reduce((s, r) => s + Number(r.fatigue||0), 0) / wellnessRows.length),
    avgSleep:    Math.round(wellnessRows.reduce((s, r) => s + Number(r.sleep_quality||0), 0) / wellnessRows.length),
    avgMood:     Math.round(wellnessRows.reduce((s, r) => s + Number(r.mood||0), 0) / wellnessRows.length),
    recent: wellnessRows.slice(0, 5).map(r => ({
      date: String(r.check_date||''), wellness: Number(r.wellness_score||0),
      fatigue: Number(r.fatigue||0), sleep: Number(r.sleep_quality||0), mood: Number(r.mood||0),
    })),
  } : null;

  // ── Training RPE ─────────────────────────────────────────────────────────────
  const rpeRows = (rpeRes.data || []) as Record<string, unknown>[];
  const rpeSummary = rpeRows.length > 0 ? {
    count: rpeRows.length,
    avgRpe: Math.round((rpeRows.reduce((s, r) => s + Number(r.rpe||0), 0) / rpeRows.length) * 10) / 10,
    avgLoad: Math.round(rpeRows.reduce((s, r) => s + Number(r.training_load||0), 0) / rpeRows.length),
    totalLoad: rpeRows.reduce((s, r) => s + Number(r.training_load||0), 0),
  } : null;

  // ── Match Performance ────────────────────────────────────────────────────────
  const matchRows = (matchStatsRes.data || []) as Record<string, unknown>[];
  const matchStats = matchRows.length > 0 ? {
    apps:        matchRows.length,
    totalMins:   matchRows.reduce((s, r) => s + Number(r.minutes_played||0), 0),
    goals:       matchRows.reduce((s, r) => s + Number(r.goals||0), 0),
    assists:     matchRows.reduce((s, r) => s + Number(r.assists||0), 0),
    yellowCards: matchRows.reduce((s, r) => s + Number(r.yellow_cards||0), 0),
    redCards:    matchRows.reduce((s, r) => s + Number(r.red_cards||0), 0),
    avgRating:   matchRows.filter(r => Number(r.rating||0) > 0).length > 0
      ? Math.round((matchRows.filter(r=>Number(r.rating||0)>0).reduce((s,r)=>s+Number(r.rating||0),0) / matchRows.filter(r=>Number(r.rating||0)>0).length) * 10) / 10
      : 0,
    recent: matchRows.slice(0, 5).map(r => {
      const m = r.matches as Record<string, unknown> | null;
      return {
        matchDate: String(m?.match_date||r.match_date||''),
        opponent:  String(m?.opponent||''),
        matchType: String(m?.match_type||''),
        result:    String(m?.result||''),
        minutesPlayed: Number(r.minutes_played||0),
        goals:     Number(r.goals||0),
        assists:   Number(r.assists||0),
        rating:    Number(r.rating||0),
      };
    }),
  } : null;

  return NextResponse.json({
    PlayerID:   athlete.player_id,
    Name:       athlete.name,
    Nickname:   athlete.nickname || '',
    DOB:        athlete.dob || '',
    Team:       athlete.team || '',
    Position:   athlete.position || '',
    Club:       athlete.club || '',
    Province:   athlete.province || '',
    DomFoot:    athlete.dom_foot || '',
    DomHand:    athlete.dom_hand || '',
    PhotoUrl:   athlete.photo_url || '',
    TestCount:  records.length,
    History:    records.map(mapRecord),
    Latest:     latest ? mapRecord(latest) : null,
    IRHistory:  irReports,
    LatestSkill: latestSkill,
    AttendStats: attendStats,
    WellnessSummary: wellnessSummary,
    RpeSummary: rpeSummary,
    MatchStats: matchStats,
  });
}
