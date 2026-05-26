import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { verifyToken } from '@/lib/session';

function getSession(req: NextRequest) {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
}

function getClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY ยังไม่ได้ตั้งค่าใน environment variables');
  return new Groq({ apiKey: key });
}

const MODEL = 'llama-3.3-70b-versatile';

async function chat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  maxTokens = 1024,
): Promise<string> {
  const groq = getClient();
  const res = await groq.chat.completions.create({ model: MODEL, messages, max_tokens: maxTokens });
  return res.choices[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY ยังไม่ได้ตั้งค่าใน Vercel → Settings → Environment Variables' }, { status: 503 });
  }

  const session = getSession(req);
  if (!session) return NextResponse.json({ error: 'กรุณา login ใหม่ (token หมดอายุ)' }, { status: 401 });

  const { task, payload } = await req.json() as { task: string; payload: Record<string, unknown> };

  try {
    // ── AI Scout Chat ─────────────────────────────────────────────────────
    if (task === 'chat') {
      const { playerData, history, question } = payload as {
        playerData: Record<string, unknown>;
        history: { role: string; content: string }[];
        question: string;
      };

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        {
          role: 'system',
          content: `คุณคือ AI Scout Assistant ผู้ช่วยโค้ชฟุตบอลมืออาชีพ พูดภาษาไทยเป็นหลัก ตอบกระชับ ชัดเจน และให้ insight ที่ actionable

ข้อมูลนักกีฬาที่กำลังวิเคราะห์:
${JSON.stringify(playerData, null, 2)}

หลักการ: พิจารณาข้อมูลรวม Physical/Skills/Wellness/Attendance/IR ให้คำแนะนำเฉพาะเจาะจง อ้างอิงตัวเลขจริง ถ้าไม่มีข้อมูลบอกตรงๆ`,
        },
        ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: question },
      ];

      const answer = await chat(messages, 1024);
      return NextResponse.json({ answer });
    }

    // ── AI Auto Scouting Report ───────────────────────────────────────────
    if (task === 'report') {
      const { playerData } = payload as { playerData: Record<string, unknown> };

      const report = await chat([
        { role: 'system', content: 'คุณเป็น Head Scout มืออาชีพ เขียนรายงานวิเคราะห์นักกีฬาฟุตบอล ภาษาไทย ใช้ Markdown' },
        {
          role: 'user',
          content: `เขียน Scouting Report สำหรับนักกีฬาต่อไปนี้:\n${JSON.stringify(playerData, null, 2)}

รูปแบบ:
## 🏆 ภาพรวมนักกีฬา
## 💪 จุดแข็ง
## 📈 จุดที่ต้องพัฒนา
## 🎯 แผนพัฒนา 3 เดือน
## ⚽ บทสรุปของ Scout

ใช้ข้อมูลจริง อ้างอิงตัวเลข เขียน professional`,
        },
      ], 2048);

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

      const text = await chat([
        { role: 'system', content: 'คุณเป็น Head Coach มืออาชีพ ตอบด้วย JSON เท่านั้น ไม่มีข้อความอื่น' },
        {
          role: 'user',
          content: `เลือก Starting 11\nFormation: ${formation}\nคู่แข่ง: ${opponent || 'ไม่ระบุ'}\nหมายเหตุ: ${notes || 'ไม่มี'}\n\nนักกีฬา:\n${JSON.stringify(players, null, 2)}\n\nJSON format:\n{"starting11":[{"position":"GK","playerId":"...","playerName":"...","reason":"..."}],"bench":[{"playerId":"...","playerName":"...","role":"..."}],"tacticalNote":"...","warning":"..."}`,
        },
      ], 2048);

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
