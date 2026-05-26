import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken } from '@/lib/session';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSession(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่าใน environment variables' }, { status: 503 });
  }

  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'กรุณา login ใหม่ (token หมดอายุ)' }, { status: 401 });

  const { task, payload } = await req.json() as { task: string; payload: Record<string, unknown> };

  try {
    if (task === 'chat') {
      // ── AI Scout Chat ──────────────────────────────────────────────────
      const { playerData, history, question } = payload as {
        playerData: Record<string, unknown>;
        history: { role: string; content: string }[];
        question: string;
      };

      const systemPrompt = `คุณคือ AI Scout Assistant ผู้ช่วยโค้ชฟุตบอลมืออาชีพ พูดภาษาไทยเป็นหลัก ตอบกระชับ ชัดเจน และให้ insight ที่ actionable

ข้อมูลนักกีฬาที่กำลังวิเคราะห์:
${JSON.stringify(playerData, null, 2)}

หลักการวิเคราะห์:
- พิจารณาข้อมูลรวม: Physical, Skills, Wellness, Attendance, RPE, IR, Match Performance
- ให้คำแนะนำที่เฉพาะเจาะจง ไม่ใช่แค่ทั่วไป
- ถ้าไม่มีข้อมูลบางด้าน ให้บอกตรงๆ ว่ายังไม่มีข้อมูลนั้น
- ใช้ตัวเลขจริงจากข้อมูล ไม่คาดเดา`;

      const messages = [
        ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user' as const, content: question },
      ];

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      });

      return NextResponse.json({ answer: (response.content[0] as { text: string }).text });
    }

    if (task === 'report') {
      // ── AI Auto Scouting Report ────────────────────────────────────────
      const { playerData } = payload as { playerData: Record<string, unknown> };

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `คุณเป็น Head Scout มืออาชีพ เขียนรายงาน Scouting Report ภาษาไทยสำหรับนักกีฬาต่อไปนี้

ข้อมูลนักกีฬา:
${JSON.stringify(playerData, null, 2)}

เขียนรายงานในรูปแบบนี้ (ใช้ Markdown):

## 🏆 ภาพรวมนักกีฬา
(2-3 ประโยคสรุปภาพรวม จุดเด่น ศักยภาพ)

## 💪 จุดแข็ง
(3-5 ข้อ เฉพาะเจาะจง อ้างอิงตัวเลขจริง)

## 📈 จุดที่ต้องพัฒนา
(3-5 ข้อ พร้อมแนะนำวิธีพัฒนา)

## 🎯 แผนพัฒนาที่แนะนำ
(แผน 3 เดือน เน้น priority สูงสุด 3 ด้าน)

## ⚽ บทสรุปของ Scout
(ประเมินศักยภาพ ระดับที่เหมาะสม อนาคตของนักกีฬา)

เขียนให้ professional และ actionable ใช้ข้อมูลจริงทั้งหมดที่มี`,
        }],
      });

      return NextResponse.json({ report: (response.content[0] as { text: string }).text });
    }

    if (task === 'lineup') {
      // ── AI Starting 11 ────────────────────────────────────────────────
      const { players, formation, opponent, notes } = payload as {
        players: Record<string, unknown>[];
        formation: string;
        opponent: string;
        notes: string;
      };

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `คุณเป็น Head Coach มืออาชีพ วิเคราะห์และเลือก Starting 11 จากนักกีฬาที่มีอยู่

Formation ที่ต้องการ: ${formation}
คู่แข่ง: ${opponent || 'ไม่ระบุ'}
หมายเหตุเพิ่มเติม: ${notes || 'ไม่มี'}

นักกีฬาที่พร้อมลงสนาม:
${JSON.stringify(players, null, 2)}

ตอบในรูปแบบ JSON เท่านั้น (ไม่มีข้อความอื่น):
{
  "starting11": [
    { "position": "GK", "playerId": "...", "playerName": "...", "reason": "เหตุผลสั้น" },
    ...
  ],
  "bench": [
    { "playerId": "...", "playerName": "...", "role": "ตัวสำรองสำหรับ..." }
  ],
  "tacticalNote": "หมายเหตุยุทธวิธี 2-3 ประโยค",
  "warning": "ข้อควรระวัง (ถ้ามี เช่น ฟิตน้อย wellness ต่ำ)"
}`,
        }],
      });

      const text = (response.content[0] as { text: string }).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ error: 'AI ตอบไม่ถูกรูปแบบ' }, { status: 500 });
      return NextResponse.json({ result: JSON.parse(jsonMatch[0]) });
    }

    return NextResponse.json({ error: 'Unknown task' }, { status: 400 });

  } catch (err) {
    console.error('[AI]', err);
    return NextResponse.json({ error: 'AI error: ' + String(err) }, { status: 500 });
  }
}
