import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;

  const { data: athlete, error } = await supabase
    .from('athletes')
    .select('*, test_records(*), ir_reports(*)')
    .eq('player_id', playerId)
    .single();

  if (error || !athlete) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลนักกีฬา' }, { status: 404 });
  }

  const records = ((athlete.test_records as Record<string,unknown>[]) || [])
    .sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime());

  const latest = records.length ? records[records.length - 1] : null;

  const irRecords = ((athlete.ir_reports as Record<string,unknown>[]) || [])
    .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime());

  const mapIR = (r: Record<string,unknown>) => ({
    Timestamp:       String(r.timestamp        || ''),
    Season:          String(r.season           || ''),
    Period:          String(r.period           || ''),
    Coach:           String(r.coach            || ''),
    B_OnTime:        Number(r.b_ontime         || 0),
    B_Effort:        Number(r.b_effort         || 0),
    B_Teamwork:      Number(r.b_teamwork       || 0),
    B_Respect:       Number(r.b_respect        || 0),
    B_Attendance:    Number(r.b_attendance     || 0),
    B_Participation: Number(r.b_participation  || 0),
    B_Improvement:   Number(r.b_improvement    || 0),
    L_Sleep:         Number(r.l_sleep          || 0),
    L_Hydration:     Number(r.l_hydration      || 0),
    L_Diet:          Number(r.l_diet           || 0),
    L_ScreenTime:    Number(r.l_screentime     || 0),
    T_Motricity:     Number(r.t_motricity      || 0),
    T_Technical:     Number(r.t_technical      || 0),
    T_Tactic:        Number(r.t_tactic         || 0),
    T_OffFundam:     Number(r.t_offfundam      || 0),
    T_DefFundam:     Number(r.t_deffundam      || 0),
    T_Fitness:       Number(r.t_fitness        || 0),
    GoodLevel:       String(r.good_level       || ''),
    ToImprove:       String(r.to_improve       || ''),
    Comments:        String(r.comments         || ''),
    BehaviourScore:  Number(r.behaviour_score  || 0),
    LifestyleScore:  Number(r.lifestyle_score  || 0),
    TechnicalScore:  Number(r.technical_score  || 0),
    OverallIRScore:  Number(r.overall_ir_score || 0),
  });

  return NextResponse.json({
    PlayerID:  athlete.player_id,
    Name:      athlete.name,
    Nickname:  athlete.nickname || '',
    DOB:       athlete.dob || '',
    Team:      athlete.team || '',
    Position:  athlete.position || '',
    Club:      athlete.club || '',
    Province:  athlete.province || '',
    DomFoot:   athlete.dom_foot || '',
    DomHand:   athlete.dom_hand || '',
    PhotoUrl:  athlete.photo_url || '',
    TestCount: records.length,
    History: records.map(r => ({
      Timestamp:   String(r.timestamp    || ''),
      Rating:      Number(r.rating       || 0),
      Speed30:     String(r.speed30      || ''),
      CMJ:         String(r.cmj          || ''),
      Agility:     String(r.agility      || ''),
      Situp:       String(r.situp        || ''),
      LongJump:    String(r.long_jump    || ''),
      YoYo:        String(r.yoyo         || ''),
      Pushup:      String(r.pushup       || ''),
      SitAndReach: String(r.sit_and_reach|| ''),
      Height:      String(r.height       || ''),
      Weight:      String(r.weight       || ''),
      BMI:         String(r.bmi          || ''),
      Fat:         String(r.fat          || ''),
      Muscle:      String(r.muscle       || ''),
      VO2Max:      String(r.vo2max       || ''),
    })),
    Latest: latest ? {
      Rating:      Number(latest.rating       || 0),
      Speed30:     String(latest.speed30      || ''),
      CMJ:         String(latest.cmj          || ''),
      Agility:     String(latest.agility      || ''),
      Situp:       String(latest.situp        || ''),
      LongJump:    String(latest.long_jump    || ''),
      YoYo:        String(latest.yoyo         || ''),
      Pushup:      String(latest.pushup       || ''),
      SitAndReach: String(latest.sit_and_reach|| ''),
      Height:      String(latest.height       || ''),
      Weight:      String(latest.weight       || ''),
      BMI:         String(latest.bmi          || ''),
      Fat:         String(latest.fat          || ''),
      Muscle:      String(latest.muscle       || ''),
      VO2Max:      String(latest.vo2max       || ''),
    } : null,
    IRHistory: irRecords.map(mapIR),
  });
}
