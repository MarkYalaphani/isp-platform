import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyToken } from '@/lib/session';

function getSession(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
}

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY ยังไม่ได้ตั้งค่าใน environment variables');
  return new GoogleGenerativeAI(key);
}

async function generate(prompt: string, system: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction: system,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY ยังไม่ได้ตั้งค่าใน environment variables' }, { status: 503 });
  }

  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'กรุณา login ใหม่ (token หมดอายุ)' }, { status: 401 });

  const { task, payload } = await req.json() as { task: string; payload: Record<string, unknown> };

  try {
    // ── AI Scout Chat ──────────────────────────────────────────────────────
    if (task === 'chat') {
      const { playerData, history, question } = payload as {
        playerData: Record<string, unknown>;
        history: { role: string; content: string }[];
        question: string;
      };

      const system = `คุณคือ AI Scout Assistant ผู้ช่วยโค้ชฟุตบอลมืออาชีพ พูดภาษาไทยเป็นหลัก ตอบกระชับ ชัดเจน และให้ insight ที่ actionable

ข้อมูลนักกีฬาที่กำลังวิเคราะห์:
${JSON.stringify(playerData, null, 2)}

หลักการวิเคราะห์:
- พิจารณาข้อมูลรวม: Physical, Skills, Wellness, Attendance, RPE, IR, Match Performance
- ให้คำแนะนำที่เฉพาะเจาะจง ไม่ใช่แค่ทั่วไป
- ถ้าไม่มีข้อมูลบางด้าน ให้บอกตรงๆ ว่ายังไม่มีข้อมูลนั้น
- ใช้ตัวเลขจริงจากข้อมูล ไม่คาดเดา`;

      // Build conversation history as context
      const historyContext = history.length
        ? '\n\nประวัติการสนทนา:\n' + history.map(h => `${h.role === 'user' ? 'โค้ช' : 'AI'}: ${h.content}`).join('\n')
        : '';

      const answer = await generate(`${historyContext}\n\nโค้ช: ${question}`, system);
      return NextResponse.json({ answer });
    }

    // ── AI Auto Scouting Report ────────────────────────────────────────────
    if (task === 'report') {
      const { playerData } = payload as { playerData: Record<string, unknown> };

      const report = await generate(
        `เขียน Scouting Report ภาษาไทยสำหรับนักกีฬาต่อไปนี้:\n${JSON.stringify(playerData, null, 2)}

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
        'คุณเป็น Head Scout มืออาชีพ เขียนรายงานวิเคราะห์นักกีฬาฟุตบอล ภาษาไทย',
      );
      return NextResponse.json({ report });
    }

    // ── AI Starting 11 ────────────────────────────────────────────────────
    if (task === 'lineup') {
      const { players, formation, opponent, notes } = payload as {
        players: Record<string, unknown>[];
        formation: string;
        opponent: string;
        notes: string;
      };

      const text = await generate(
        `วิเคราะห์และเลือก Starting 11 จากนักกีฬาที่มีอยู่

Formation: ${formation}
คู่แข่ง: ${opponent || 'ไม่ระบุ'}
หมายเหตุ: ${notes || 'ไม่มี'}

นักกีฬาที่พร้อม:
${JSON.stringify(players, null, 2)}

ตอบในรูปแบบ JSON เท่านั้น (ไม่มีข้อความอื่น ไม่มี markdown code block):
{
  "starting11": [
    { "position": "GK", "playerId": "...", "playerName": "...", "reason": "เหตุผลสั้น" }
  ],
  "bench": [
    { "playerId": "...", "playerName": "...", "role": "ตัวสำรองสำหรับ..." }
  ],
  "tacticalNote": "หมายเหตุยุทธวิธี 2-3 ประโยค",
  "warning": "ข้อควรระวัง (ถ้ามี)"
}`,
        'คุณเป็น Head Coach มืออาชีพ ตอบด้วย JSON เท่านั้น',
      );

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ error: 'AI ตอบไม่ถูกรูปแบบ' }, { status: 500 });
      return NextResponse.json({ result: JSON.parse(jsonMatch[0]) });
    }

    return NextResponse.json({ error: 'Unknown task' }, { status: 400 });

  } catch (err) {
    console.error('[AI]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
