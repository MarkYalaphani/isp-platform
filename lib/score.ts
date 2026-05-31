/**
 * Football Physical Performance Scoring — Position & Age Based
 *
 * Primary source (U13–15 Thai high-potential players):
 *  ธิติวัฒน์ น้อยคำเมือง และคณะ (2566). คุณลักษณะสำคัญของการเป็นนักกีฬาเยาวชนศักยภาพสูง:
 *  นักกีฬาฟุตบอล อายุ 13–15 ปี (n=132). กรมพลศึกษา / ววน. 2566.
 *  Positions: DEF n=44, MID n=44, FWD n=44.  GK values estimated.
 *
 * Supporting sources:
 *  Buchheit & Mendez-Villanueva (2013); Le Gall et al. (2010); Bangsbo et al. (2008)
 *  Draper & Lancaster (1985) [Illinois agility]; Thai DPSPE / AAHPERD norms
 *
 * Position codes accepted: 'GK', 'DEF'/'DF', 'MID'/'MF', 'FWD'/'FW'/'ATK'
 *   Hybrids:  'FWD/MID' → FWD    'MID/DEF' → DEF
 *   Default (no position): MID
 *
 * Score 5 = ยอดเยี่ยม  4 = ดี  3 = ปานกลาง  2 = พัฒนาได้  1 = ต้องปรับปรุง
 */

// ─── Position-specific lookup tables ────────────────────────────────────────
// Rows = age group  Cols = position
// Lower-is-better (speed): [t5, t4, t3, t2] = MAX thresholds
// Higher-is-better (cmj, yoyo, sitreach): [t5, t4, t3, t2] = MIN thresholds

type T4 = [number, number, number, number];
interface PosRow { GK: T4; DEF: T4; MID: T4; FWD: T4 }

// Speed 30m (seconds) ─────────────────────────────────────────────────────
const SPEED30: Record<string, PosRow> = {
  //        GK                     DEF                   MID                   FWD
  u10: { GK:[5.20,5.50,5.80,6.10], DEF:[5.25,5.55,5.85,6.15], MID:[5.20,5.50,5.80,6.10], FWD:[5.05,5.35,5.65,5.95] },
  u11: { GK:[4.90,5.20,5.50,5.80], DEF:[4.95,5.25,5.55,5.85], MID:[4.90,5.20,5.50,5.80], FWD:[4.75,5.05,5.35,5.65] },
  u12: { GK:[4.60,4.90,5.20,5.50], DEF:[4.65,4.95,5.25,5.55], MID:[4.60,4.90,5.20,5.50], FWD:[4.45,4.75,5.05,5.35] },
  // U13–15: DEF/MID/FWD from DPE 2566 research; GK estimated
  u15: { GK:[4.10,4.30,4.50,4.70], DEF:[4.07,4.27,4.46,4.67], MID:[4.11,4.30,4.51,4.69], FWD:[3.84,4.18,4.48,4.82] },
  u18: { GK:[3.85,4.10,4.35,4.60], DEF:[3.90,4.15,4.40,4.65], MID:[3.85,4.10,4.35,4.60], FWD:[3.65,3.95,4.20,4.45] },
  snr: { GK:[3.70,3.90,4.15,4.40], DEF:[3.75,3.95,4.20,4.45], MID:[3.70,3.90,4.15,4.40], FWD:[3.50,3.70,3.95,4.20] },
};

// CMJ — no arm swing (cm) ──────────────────────────────────────────────────
const CMJ: Record<string, PosRow> = {
  u10: { GK:[29,25,21,16], DEF:[26,22,18,14], MID:[27,23,19,15], FWD:[31,27,23,18] },
  u11: { GK:[34,29,24,19], DEF:[31,26,21,16], MID:[32,27,22,17], FWD:[36,31,26,20] },
  u12: { GK:[38,33,28,23], DEF:[35,30,25,20], MID:[36,31,26,21], FWD:[40,35,30,24] },
  // U13–15: DEF/MID/FWD from DPE 2566; GK estimated (≈ FWD, high-jump requirement)
  u15: { GK:[42,38,34,30], DEF:[39,36,32,29], MID:[40,36,33,29], FWD:[43,38,34,29] },
  u18: { GK:[53,48,44,39], DEF:[48,44,40,35], MID:[50,46,42,37], FWD:[55,50,46,40] },
  snr: { GK:[60,55,50,44], DEF:[55,50,46,41], MID:[57,52,48,43], FWD:[63,57,52,45] },
};

// Yo-Yo IR Level 1 (meters) ───────────────────────────────────────────────
const YOYO: Record<string, PosRow> = {
  u10: { GK:[480,340,200,100],    DEF:[560,400,240,120],    MID:[600,440,280,140],    FWD:[520,360,200,100]  },
  u11: { GK:[640,480,300,150],    DEF:[720,560,360,180],    MID:[800,620,400,200],    FWD:[680,520,320,160]  },
  u12: { GK:[760,580,380,190],    DEF:[840,640,400,200],    MID:[960,760,480,240],    FWD:[800,620,380,190]  },
  // U13–15: DEF/MID/FWD from DPE 2566; GK lower (less aerobic demand in-game)
  u15: { GK:[1200,960,720,480],   DEF:[1400,1080,800,480],  MID:[1520,1200,880,600],  FWD:[1600,1240,840,480]},
  u18: { GK:[1600,1280,960,640],  DEF:[2000,1600,1200,700], MID:[2400,1900,1400,800], FWD:[2000,1600,1150,680]},
  snr: { GK:[2000,1600,1200,800], DEF:[2400,1900,1400,900], MID:[2800,2200,1600,1000],FWD:[2400,1900,1400,850]},
};

// Sit & Reach (cm) ────────────────────────────────────────────────────────
const SITREACH: Record<string, PosRow> = {
  u10: { GK:[27,23,18,12], DEF:[25,21,16,10], MID:[25,21,16,10], FWD:[24,20,15,9]  },
  u11: { GK:[23,18,12,6],  DEF:[22,16,10,4],  MID:[20,14,8,2],   FWD:[19,14,8,2]   },
  u12: { GK:[23,18,12,6],  DEF:[22,16,10,4],  MID:[20,14,8,2],   FWD:[19,14,8,2]   },
  // U13–15: DEF/MID/FWD from DPE 2566; GK estimated (high flexibility needed)
  u15: { GK:[22,17,11,5],  DEF:[23,17,10,4],  MID:[20,15,10,5],  FWD:[19,15,10,7]  },
  u18: { GK:[30,23,16,8],  DEF:[27,20,13,6],  MID:[26,19,12,5],  FWD:[25,18,11,4]  },
  snr: { GK:[32,25,18,10], DEF:[29,22,15,7],  MID:[28,21,14,6],  FWD:[27,20,13,5]  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalise position string → GK / DEF / MID / FWD */
function normalizePos(p?: string): keyof PosRow {
  if (!p) return 'MID';
  const u = p.toUpperCase();
  if (u.includes('GK')) return 'GK';
  if (u === 'DEF' || u === 'DF' || u === 'MID/DEF') return 'DEF';
  if (u.startsWith('FWD') || u === 'FW' || u === 'ATK') return 'FWD';
  return 'MID';  // MID, MF, FWD/MID hybrids default here
}

function ageGrp(age: number): string {
  return age <= 10 ? 'u10' : age === 11 ? 'u11' : age === 12 ? 'u12'
       : age <= 15 ? 'u15' : age <= 18 ? 'u18' : 'snr';
}

/** Lower-is-better: score based on max-threshold table */
function sL(v: number, t: T4): number {
  return v <= t[0] ? 5 : v <= t[1] ? 4 : v <= t[2] ? 3 : v <= t[3] ? 2 : 1;
}
/** Higher-is-better: score based on min-threshold table */
function sH(v: number, t: T4): number {
  return v >= t[0] ? 5 : v >= t[1] ? 4 : v >= t[2] ? 3 : v >= t[3] ? 2 : 1;
}

// ─── Main scoring function ───────────────────────────────────────────────────

export function getScorePoint(metric: string, val: string | number, dob: string, position?: string): number {
  const v = parseFloat(String(val));
  if (isNaN(v) || v === 0) return 0;

  let age = 0;
  if (dob && dob !== '-') {
    const birth = new Date(dob);
    const today = new Date();
    if (!isNaN(birth.getTime())) {
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    }
  }

  const pos = normalizePos(position);
  const grp = ageGrp(age);

  // ── Position-specific metrics ──────────────────────────────────────────
  if (metric === 'speed30')  return sL(v, SPEED30[grp][pos]);
  if (metric === 'cmj')      return sH(v, CMJ[grp][pos]);
  if (metric === 'yoyo')     return sH(v, YOYO[grp][pos]);
  if (metric === 'sitreach') return sH(v, SITREACH[grp][pos]);

  // ── Non-position-specific metrics (same within age group) ─────────────
  if (age <= 10) {
    switch (metric) {
      case 'agility':  return v <= 20.50 ? 5 : v <= 22.00 ? 4 : v <= 23.50 ? 3 : v <= 25.00 ? 2 : 1;
      case 'situp':    return v > 40 ? 5 : v >= 33 ? 4 : v >= 25 ? 3 : v >= 18 ? 2 : 1;
      case 'longjump': return v > 155 ? 5 : v >= 141 ? 4 : v >= 126 ? 3 : v >= 110 ? 2 : 1;
      case 'pushup':   return v > 30 ? 5 : v >= 23 ? 4 : v >= 16 ? 3 : v >= 10 ? 2 : 1;
    }
  } else if (age === 11) {
    switch (metric) {
      case 'agility':  return v <= 19.00 ? 5 : v <= 20.50 ? 4 : v <= 22.00 ? 3 : v <= 23.50 ? 2 : 1;
      case 'situp':    return v >= 26 ? 5 : v >= 21 ? 4 : v >= 16 ? 3 : v >= 12 ? 2 : 1;
      case 'pushup':   return v >= 17 ? 5 : v >= 13 ? 4 : v >= 9 ? 3 : v >= 6 ? 2 : 1;
      case 'longjump': return v >= 165 ? 5 : v >= 150 ? 4 : v >= 135 ? 3 : v >= 120 ? 2 : 1;
    }
  } else if (age === 12) {
    switch (metric) {
      case 'agility':  return v <= 18.50 ? 5 : v <= 20.00 ? 4 : v <= 21.50 ? 3 : v <= 23.00 ? 2 : 1;
      case 'situp':    return v >= 28 ? 5 : v >= 23 ? 4 : v >= 18 ? 3 : v >= 13 ? 2 : 1;
      case 'pushup':   return v >= 18 ? 5 : v >= 14 ? 4 : v >= 10 ? 3 : v >= 6 ? 2 : 1;
      case 'longjump': return v >= 175 ? 5 : v >= 158 ? 4 : v >= 141 ? 3 : v >= 124 ? 2 : 1;
    }
  } else if (age >= 13 && age <= 15) {
    switch (metric) {
      case 'agility':  return v <= 16.00 ? 5 : v <= 17.20 ? 4 : v <= 18.40 ? 3 : v <= 19.60 ? 2 : 1;
      case 'situp':    return v >= 37 ? 5 : v >= 31 ? 4 : v >= 25 ? 3 : v >= 19 ? 2 : 1;
      case 'pushup':   return v >= 28 ? 5 : v >= 22 ? 4 : v >= 16 ? 3 : v >= 10 ? 2 : 1;
      case 'longjump': return v >= 215 ? 5 : v >= 198 ? 4 : v >= 181 ? 3 : v >= 164 ? 2 : 1;
    }
  } else if (age >= 16 && age <= 18) {
    switch (metric) {
      case 'agility':  return v <= 15.20 ? 5 : v <= 16.40 ? 4 : v <= 17.60 ? 3 : v <= 18.80 ? 2 : 1;
      case 'situp':    return v >= 44 ? 5 : v >= 38 ? 4 : v >= 32 ? 3 : v >= 26 ? 2 : 1;
      case 'pushup':   return v >= 36 ? 5 : v >= 29 ? 4 : v >= 22 ? 3 : v >= 15 ? 2 : 1;
      case 'longjump': return v >= 240 ? 5 : v >= 222 ? 4 : v >= 204 ? 3 : v >= 186 ? 2 : 1;
    }
  } else {
    switch (metric) {
      case 'agility':  return v <= 14.80 ? 5 : v <= 16.00 ? 4 : v <= 17.20 ? 3 : v <= 18.40 ? 2 : 1;
      case 'situp':    return v >= 50 ? 5 : v >= 44 ? 4 : v >= 38 ? 3 : v >= 32 ? 2 : 1;
      case 'pushup':   return v >= 42 ? 5 : v >= 35 ? 4 : v >= 27 ? 3 : v >= 19 ? 2 : 1;
      case 'longjump': return v >= 255 ? 5 : v >= 238 ? 4 : v >= 220 ? 3 : v >= 202 ? 2 : 1;
    }
  }

  return 0;
}

// ─── Score colors ────────────────────────────────────────────────────────────

export const SCORE_COLORS: Record<number, { bg: string; color: string; label: string; labelTH: string }> = {
  5: { bg: '#d1fae5', color: '#065f46', label: 'Elite',   labelTH: 'ยอดเยี่ยม' },
  4: { bg: '#dbeafe', color: '#1e40af', label: 'Good',    labelTH: 'ดี' },
  3: { bg: '#fef9c3', color: '#713f12', label: 'Average', labelTH: 'ปานกลาง' },
  2: { bg: '#fee2e2', color: '#991b1b', label: 'Fair',    labelTH: 'พัฒนาได้' },
  1: { bg: '#fecaca', color: '#7f1d1d', label: 'Poor',    labelTH: 'ต้องปรับปรุง' },
};

// ─── Benchmark display tables ─────────────────────────────────────────────────
// Values shown are representative averages (MID/midfielder) for each metric.
// Actual scoring is position-specific — a FWD will need higher CMJ / lower speed30.

export const SCORE_BENCHMARKS: Record<string, {
  label: string;
  unit: string;
  positionSpecific: boolean;
  groups: { age: string; s5: string; s4: string; s3: string; s2: string }[];
}> = {
  agility: {
    label: 'ความคล่องตัว (Illinois L+R)',
    unit: 'วินาที (น้อยกว่า = ดีกว่า)',
    positionSpecific: false,
    groups: [
      { age: '8–10',  s5: '≤20.50', s4: '20.51–22.00', s3: '22.01–23.50', s2: '23.51–25.00' },
      { age: '11',    s5: '≤19.00', s4: '19.01–20.50', s3: '20.51–22.00', s2: '22.01–23.50' },
      { age: '12',    s5: '≤18.50', s4: '18.51–20.00', s3: '20.01–21.50', s2: '21.51–23.00' },
      { age: '13–15', s5: '≤16.00', s4: '16.01–17.20', s3: '17.21–18.40', s2: '18.41–19.60' },
      { age: '16–18', s5: '≤15.20', s4: '15.21–16.40', s3: '16.41–17.60', s2: '17.61–18.80' },
      { age: '19+',   s5: '≤14.80', s4: '14.81–16.00', s3: '16.01–17.20', s2: '17.21–18.40' },
    ],
  },
  speed30: {
    label: 'ความเร็ว 30 ม.',
    unit: 'วินาที (น้อยกว่า = ดีกว่า) — แสดงค่า MF / ค่าจริงแบ่งตามตำแหน่ง',
    positionSpecific: true,
    groups: [
      { age: '8–10  GK/MF', s5: '≤5.20',  s4: '5.21–5.50', s3: '5.51–5.80', s2: '5.81–6.10' },
      { age: '8–10  DEF',   s5: '≤5.25',  s4: '5.26–5.55', s3: '5.56–5.85', s2: '5.86–6.15' },
      { age: '8–10  FWD',   s5: '≤5.05',  s4: '5.06–5.35', s3: '5.36–5.65', s2: '5.66–5.95' },
      { age: '11 GK/MF',    s5: '≤4.90',  s4: '4.91–5.20', s3: '5.21–5.50', s2: '5.51–5.80' },
      { age: '11 DEF',      s5: '≤4.95',  s4: '4.96–5.25', s3: '5.26–5.55', s2: '5.56–5.85' },
      { age: '11 FWD',      s5: '≤4.75',  s4: '4.76–5.05', s3: '5.06–5.35', s2: '5.36–5.65' },
      { age: '12 GK/MF',    s5: '≤4.60',  s4: '4.61–4.90', s3: '4.91–5.20', s2: '5.21–5.50' },
      { age: '12 DEF',      s5: '≤4.65',  s4: '4.66–4.95', s3: '4.96–5.25', s2: '5.26–5.55' },
      { age: '12 FWD',      s5: '≤4.45',  s4: '4.46–4.75', s3: '4.76–5.05', s2: '5.06–5.35' },
      { age: '13–15 GK',    s5: '≤4.10',  s4: '4.11–4.30', s3: '4.31–4.50', s2: '4.51–4.70' },
      { age: '13–15 DEF',   s5: '≤4.07',  s4: '4.08–4.27', s3: '4.28–4.46', s2: '4.47–4.67' },
      { age: '13–15 MF',    s5: '≤4.11',  s4: '4.12–4.30', s3: '4.31–4.51', s2: '4.52–4.69' },
      { age: '13–15 FWD',   s5: '≤3.84',  s4: '3.85–4.18', s3: '4.19–4.48', s2: '4.49–4.82' },
      { age: '16–18 GK/MF', s5: '≤3.85',  s4: '3.86–4.10', s3: '4.11–4.35', s2: '4.36–4.60' },
      { age: '16–18 DEF',   s5: '≤3.90',  s4: '3.91–4.15', s3: '4.16–4.40', s2: '4.41–4.65' },
      { age: '16–18 FWD',   s5: '≤3.65',  s4: '3.66–3.95', s3: '3.96–4.20', s2: '4.21–4.45' },
      { age: '19+  GK/MF',  s5: '≤3.70',  s4: '3.71–3.90', s3: '3.91–4.15', s2: '4.16–4.40' },
      { age: '19+  DEF',    s5: '≤3.75',  s4: '3.76–3.95', s3: '3.96–4.20', s2: '4.21–4.45' },
      { age: '19+  FWD',    s5: '≤3.50',  s4: '3.51–3.70', s3: '3.71–3.95', s2: '3.96–4.20' },
    ],
  },
  cmj: {
    label: 'กระโดดแนวตั้ง (CMJ ไม่เหวี่ยงแขน)',
    unit: 'เซนติเมตร (มากกว่า = ดีกว่า) — แบ่งตามตำแหน่ง',
    positionSpecific: true,
    groups: [
      { age: '8–10  GK',    s5: '≥29', s4: '25–28', s3: '21–24', s2: '16–20' },
      { age: '8–10  DEF',   s5: '≥26', s4: '22–25', s3: '18–21', s2: '14–17' },
      { age: '8–10  MF',    s5: '≥27', s4: '23–26', s3: '19–22', s2: '15–18' },
      { age: '8–10  FWD',   s5: '≥31', s4: '27–30', s3: '23–26', s2: '18–22' },
      { age: '11 GK',       s5: '≥34', s4: '29–33', s3: '24–28', s2: '19–23' },
      { age: '11 DEF',      s5: '≥31', s4: '26–30', s3: '21–25', s2: '16–20' },
      { age: '11 MF',       s5: '≥32', s4: '27–31', s3: '22–26', s2: '17–21' },
      { age: '11 FWD',      s5: '≥36', s4: '31–35', s3: '26–30', s2: '20–25' },
      { age: '12 GK',       s5: '≥38', s4: '33–37', s3: '28–32', s2: '23–27' },
      { age: '12 DEF',      s5: '≥35', s4: '30–34', s3: '25–29', s2: '20–24' },
      { age: '12 MF',       s5: '≥36', s4: '31–35', s3: '26–30', s2: '21–25' },
      { age: '12 FWD',      s5: '≥40', s4: '35–39', s3: '30–34', s2: '24–29' },
      { age: '13–15 GK',    s5: '≥42', s4: '38–41', s3: '34–37', s2: '30–33' },
      { age: '13–15 DEF',   s5: '≥39', s4: '36–38', s3: '32–35', s2: '29–31' },
      { age: '13–15 MF',    s5: '≥40', s4: '36–39', s3: '33–35', s2: '29–32' },
      { age: '13–15 FWD',   s5: '≥43', s4: '38–42', s3: '34–37', s2: '29–33' },
      { age: '16–18 GK',    s5: '≥53', s4: '48–52', s3: '44–47', s2: '39–43' },
      { age: '16–18 DEF',   s5: '≥48', s4: '44–47', s3: '40–43', s2: '35–39' },
      { age: '16–18 MF',    s5: '≥50', s4: '46–49', s3: '42–45', s2: '37–41' },
      { age: '16–18 FWD',   s5: '≥55', s4: '50–54', s3: '46–49', s2: '40–45' },
      { age: '19+  GK',     s5: '≥60', s4: '55–59', s3: '50–54', s2: '44–49' },
      { age: '19+  DEF',    s5: '≥55', s4: '50–54', s3: '46–49', s2: '41–45' },
      { age: '19+  MF',     s5: '≥57', s4: '52–56', s3: '48–51', s2: '43–47' },
      { age: '19+  FWD',    s5: '≥63', s4: '57–62', s3: '52–56', s2: '45–51' },
    ],
  },
  yoyo: {
    label: 'วิ่งรับ (Yo-Yo IR Level 1)',
    unit: 'เมตร (มากกว่า = ดีกว่า) — แบ่งตามตำแหน่ง',
    positionSpecific: true,
    groups: [
      { age: '8–10  GK',    s5: '≥480',  s4: '340–479', s3: '200–339', s2: '100–199' },
      { age: '8–10  DEF',   s5: '≥560',  s4: '400–559', s3: '240–399', s2: '120–239' },
      { age: '8–10  MF',    s5: '≥600',  s4: '440–599', s3: '280–439', s2: '140–279' },
      { age: '8–10  FWD',   s5: '≥520',  s4: '360–519', s3: '200–359', s2: '100–199' },
      { age: '11 GK',       s5: '≥640',  s4: '480–639', s3: '300–479', s2: '150–299' },
      { age: '11 DEF',      s5: '≥720',  s4: '560–719', s3: '360–559', s2: '180–359' },
      { age: '11 MF',       s5: '≥800',  s4: '620–799', s3: '400–619', s2: '200–399' },
      { age: '11 FWD',      s5: '≥680',  s4: '520–679', s3: '320–519', s2: '160–319' },
      { age: '12 GK',       s5: '≥760',  s4: '580–759', s3: '380–579', s2: '190–379' },
      { age: '12 DEF',      s5: '≥840',  s4: '640–839', s3: '400–639', s2: '200–399' },
      { age: '12 MF',       s5: '≥960',  s4: '760–959', s3: '480–759', s2: '240–479' },
      { age: '12 FWD',      s5: '≥800',  s4: '620–799', s3: '380–619', s2: '190–379' },
      { age: '13–15 GK',    s5: '≥1200', s4: '960–1199',  s3: '720–959',  s2: '480–719' },
      { age: '13–15 DEF',   s5: '≥1400', s4: '1080–1399', s3: '800–1079', s2: '480–799' },
      { age: '13–15 MF',    s5: '≥1520', s4: '1200–1519', s3: '880–1199', s2: '600–879' },
      { age: '13–15 FWD',   s5: '≥1600', s4: '1240–1599', s3: '840–1239', s2: '480–839' },
      { age: '16–18 GK',    s5: '≥1600', s4: '1280–1599', s3: '960–1279', s2: '640–959' },
      { age: '16–18 DEF',   s5: '≥2000', s4: '1600–1999', s3: '1200–1599', s2: '700–1199' },
      { age: '16–18 MF',    s5: '≥2400', s4: '1900–2399', s3: '1400–1899', s2: '800–1399' },
      { age: '16–18 FWD',   s5: '≥2000', s4: '1600–1999', s3: '1150–1599', s2: '680–1149' },
      { age: '19+  GK',     s5: '≥2000', s4: '1600–1999', s3: '1200–1599', s2: '800–1199' },
      { age: '19+  DEF',    s5: '≥2400', s4: '1900–2399', s3: '1400–1899', s2: '900–1399' },
      { age: '19+  MF',     s5: '≥2800', s4: '2200–2799', s3: '1600–2199', s2: '1000–1599' },
      { age: '19+  FWD',    s5: '≥2400', s4: '1900–2399', s3: '1400–1899', s2: '850–1399' },
    ],
  },
};
