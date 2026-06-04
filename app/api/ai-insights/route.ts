import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/session';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI feature not configured' }, { status: 503 });
  }

  const session = verifyToken(getToken(req));
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    athleteName: string;
    age: number | null;
    position: string;
    team: string;
    scores: Record<string, number>;
    latest: Record<string, string | number> | null;
    testCount: number;
    rating: number;
    irData?: {
      behaviourScore: number;
      lifestyleScore: number;
      technicalScore: number;
      goodLevel: string;
      toImprove: string;
    } | null;
  };

  const METRIC_LABELS: Record<string, string> = {
    speed30: 'ความเร็ว 30 เมตร', cmj: 'กระโดดแนวตั้ง (CMJ)',
    agility: 'ความคล่องตัว', situp: 'ซิทอัพ', longjump: 'กระโดดไกล',
    yoyo: 'วิ่งรับ Yo-Yo', pushup: 'วิดพื้น', sitreach: 'ก้มแตะปลายเท้า',
  };

  const scoreLines = Object.entries(body.scores)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `  - ${METRIC_LABELS[k] || k}: ${v}/5`)
    .join('\n');

  const latestLines = body.latest
    ? Object.entries(body.latest)
        .filter(([, v]) => v && v !== '' && v !== '0')
        .slice(0, 10)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n')
    : '';

  const idpLines = body.irData
    ? `พฤติกรรม ${body.irData.behaviourScore}% | วิถีชีวิต ${body.irData.lifestyleScore}% | เทคนิค ${body.irData.technicalScore}%`
    : 'ยังไม่มีข้อมูล IDP';

  const prompt = `คุณเป็นนักวิทยาศาสตร์การกีฬาเชี่ยวชาญฟุตบอลเยาวชน วิเคราะห์ข้อมูลนักกีฬาและให้ข้อเสนอแนะเป็นภาษาไทย

ข้อมูลนักกีฬา:
- ชื่อ: ${body.athleteName}
- อายุ: ${body.age || 'ไม่ระบุ'} ปี | ตำแหน่ง: ${body.position || 'ไม่ระบุ'} | รุ่น: ${body.team || 'ไม่ระบุ'}
- Overall Rating: ${body.rating}/100 | จำนวนครั้งที่ทดสอบ: ${body.testCount}

คะแนนสมรรถภาพ (1=ต้องพัฒนา, 5=ยอดเยี่ยม):
${scoreLines || '  (ยังไม่มีข้อมูล)'}

ข้อมูลดิบล่าสุด:
${latestLines || '  (ยังไม่มีข้อมูล)'}

คะแนน IDP: ${idpLines}
${body.irData?.goodLevel ? `จุดเด่น: ${body.irData.goodLevel}` : ''}
${body.irData?.toImprove ? `จุดพัฒนา: ${body.irData.toImprove}` : ''}

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่น ในรูปแบบ:
{
  "summary": "สรุปภาพรวม 2-3 ประโยค",
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2", "จุดแข็ง 3"],
  "priorities": ["สิ่งที่ต้องพัฒนา 1", "สิ่งที่ต้องพัฒนา 2", "สิ่งที่ต้องพัฒนา 3"],
  "training": ["คำแนะนำการฝึก 1", "คำแนะนำการฝึก 2", "คำแนะนำการฝึก 3"],
  "parentNote": "ข้อความถึงผู้ปกครอง 1-2 ประโยค อ่านเข้าใจง่าย"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');

    const insights = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error('AI insights error:', err);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}
