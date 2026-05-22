/**
 * Football Physical Performance Scoring — Research-Based Benchmarks
 *
 * Sources:
 *  Speed30  : Metaxas et al. (2009); Svensson & Drust (2005); Thai NSA sprint norms
 *  CMJ      : Buchheit & Mendez-Villanueva (2013); Ford et al. (2011)
 *  Agility  : Illinois Agility Test norms; Draper & Lancaster (1985)
 *  Situp    : Thailand DPSPE youth fitness norms; AAHPERD
 *  Pushup   : AAHPERD; Thai youth PE standards
 *  LongJump : Standing Broad Jump — FITNESSGRAM; Thai PE norms
 *  YoYo     : Bangsbo et al. (2008); Le Gall et al. (2010); Rebelo et al. (2014)
 *  SitReach : Thai PE norms; EUROFIT
 *
 * Score 5 = Elite / ยอดเยี่ยม
 * Score 4 = Good  / ดี
 * Score 3 = Average / ปานกลาง
 * Score 2 = Fair  / พัฒนาได้
 * Score 1 = Poor  / ต้องปรับปรุง
 */

export function getScorePoint(metric: string, val: string | number, dob: string): number {
  const v = parseFloat(String(val));
  if (isNaN(v) || v === 0) return 0;

  // Calculate precise age in years
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

  // ─────────────────────────────────────────────────────────────────
  // U8–U10 : อายุ ≤ 10 ปี  — ISP Performance Norms (8-Test Battery)
  // Speed30: <5.40=5, 5.40-5.69=4, 5.70-5.99=3, 6.00-6.30=2, >6.30=1
  // CMJ: >26=5, 23-26=4, 19-22=3, 15-18=2, <15=1
  // Agility (Arrowhead): <9.20=5, 9.20-9.99=4, 10.00-10.79=3, 10.80-11.50=2, >11.50=1
  // Situp(40s): >40=5, 33-40=4, 25-32=3, 18-24=2, <18=1
  // LongJump: >155=5, 141-155=4, 126-140=3, 110-125=2, <110=1
  // Yoyo(20mShuttle): >1200=5, 1001-1200=4, 851-1000=3, 700-850=2, <700=1
  // Pushup(40s): >30=5, 23-30=4, 16-22=3, 10-15=2, <10=1
  // SitReach: >25=5, 21-25=4, 16-20=3, 10-15=2, <10=1
  // ─────────────────────────────────────────────────────────────────
  if (age <= 10) {
    switch (metric) {
      case 'speed30':   return v < 5.40 ? 5 : v < 5.70 ? 4 : v < 6.00 ? 3 : v <= 6.30 ? 2 : 1;
      case 'cmj':       return v > 26 ? 5 : v >= 23 ? 4 : v >= 19 ? 3 : v >= 15 ? 2 : 1;
      case 'agility':   return v < 9.20 ? 5 : v < 10.00 ? 4 : v < 10.80 ? 3 : v <= 11.50 ? 2 : 1;
      case 'situp':     return v > 40 ? 5 : v >= 33 ? 4 : v >= 25 ? 3 : v >= 18 ? 2 : 1;
      case 'longjump':  return v > 155 ? 5 : v >= 141 ? 4 : v >= 126 ? 3 : v >= 110 ? 2 : 1;
      case 'yoyo':      return v > 1200 ? 5 : v >= 1001 ? 4 : v >= 851 ? 3 : v >= 700 ? 2 : 1;
      case 'pushup':    return v > 30 ? 5 : v >= 23 ? 4 : v >= 16 ? 3 : v >= 10 ? 2 : 1;
      case 'sitreach':  return v > 25 ? 5 : v >= 21 ? 4 : v >= 16 ? 3 : v >= 10 ? 2 : 1;
    }

  // ─────────────────────────────────────────────────────────────────
  // U11 : อายุ 11 ปี
  // ─────────────────────────────────────────────────────────────────
  } else if (age === 11) {
    switch (metric) {
      case 'speed30':   return v <= 5.20 ? 5 : v <= 5.60 ? 4 : v <= 6.00 ? 3 : v <= 6.40 ? 2 : 1;
      case 'cmj':       return v >= 29 ? 5 : v >= 24 ? 4 : v >= 19 ? 3 : v >= 15 ? 2 : 1;
      case 'agility':   return v <= 19.00 ? 5 : v <= 20.50 ? 4 : v <= 22.00 ? 3 : v <= 23.50 ? 2 : 1;
      case 'situp':     return v >= 26 ? 5 : v >= 21 ? 4 : v >= 16 ? 3 : v >= 12 ? 2 : 1;
      case 'pushup':    return v >= 17 ? 5 : v >= 13 ? 4 : v >= 9 ? 3 : v >= 6 ? 2 : 1;
      case 'longjump':  return v >= 165 ? 5 : v >= 150 ? 4 : v >= 135 ? 3 : v >= 120 ? 2 : 1;
      case 'yoyo':      return v >= 720 ? 5 : v >= 560 ? 4 : v >= 360 ? 3 : v >= 180 ? 2 : 1;
      case 'sitreach':  return v >= 20 ? 5 : v >= 14 ? 4 : v >= 8 ? 3 : v >= 2 ? 2 : 1;
    }

  // ─────────────────────────────────────────────────────────────────
  // U12 : อายุ 12 ปี
  // ─────────────────────────────────────────────────────────────────
  } else if (age === 12) {
    switch (metric) {
      case 'speed30':   return v <= 5.00 ? 5 : v <= 5.40 ? 4 : v <= 5.80 ? 3 : v <= 6.20 ? 2 : 1;
      case 'cmj':       return v >= 32 ? 5 : v >= 27 ? 4 : v >= 22 ? 3 : v >= 17 ? 2 : 1;
      case 'agility':   return v <= 18.50 ? 5 : v <= 20.00 ? 4 : v <= 21.50 ? 3 : v <= 23.00 ? 2 : 1;
      case 'situp':     return v >= 28 ? 5 : v >= 23 ? 4 : v >= 18 ? 3 : v >= 13 ? 2 : 1;
      case 'pushup':    return v >= 18 ? 5 : v >= 14 ? 4 : v >= 10 ? 3 : v >= 6 ? 2 : 1;
      case 'longjump':  return v >= 175 ? 5 : v >= 158 ? 4 : v >= 141 ? 3 : v >= 124 ? 2 : 1;
      case 'yoyo':      return v >= 840 ? 5 : v >= 640 ? 4 : v >= 400 ? 3 : v >= 200 ? 2 : 1;
      case 'sitreach':  return v >= 20 ? 5 : v >= 14 ? 4 : v >= 8 ? 3 : v >= 2 ? 2 : 1;
    }

  // ─────────────────────────────────────────────────────────────────
  // U15 : อายุ 13–15 ปี (puberty — rapid improvement)
  // ─────────────────────────────────────────────────────────────────
  } else if (age >= 13 && age <= 15) {
    switch (metric) {
      case 'speed30':
        // ดีมาก: <4.2s  ดี: 4.2–4.6  ปาน: 4.6–5.0  พัฒนา: 5.0–5.4  ต้อง: >5.4
        return v <= 4.20 ? 5 : v <= 4.60 ? 4 : v <= 5.00 ? 3 : v <= 5.40 ? 2 : 1;

      case 'cmj':
        // ดีมาก: ≥43cm (Le Gall elite U14–U15)
        return v >= 43 ? 5 : v >= 37 ? 4 : v >= 31 ? 3 : v >= 25 ? 2 : 1;

      case 'agility':
        // Illinois: ดีมาก ≤16.0s
        return v <= 16.00 ? 5 : v <= 17.20 ? 4 : v <= 18.40 ? 3 : v <= 19.60 ? 2 : 1;

      case 'situp':
        // ดีมาก: ≥37
        return v >= 37 ? 5 : v >= 31 ? 4 : v >= 25 ? 3 : v >= 19 ? 2 : 1;

      case 'pushup':
        // ดีมาก: ≥28
        return v >= 28 ? 5 : v >= 22 ? 4 : v >= 16 ? 3 : v >= 10 ? 2 : 1;

      case 'longjump':
        // ดีมาก: ≥215cm
        return v >= 215 ? 5 : v >= 198 ? 4 : v >= 181 ? 3 : v >= 164 ? 2 : 1;

      case 'yoyo':
        // Le Gall (2010): U13 ~840m, U14 ~1080m, U15 ~1320m elite
        // ดีมาก: ≥1680m  ดี: 1200  ปาน: 760  พัฒนา: 360
        return v >= 1680 ? 5 : v >= 1200 ? 4 : v >= 760 ? 3 : v >= 360 ? 2 : 1;

      case 'sitreach':
        // ดีมาก: ≥24cm
        return v >= 24 ? 5 : v >= 17 ? 4 : v >= 10 ? 3 : v >= 3 ? 2 : 1;
    }

  // ─────────────────────────────────────────────────────────────────
  // U18 : อายุ 16–18 ปี (near-adult strength, high aerobic demand)
  // ─────────────────────────────────────────────────────────────────
  } else if (age >= 16 && age <= 18) {
    switch (metric) {
      case 'speed30':
        // ดีมาก: <3.95s  ดี: 3.95–4.20  ปาน: 4.20–4.55  พัฒนา: 4.55–4.85
        return v <= 3.95 ? 5 : v <= 4.20 ? 4 : v <= 4.55 ? 3 : v <= 4.85 ? 2 : 1;

      case 'cmj':
        // Buchheit (2013) elite U17–U18 ~52–58cm
        return v >= 52 ? 5 : v >= 46 ? 4 : v >= 39 ? 3 : v >= 32 ? 2 : 1;

      case 'agility':
        // Illinois: ดีมาก ≤15.2s  (ต่างจาก U15 อย่างชัดเจน ~0.8s)
        return v <= 15.20 ? 5 : v <= 16.40 ? 4 : v <= 17.60 ? 3 : v <= 18.80 ? 2 : 1;

      case 'situp':
        // ดีมาก: ≥44
        return v >= 44 ? 5 : v >= 38 ? 4 : v >= 32 ? 3 : v >= 26 ? 2 : 1;

      case 'pushup':
        // ดีมาก: ≥36
        return v >= 36 ? 5 : v >= 29 ? 4 : v >= 22 ? 3 : v >= 15 ? 2 : 1;

      case 'longjump':
        // ดีมาก: ≥240cm
        return v >= 240 ? 5 : v >= 222 ? 4 : v >= 204 ? 3 : v >= 186 ? 2 : 1;

      case 'yoyo':
        // Le Gall (2010): U16 ~1680m, U17 ~1960m, U18 ~2160m elite
        // ดีมาก: ≥2400m  ดี: 1800  ปาน: 1200  พัฒนา: 600
        return v >= 2400 ? 5 : v >= 1800 ? 4 : v >= 1200 ? 3 : v >= 600 ? 2 : 1;

      case 'sitreach':
        // ดีมาก: ≥26cm (flexibility ดีขึ้นหลังพัฒนากล้ามเนื้อ)
        return v >= 26 ? 5 : v >= 19 ? 4 : v >= 12 ? 3 : v >= 5 ? 2 : 1;
    }

  // ─────────────────────────────────────────────────────────────────
  // Senior : อายุ 19+ (professional / adult standard)
  // ─────────────────────────────────────────────────────────────────
  } else {
    switch (metric) {
      case 'speed30':
        // นักกีฬาอาชีพ: <3.85s  ระดับดี: 3.85–4.05  ปาน: 4.05–4.35
        return v <= 3.85 ? 5 : v <= 4.05 ? 4 : v <= 4.35 ? 3 : v <= 4.65 ? 2 : 1;

      case 'cmj':
        // Buchheit senior elite ~58–65cm
        return v >= 58 ? 5 : v >= 51 ? 4 : v >= 44 ? 3 : v >= 37 ? 2 : 1;

      case 'agility':
        // Illinois professional: ≤14.8s
        return v <= 14.80 ? 5 : v <= 16.00 ? 4 : v <= 17.20 ? 3 : v <= 18.40 ? 2 : 1;

      case 'situp':
        // ดีมาก: ≥50
        return v >= 50 ? 5 : v >= 44 ? 4 : v >= 38 ? 3 : v >= 32 ? 2 : 1;

      case 'pushup':
        // ดีมาก: ≥42
        return v >= 42 ? 5 : v >= 35 ? 4 : v >= 27 ? 3 : v >= 19 ? 2 : 1;

      case 'longjump':
        // ดีมาก: ≥255cm
        return v >= 255 ? 5 : v >= 238 ? 4 : v >= 220 ? 3 : v >= 202 ? 2 : 1;

      case 'yoyo':
        // Bangsbo (2008): professional ~2200–3000m
        // ดีมาก: ≥2800m  ดี: 2200  ปาน: 1600  พัฒนา: 1000
        return v >= 2800 ? 5 : v >= 2200 ? 4 : v >= 1600 ? 3 : v >= 1000 ? 2 : 1;

      case 'sitreach':
        // ดีมาก: ≥28cm
        return v >= 28 ? 5 : v >= 21 ? 4 : v >= 14 ? 3 : v >= 7 ? 2 : 1;
    }
  }

  return 0;
}

export const SCORE_COLORS: Record<number, { bg: string; color: string; label: string; labelTH: string }> = {
  5: { bg: '#d1fae5', color: '#065f46', label: 'Elite',   labelTH: 'ยอดเยี่ยม' },
  4: { bg: '#dbeafe', color: '#1e40af', label: 'Good',    labelTH: 'ดี' },
  3: { bg: '#fef9c3', color: '#713f12', label: 'Average', labelTH: 'ปานกลาง' },
  2: { bg: '#fee2e2', color: '#991b1b', label: 'Fair',    labelTH: 'พัฒนาได้' },
  1: { bg: '#fecaca', color: '#7f1d1d', label: 'Poor',    labelTH: 'ต้องปรับปรุง' },
};

/**
 * Human-readable benchmark ranges for display (Thai label)
 * Used in tooltips / legend / report
 */
export const SCORE_BENCHMARKS: Record<string, {
  label: string;
  unit: string;
  groups: { age: string; s5: string; s4: string; s3: string; s2: string }[];
}> = {
  speed30: {
    label: 'ความเร็ว 30 ม.',
    unit: 'วินาที (น้อยกว่า = ดีกว่า)',
    groups: [
      { age: '8–10',  s5: '<5.40',  s4: '5.40–5.69', s3: '5.70–5.99', s2: '6.00–6.30' },
      { age: '11',    s5: '<5.20',  s4: '5.20–5.60', s3: '5.60–6.00', s2: '6.00–6.40' },
      { age: '12',    s5: '<5.00',  s4: '5.00–5.40', s3: '5.40–5.80', s2: '5.80–6.20' },
      { age: '13–15', s5: '<4.20',  s4: '4.20–4.60', s3: '4.60–5.00', s2: '5.00–5.40' },
      { age: '16–18', s5: '<3.95',  s4: '3.95–4.20', s3: '4.20–4.55', s2: '4.55–4.85' },
      { age: '19+',   s5: '<3.85',  s4: '3.85–4.05', s3: '4.05–4.35', s2: '4.35–4.65' },
    ],
  },
  cmj: {
    label: 'กระโดดแนวตั้ง (CMJ)',
    unit: 'เซนติเมตร (มากกว่า = ดีกว่า)',
    groups: [
      { age: '8–10',  s5: '>26',  s4: '23–26', s3: '19–22', s2: '15–18' },
      { age: '11',    s5: '≥29',  s4: '24–29', s3: '19–24', s2: '15–19' },
      { age: '12',    s5: '≥32',  s4: '27–32', s3: '22–27', s2: '17–22' },
      { age: '13–15', s5: '≥43',  s4: '37–43', s3: '31–37', s2: '25–31' },
      { age: '16–18', s5: '≥52',  s4: '46–52', s3: '39–46', s2: '32–39' },
      { age: '19+',   s5: '≥58',  s4: '51–58', s3: '44–51', s2: '37–44' },
    ],
  },
  yoyo: {
    label: 'วิ่งรับ (Shuttle/Yo-Yo)',
    unit: 'เมตร (มากกว่า = ดีกว่า)',
    groups: [
      { age: '8–10',  s5: '>1200', s4: '1001–1200', s3: '851–1000', s2: '700–850' },
      { age: '11–12', s5: '≥840',  s4: '640–840',   s3: '400–640',  s2: '200–400' },
      { age: '13–15', s5: '≥1680', s4: '1200–1680', s3: '760–1200', s2: '360–760' },
      { age: '16–18', s5: '≥2400', s4: '1800–2400', s3: '1200–1800', s2: '600–1200' },
      { age: '19+',   s5: '≥2800', s4: '2200–2800', s3: '1600–2200', s2: '1000–1600' },
    ],
  },
};
