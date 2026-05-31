export const LOGO_URL = 'https://res.cloudinary.com/dkmi9kye7/image/upload/v1778663857/687674443_978558021239852_7124371302269064381_n_jzn6zg.jpg';

export interface VideoItem {
  dbId?: string;   // UUID from database (absent when using devData fallback)
  id: string;      // YouTube video ID
  title: string;
  category: string;
  vol?: number;
}

export const VIDEO_DB: VideoItem[] = [
  // ── ความเร็ว (Speed) ──────────────────────────────────────
  { id: 'oewPLz5b9uY', title: 'สร้างแรงระเบิดและความเร็ว',    category: 'speed30', vol: 1 },
  { id: 'E3fx71WAWjg', title: 'สร้างแรงระเบิด (Explosive Power)', category: 'speed30', vol: 2 },

  // ── พลังกระโดด (CMJ) ─────────────────────────────────────
  { id: 'HPCaZJF9UxM', title: 'Explosive Power Training',       category: 'cmj', vol: 1 },
  { id: '4XnMfQQP0Lo', title: 'กระโดดสูงขึ้น (Jump Higher)',    category: 'cmj', vol: 2 },
  { id: 'WughGzLjmFU', title: 'เพิ่มพลังกระโดด Vertical Jump', category: 'cmj', vol: 3 },

  // ── ความคล่องตัว (Agility) ───────────────────────────────
  { id: 'uqjLFy2PVg0', title: 'Muscle Activation — Balance, Stability, Power', category: 'agility', vol: 1 },
  { id: 'IRNDg8hLx3w', title: 'Landmine Twist Press (Core Rotation)',           category: 'agility', vol: 2 },

  // ── แกนกลางลำตัว (Core / Sit-up) ─────────────────────────
  { id: 'IAVuBZhsEsI', title: 'ความมั่นคงแกนกลางลำตัว Core Strength Stability', category: 'situp', vol: 1 },
  { id: 'eYi5yDl0vR8', title: 'เสริมแกร่งแกนกลางลำตัว',                        category: 'situp', vol: 2 },
  { id: 'AEolEgcafcI', title: 'ฝึกกล้ามเนื้อแกนกลางลำตัว',                     category: 'situp', vol: 3 },

  // ── กระโดดไกล / กำลังขา (Long Jump) ─────────────────────
  { id: '7EDXYrDITMg', title: 'Reverse Lunge + Aqua Bag — ฝึกกล้ามเนื้อต้นขา', category: 'longjump', vol: 1 },

  // ── ความทนทาน / VO₂Max (Yo-Yo) ──────────────────────────
  { id: '5YZh0G2ydR0', title: 'Soccer Stamina — Realistic Training for 90 Minutes', category: 'yoyo', vol: 1 },
  { id: 'H3gVFVJHzso', title: 'Yo-Yo Intermittent Recovery Test (Football)',         category: 'yoyo', vol: 2 },

  // ── ความยืดหยุ่น (Flexibility / Sit & Reach) ─────────────
  { id: 'hHR9kfi2FWg', title: 'Recovery Stretching Routine for Footballers',         category: 'sitreach', vol: 1 },
  { id: 'PgjBYUD87Ks', title: 'Full Dynamic Warm-Up Routine for Footballers',        category: 'sitreach', vol: 2 },

  // ── ความแข็งแรงส่วนต้น (Push-up / Upper Body) ────────────
  { id: 'nbrmQvul9Ig', title: 'เสริมแกร่งช่วงบนและแกนกลาง',    category: 'pushup', vol: 1 },
  { id: '3JYML9DtoK4', title: 'เสริมแกร่งช่วงบน (Upper Body)', category: 'pushup', vol: 2 },
  { id: 'FBXUfCRyTnQ', title: 'กล้ามเนื้อหน้าอก (Chest)',       category: 'pushup', vol: 3 },
  { id: 'WBs0xf55F0U', title: 'เสริมแกร่งช่วงบน — DB Chest Press', category: 'pushup', vol: 4 },
  { id: '4XAu66rycmg', title: 'สร้างกล้ามเนื้อหน้าอก — BB Chest Press', category: 'pushup', vol: 5 },
];

export interface DevMetric {
  label: string; labelEn: string;
  goodImpact: string; badImpact: string;
  goodRec: string[]; badRec: string[];
}

export const DEV_DATA: Record<string, DevMetric> = {
  speed30: {
    label: 'ความเร็ว', labelEn: 'Speed',
    goodImpact: 'ออกตัวเร็ว เล่นบอลได้ดี รับส่งจังหวะได้ทัน เคลื่อนที่ดีเยี่ยม เล่นรุก-รับได้เร็ว',
    badImpact: 'ออกตัวช้ากว่าคู่แข่ง เสียจังหวะบ่อย ตามบอลไม่ทัน',
    goodRec: ['Sprint Technique', 'Resisted Sprint', 'Hill Sprint', 'Plyometric Training'],
    badRec: ['Sprint Technique', 'Acceleration Drill', 'Resisted Sprint', 'Reaction Start'],
  },
  cmj: {
    label: 'พลังกระโดด', labelEn: 'Power (CMJ)',
    goodImpact: 'กระโดดแย่งบอลได้เปรียบ ออกตัวมีพลัง เปลี่ยนทิศทางได้คล่อง เร่งความเร็วได้ดี',
    badImpact: 'กระโดดได้ต่ำ เสียเปรียบในการแย่งบอลทางอากาศ สมดุลร่างกายอ่อน เร่งความเร็วได้ช้า',
    goodRec: ['Plyometric Training', 'Jump Training', 'Olympic Lifting', 'Power Squat'],
    badRec: ['Squat / Lunge / Deadlift', 'Box Jump', 'Jump Training', 'Plyometric Training', 'Resistance Band'],
  },
  agility: {
    label: 'ความคล่องตัว', labelEn: 'Agility',
    goodImpact: 'เปลี่ยนทิศทางได้ดี หลบคู่แข่งได้เก่ง ตอบสนองเกมได้รวดเร็ว',
    badImpact: 'หมุนตัวช้า เปลี่ยนทิศทางตามเกมไม่ทัน หลบคู่แข่งได้ยาก เสียบอลขณะรับ',
    goodRec: ['Agility Ladder', 'Cone Drills', 'Reaction Drills', 'Change of Direction'],
    badRec: ['Agility Ladder', 'Cone Drills', 'Deceleration Training', 'Reaction Drills', 'Change of Direction'],
  },
  situp: {
    label: 'ความแข็งแรงแกนกลาง', labelEn: 'Core (Sit-up)',
    goodImpact: 'ควบคุมร่างกายได้ดี ทนแรงปะทะได้เก่ง รักษาสมดุลขณะเลี้ยวได้',
    badImpact: 'ควบคุมลำตัวไม่ดี เสียสมดุลง่าย แรงต้านอ่อน ส่งผลกระทบต่อทุกทักษะ',
    goodRec: ['Core Circuit', 'Plank Variations', 'Stability Training'],
    badRec: ['Plank / Side Plank', 'Core Stability', 'Dead Bug', 'Bird Dog', 'Swiss Ball'],
  },
  longjump: {
    label: 'พลังขา', labelEn: 'Leg Power (Long Jump)',
    goodImpact: 'มีพลังขาดี กระโดดและออกตัวได้ทรงพลัง เคลื่อนที่ได้แข็งแกร่ง',
    badImpact: 'พลังขายังน้อย กระโดดได้ระยะสั้น ออกตัวไม่ทรงพลัง ขาดแรงขับเคลื่อน',
    goodRec: ['Plyometric Training', 'Single Leg Jump', 'Bounding'],
    badRec: ['Squat Jump', 'Lunge Jump', 'Box Jump', 'Plyometric', 'Leg Press'],
  },
  yoyo: {
    label: 'ความอดทน', labelEn: 'Stamina (Yo-Yo)',
    goodImpact: 'วิ่งเข้าเกมได้ต่อเนื่องช่วงท้าย ฟื้นตัวระหว่างเล่นได้ดี รักษาประสิทธิภาพตลอด 90 นาที',
    badImpact: 'ล้าเร็วกว่าปกติ ฟื้นตัวช้า ประสิทธิภาพลดลงในช่วงท้ายเกม',
    goodRec: ['Interval Running', 'Small-sided Game', 'Circuit Training', 'แอโรบิก 2-3 ครั้ง/สัปดาห์'],
    badRec: ['Interval Running', 'Long Slow Distance', 'Tempo Run', 'Small-sided Game'],
  },
  pushup: {
    label: 'ความแข็งแรงส่วนบน', labelEn: 'Upper Body Strength',
    goodImpact: 'มีแรงต้านคู่แข่งได้ดี ป้องบอลได้เก่ง ควบคุมบอลในสถานการณ์ปะทะ',
    badImpact: 'แรงต้านอ่อน เสียบอลในการปะทะ ป้องบอลได้ยาก',
    goodRec: ['Push-up Variations', 'Bench Press', 'Resistance Training'],
    badRec: ['Push-up Progression', 'Resistance Band', 'Dumbbell Press', 'TRX Training'],
  },
  sitreach: {
    label: 'ความยืดหยุ่น', labelEn: 'Flexibility',
    goodImpact: 'เคลื่อนไหวได้คล่องแคล่ว ลดความเสี่ยงบาดเจ็บ ช่วงการเคลื่อนไหวกว้างขึ้น',
    badImpact: 'กล้ามเนื้อตึง เสี่ยงบาดเจ็บสูงขึ้น จำกัดช่วงการเคลื่อนไหว',
    goodRec: ['Dynamic Stretching', 'Yoga for Athletes', 'Mobility Work'],
    badRec: ['Static Stretching', 'Dynamic Stretching', 'Foam Rolling', 'Mobility Drill', 'Yoga'],
  },
};

// Yo-Yo IR Level 1 — standard Bangsbo protocol
// YOYO_BASE: cumulative distance (m) at START of each level (before any shuttle at that level)
export const YOYO_BASE: Record<number, number> = {
  5:0,    6:120,  7:240,  8:360,  9:480,
  10:600, 11:720, 12:840, 13:960, 14:1080,
  15:1280, 16:1480, 17:1680, 18:2000, 19:2320,
  20:2640, 21:2960, 22:3280, 23:3600,
};

// Max shuttles per level (varies: 3 for lv5–13, 5 for lv14–16, 8 for lv17–23)
export const YOYO_MAX_SHUTTLE: Record<number, number> = {
  5:3,  6:3,  7:3,  8:3,  9:3,  10:3,
  11:3, 12:3, 13:3,
  14:5, 15:5, 16:5,
  17:8, 18:8, 19:8, 20:8, 21:8, 22:8, 23:8,
};

export function calcYoyoDist(level: string | number, shuttle: string | number): number {
  const lvl = parseInt(String(level));
  const shut = parseInt(String(shuttle));
  if (!lvl || !shut || YOYO_BASE[lvl] === undefined) return 0;
  const maxShut = YOYO_MAX_SHUTTLE[lvl] ?? 8;
  return YOYO_BASE[lvl] + Math.min(shut, maxShut) * 40;
}

export function calcVo2(dist: number): string {
  if (!dist) return '';
  return (dist * 0.0084 + 36.4).toFixed(2);
}
