import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get('team') || '';

  let q = supabase
    .from('athletes')
    .select('player_id, name, nickname, team, position, photo_url, test_records(rating, speed30, cmj, agility, yoyo, timestamp)')
    .order('name');

  if (team) q = q.eq('team', team);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const athletes = (data || []).map(a => {
    const records = ((a.test_records as Record<string,unknown>[]) || [])
      .sort((x, y) => new Date(String(y.timestamp)).getTime() - new Date(String(x.timestamp)).getTime());
    const latest = records[0] || null;
    return {
      PlayerID: a.player_id,
      Name:     a.name,
      Nickname: a.nickname || '',
      Team:     a.team || '',
      Position: a.position || '',
      PhotoUrl: a.photo_url || '',
      Rating:   Number(latest?.rating || 0),
      Speed30:  String(latest?.speed30 || ''),
      CMJ:      String(latest?.cmj || ''),
      Agility:  String(latest?.agility || ''),
      YoYo:     String(latest?.yoyo || ''),
      Tests:    records.length,
    };
  }).sort((a, b) => b.Rating - a.Rating);

  // Get available teams
  const { data: teamsData } = await supabase.from('athletes').select('team').order('team');
  const teams = Array.from(new Set((teamsData || []).map(a => a.team).filter(Boolean)));

  return NextResponse.json({ athletes, teams, team });
}
