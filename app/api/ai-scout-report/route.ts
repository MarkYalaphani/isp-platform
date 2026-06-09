import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';

function getToken(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Score → approximate percentile label for Thai high-potential pool
function scoreToPercentile(score: number): string {
  if (score === 5) return 'top 10%';
  if (score === 4) return 'top 25%';
  if (score === 3) return 'ประมาณ 50%';
  if (score === 2) return 'ต่ำกว่า 50%';
  return 'ต่ำกว่า 25%';
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  const session = verifyToken(getToken(req));
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    athlete: {
      name: string; nickname: string; age: number | null; dob: string;
      position: string; team: string; club: string; province: string;
      domFoot: string; domHand: string;
    };
    physical: {
      rating: number; testCount: number; height: string; weight: string;
      bmi: string; fat: string; muscle: string; vo2max: string;
      scores: Record<string, number>;   // metric → 1-5
      values: Record<string, string>;   // metric → raw value
      trend: 'improving' | 'stable' | 'declining' | 'insufficient';
    };
    skills: {
      scoreBallControl: number; scorePassing: number; scoreDribbling: number;
      scoreShooting: number; scoreTactical: number; scoreTotal: number;
    } | null;
    idp: {
      behaviourScore: number; lifestyleScore: number; technicalScore: number;
      overallScore: number; goodLevel: string; toImprove: string;
      comments: string; goalShort: string; goalLong: string; dream: string;
    } | null;
    attendance: { rate: number; totalSessions: number } | null;
    wellness: { avgScore: number; recentNote: string } | null;
    matchStats: { matches: number; goals: number; assists: number; avgRating: number } | null;
  };

  const a = body.athlete;
  const p = body.physical;

  const metricLabels: Record<string, string> = {
    speed30: 'ความเร็ว 30 เมตร', cmj: 'CMJ (พลังกระโดด)', agility: 'ความคล่องตัว',
    situp: 'ซิทอัพ', longjump: 'กระโดดไกล', yoyo: 'โยโย่ (ความอดทน)',
    pushup: 'วิดพื้น', sitreach: 'ก้มแตะปลายเท้า',
  };

  const physLines = Object.entries(p.scores)
    .filter(([, s]) => s > 0)
    .map(([k, s]) => `  • ${metricLabels[k] || k}: ${s}/5 (${scoreToPercentile(s)}) — ค่าจริง ${p.values[k] || '?'}`)
    .join('\n');

  const skillLines = body.skills
    ? `  • Ball Control: ${body.skills.scoreBallControl}%\n  • Passing: ${body.skills.scorePassing}%\n  • Dribbling: ${body.skills.scoreDribbling}%\n  • Shooting: ${body.skills.scoreShooting}%\n  • Tactical IQ: ${body.skills.scoreTactical}%\n  • รวม: ${body.skills.scoreTotal}%`
    : '  (ยังไม่มีการประเมินทักษะ)';

  const idpLines = body.idp
    ? `  • พฤติกรรม: ${body.idp.behaviourScore}% | วิถีชีวิต: ${body.idp.lifestyleScore}% | ทักษะฟุตบอล: ${body.idp.technicalScore}% | รวม: ${body.idp.overallScore}%\n  • จุดเด่น: ${body.idp.goodLevel || '-'}\n  • พัฒนาได้: ${body.idp.toImprove || '-'}\n  • ความฝัน: ${body.idp.dream || '-'}`
    : '  (ยังไม่มีข้อมูล IDP)';

  const matchLines = body.matchStats
    ? `  • ${body.matchStats.matches} แมทช์ | ${body.matchStats.goals} ประตู | ${body.matchStats.assists} แอสซิสต์ | Rating เฉลี่ย ${body.matchStats.avgRating}/10`
    : '  (ยังไม่มีข้อมูลแมทช์)';

  const prompt = `คุณเป็น Professional Football Scout ระดับ FIFA Grade A ที่เชี่ยวชาญนักเตะเยาวชนไทย
เขียนรายงาน Scout Report ฉบับสมบูรณ์แบบมืออาชีพเป็นภาษาไทย

═══ ข้อมูลนักกีฬา ═══
ชื่อ: ${a.name}${a.nickname ? ` (${a.nickname})` : ''}
อายุ: ${a.age || '?'} ปี | ตำแหน่ง: ${a.position || 'ไม่ระบุ'} | รุ่น: ${a.team || '?'} | จังหวัด: ${a.province || '?'}
เท้าถนัด: ${a.domFoot || '?'} | ส่วนสูง: ${p.height || '?'} ซม. | น้ำหนัก: ${p.weight || '?'} กก. | BMI: ${p.bmi || '?'}

═══ สมรรถภาพทางกาย (จากการทดสอบ ${p.testCount} ครั้ง) ═══
Overall Rating: ${p.rating}/100 | แนวโน้ม: ${p.trend}
${physLines || '  (ยังไม่มีข้อมูล)'}

═══ ทักษะฟุตบอล (Skill Assessment) ═══
${skillLines}

═══ IDP (Individual Development Plan) ═══
${idpLines}

═══ ผลการแข่งขัน (Match Stats) ═══
${matchLines}

${body.attendance ? `═══ ความสม่ำเสมอ ═══\n  • Attendance rate: ${body.attendance.rate}% (${body.attendance.totalSessions} sessions)` : ''}
${body.wellness ? `═══ Wellness ═══\n  • ค่าเฉลี่ย: ${body.wellness.avgScore}/100` : ''}

เขียนรายงาน Scout Report โดยมี tone เป็นมืออาชีพและให้กำลังใจ
ตอบกลับเป็น JSON เท่านั้น (ไม่มี markdown, ไม่มี code block) ในรูปแบบ:
{
  "potentialRating": <0-100 ตัวเลข>,
  "potentialLabel": "<Elite Prospect|High Potential|Promising Talent|Development Phase>",
  "potentialLabelTH": "<ยอดเยี่ยมระดับ Elite|ศักยภาพสูง|มีแนวโน้มดี|กำลังพัฒนา>",
  "executiveSummary": "<2-3 ประโยคสรุปภาพรวม ระบุจุดเด่นที่โดดเด่นที่สุด>",
  "physicalAnalysis": "<1 ย่อหน้า วิเคราะห์สมรรถภาพ เปรียบเทียบกับมาตรฐานไทย ระบุจุดแข็ง-อ่อน>",
  "technicalAnalysis": "<1 ย่อหน้า วิเคราะห์ทักษะฟุตบอล ระบุ top skills และสิ่งต้องพัฒนา>",
  "characterAnalysis": "<1 ย่อหน้า วิเคราะห์นิสัย วินัย วิถีชีวิต ทัศนคติ จากข้อมูล IDP>",
  "strengths": ["<จุดแข็ง 1>","<จุดแข็ง 2>","<จุดแข็ง 3>"],
  "developmentAreas": ["<พัฒนาได้ 1>","<พัฒนาได้ 2>","<พัฒนาได้ 3>"],
  "trainingPlan": ["<แผนฝึก 6 เดือน ข้อ 1>","<แผนฝึก 6 เดือน ข้อ 2>","<แผนฝึก 6 เดือน ข้อ 3>","<แผนฝึก 6 เดือน ข้อ 4>"],
  "scoutVerdict": "<2-3 ประโยค บทสรุปของ Scout ว่าควรติดตามนักกีฬาคนนี้อย่างไร โอกาสก้าวสู่ระดับสูงสุด>",
  "parentMessage": "<2 ประโยค ข้อความถึงผู้ปกครอง อ่านง่าย ให้กำลังใจ>"
}`;

  const fullPrompt = `คุณเป็น Professional Football Scout ผู้เชี่ยวชาญนักเตะเยาวชนไทย ตอบเป็น JSON เท่านั้น ไม่มี text อื่น ไม่มี markdown code block\n\n${prompt}`;

  // ลอง model ตามลำดับ — ใช้ model แรกที่ตอบสำเร็จ
  const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.0-pro'];

  const debugLog: string[] = [];

  for (const modelName of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      });

      const bodyText = await res.text();
      debugLog.push(`${modelName}: HTTP ${res.status}`);

      if (res.status === 404) continue; // model ไม่รองรับ → ลอง model ถัดไป

      if (res.status === 429) {
        // quota exceeded — รอ 3 วินาที แล้วลองใหม่
        await new Promise(r => setTimeout(r, 3000));
        const res2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
          }),
        });
        if (!res2.ok) {
          throw new Error(`Quota exceeded (${res.status}). กรุณารอสักครู่แล้วลองใหม่ หรือตรวจสอบ billing ที่ aistudio.google.com`);
        }
        const data2 = await res2.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text2 = data2.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch2 = text2.match(/\{[\s\S]*\}/);
        if (!jsonMatch2) throw new Error('Invalid AI response format');
        return NextResponse.json({ report: JSON.parse(jsonMatch2[0]), model: modelName });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
      }

      const data = JSON.parse(bodyText) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response format');
      const report = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ report, model: modelName });

    } catch (err) {
      debugLog.push(`${modelName}: exception — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.error('All models failed:', debugLog);
  return NextResponse.json({ error: 'All models failed', debug: debugLog }, { status: 503 });
}
