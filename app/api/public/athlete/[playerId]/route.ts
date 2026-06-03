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

  // Fetch athlete + test records + ir reports in parallel
  const [athleteRes, irRes] = await Promise.all([
    supabase.from('athletes').select('*, test_records(*)').eq('player_id', playerId).single(),
    supabase.from('ir_reports').select('*').eq('player_id', playerId).order('timestamp', { ascending: false }),
  ]);

  if (athleteRes.error || !athleteRes.data) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลนักกีฬา' }, { status: 404 });
  }

  const athlete = athleteRes.data;
  const records = ((athlete.test_records as Record<string, unknown>[]) || [])
    .sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime());
  const latest = records.length ? records[records.length - 1] : null;

  const irReports = (irRes.data || []).map((r: Record<string, unknown>) => ({
    id:               String(r.id || ''),
    Timestamp:        String(r.timestamp || ''),
    Coach:            String(r.coach || ''),
    Period:           String(r.period || ''),
    Season:           String(r.season || ''),
    B_OnTime:         Number(r.b_ontime || 0),
    B_Effort:         Number(r.b_effort || 0),
    B_Teamwork:       Number(r.b_teamwork || 0),
    B_Respect:        Number(r.b_respect || 0),
    B_Attendance:     Number(r.b_attendance || 0),
    B_Participation:  Number(r.b_participation || 0),
    B_Improvement:    Number(r.b_improvement || 0),
    L_Sleep:          Number(r.l_sleep || 0),
    L_Hydration:      Number(r.l_hydration || 0),
    L_Diet:           Number(r.l_diet || 0),
    L_ScreenTime:     Number(r.l_screentime || 0),
    T_Motricity:      Number(r.t_motricity || 0),
    T_Technical:      Number(r.t_technical || 0),
    T_Tactic:         Number(r.t_tactic || 0),
    T_OffFundam:      Number(r.t_offfundam || 0),
    T_DefFundam:      Number(r.t_deffundam || 0),
    T_Fitness:        Number(r.t_fitness || 0),
    GoodLevel:        String(r.good_level || ''),
    ToImprove:        String(r.to_improve || ''),
    Comments:         String(r.comments || ''),
    BehaviourComment: String(r.behaviour_comment || ''),
    LifestyleComment: String(r.lifestyle_comment || ''),
    TechnicalComment: String(r.technical_comment || ''),
    IdpGoalShort:     String(r.idp_goal_short || ''),
    IdpGoalLong:      String(r.idp_goal_long || ''),
    IdpAction:        String(r.idp_action || ''),
    IdpDream:         String(r.idp_dream || ''),
    BehaviourScore:   Number(r.behaviour_score || 0),
    LifestyleScore:   Number(r.lifestyle_score || 0),
    TechnicalScore:   Number(r.technical_score || 0),
    OverallIRScore:   Number(r.overall_ir_score || 0),
  }));

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
  });
}
