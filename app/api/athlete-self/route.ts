import { NextRequest, NextResponse } from 'next/server';
import { supabase as sb } from '@/lib/supabase';

/* GET — return all athletes for dropdown */
export async function GET(_req: NextRequest) {
  const { data, error } = await sb
    .from('athletes')
    .select('player_id, name, team')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(a => ({ id: a.player_id, name: a.name, team: a.team || '' })));
}

/* POST — save athlete self-assessment */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { pid } = b;
    if (!pid) return NextResponse.json({ error: 'missing pid' }, { status: 400 });

    const { error } = await sb.from('idp_self').insert({
      player_id: pid,
      submitted_at: new Date().toISOString(),
      // Behaviour
      b_ontime:        Number(b.b_ontime        || 0),
      b_effort:        Number(b.b_effort        || 0),
      b_teamwork:      Number(b.b_teamwork      || 0),
      b_respect:       Number(b.b_respect       || 0),
      b_attendance:    Number(b.b_attendance    || 0),
      b_participation: Number(b.b_participation || 0),
      b_improvement:   Number(b.b_improvement   || 0),
      // Lifestyle
      l_sleep:         Number(b.l_sleep         || 0),
      l_hydration:     Number(b.l_hydration     || 0),
      l_diet:          Number(b.l_diet          || 0),
      l_screentime:    Number(b.l_screentime    || 0),
      // Technical
      t_motricity:     Number(b.t_motricity     || 0),
      t_technical:     Number(b.t_technical     || 0),
      t_tactic:        Number(b.t_tactic        || 0),
      t_offfundam:     Number(b.t_offfundam     || 0),
      t_deffundam:     Number(b.t_deffundam     || 0),
      t_fitness:       Number(b.t_fitness       || 0),
      // Medical
      med_period1:  b.med_period1  || '',
      med_injury1:  b.med_injury1  || '',
      med_absence1: b.med_absence1 || '',
      med_period2:  b.med_period2  || '',
      med_injury2:  b.med_injury2  || '',
      med_absence2: b.med_absence2 || '',
      // Observations & Goals
      good_level:   b.goodLevel   || '',
      to_improve:   b.toImprove   || '',
      goal_short:   b.goalShort   || '',
      goal_long:    b.goalLong    || '',
      action_plan:  b.actionPlan  || '',
      dream:        b.dream       || '',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
