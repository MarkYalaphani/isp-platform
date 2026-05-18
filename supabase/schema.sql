-- ============================================================
-- Improve Pro Scout — Supabase Schema
-- วิธีใช้: copy ทั้งหมด → วางใน Supabase SQL Editor → Run
-- ============================================================

-- 1. Users (ผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT DEFAULT 'club' CHECK (role IN ('admin','club','club_pro')),
  display_name TEXT NOT NULL DEFAULT '',
  club_id     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- อัพเดท constraint ถ้ามีฐานข้อมูลเก่าที่ยังไม่มี club_pro
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','club','club_pro'));

-- 2. Athletes (ข้อมูลนักกีฬา)
CREATE TABLE IF NOT EXISTS athletes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  nickname    TEXT DEFAULT '',
  dob         TEXT DEFAULT '',
  team        TEXT DEFAULT '',
  dom_hand    TEXT DEFAULT 'Right',
  dom_foot    TEXT DEFAULT 'Right',
  position    TEXT DEFAULT '',
  club        TEXT DEFAULT '',
  province    TEXT DEFAULT '',
  club_id     TEXT DEFAULT '',
  photo_url   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Test Records (ผลการทดสอบ)
CREATE TABLE IF NOT EXISTS test_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    TEXT NOT NULL REFERENCES athletes(player_id) ON DELETE CASCADE,
  timestamp    TIMESTAMPTZ DEFAULT NOW(),
  height       TEXT DEFAULT '',
  weight       TEXT DEFAULT '',
  muscle       TEXT DEFAULT '',
  fat          TEXT DEFAULT '',
  cmj          TEXT DEFAULT '',
  peak_power   TEXT DEFAULT '',
  bmi          TEXT DEFAULT '',
  rating       INTEGER DEFAULT 0,
  speed30      TEXT DEFAULT '',
  agility      TEXT DEFAULT '',
  yoyo         TEXT DEFAULT '',
  situp        TEXT DEFAULT '',
  long_jump    TEXT DEFAULT '',
  pushup       TEXT DEFAULT '',
  sit_and_reach TEXT DEFAULT '',
  agi_l        TEXT DEFAULT '',
  agi_r        TEXT DEFAULT '',
  yoyo_level   TEXT DEFAULT '',
  yoyo_shuttle TEXT DEFAULT '',
  vo2max       TEXT DEFAULT ''
);

-- 4. IR Reports (Individual Report)
CREATE TABLE IF NOT EXISTS ir_reports (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id        TEXT NOT NULL REFERENCES athletes(player_id) ON DELETE CASCADE,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  coach            TEXT DEFAULT '',
  period           TEXT DEFAULT '',
  season           TEXT DEFAULT 'Pre-Season',
  b_ontime         INTEGER DEFAULT 0,
  b_effort         INTEGER DEFAULT 0,
  b_teamwork       INTEGER DEFAULT 0,
  b_respect        INTEGER DEFAULT 0,
  b_attendance     INTEGER DEFAULT 0,
  b_participation  INTEGER DEFAULT 0,
  b_improvement    INTEGER DEFAULT 0,
  l_sleep          INTEGER DEFAULT 0,
  l_hydration      INTEGER DEFAULT 0,
  l_diet           INTEGER DEFAULT 0,
  l_screentime     INTEGER DEFAULT 0,
  t_motricity      INTEGER DEFAULT 0,
  t_technical      INTEGER DEFAULT 0,
  t_tactic         INTEGER DEFAULT 0,
  t_offfundam      INTEGER DEFAULT 0,
  t_deffundam      INTEGER DEFAULT 0,
  t_fitness        INTEGER DEFAULT 0,
  med_period1      TEXT DEFAULT '',
  med_injury1      TEXT DEFAULT '',
  med_absence1     TEXT DEFAULT '',
  med_period2      TEXT DEFAULT '',
  med_injury2      TEXT DEFAULT '',
  med_absence2     TEXT DEFAULT '',
  good_level       TEXT DEFAULT '',
  to_improve       TEXT DEFAULT '',
  comments         TEXT DEFAULT '',
  behaviour_score  DECIMAL DEFAULT 0,
  lifestyle_score  DECIMAL DEFAULT 0,
  technical_score  DECIMAL DEFAULT 0,
  overall_ir_score DECIMAL DEFAULT 0
);

-- 5. Skill Assessments (Technical Skill Performance)
CREATE TABLE IF NOT EXISTS skill_assessments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES athletes(player_id) ON DELETE CASCADE,
  assessed_at   TIMESTAMPTZ DEFAULT NOW(),
  assessed_by   TEXT DEFAULT '',
  season        TEXT DEFAULT '',
  -- A. Ball Control (1–5)
  sk_first_touch      SMALLINT DEFAULT 0,
  sk_ball_control     SMALLINT DEFAULT 0,
  sk_receiving        SMALLINT DEFAULT 0,
  sk_weak_foot        SMALLINT DEFAULT 0,
  sk_pressure_ctrl    SMALLINT DEFAULT 0,
  -- B. Passing (1–5)
  sk_pass_accuracy    SMALLINT DEFAULT 0,
  sk_short_pass       SMALLINT DEFAULT 0,
  sk_long_pass        SMALLINT DEFAULT 0,
  sk_through_pass     SMALLINT DEFAULT 0,
  sk_one_touch        SMALLINT DEFAULT 0,
  sk_pass_pressure    SMALLINT DEFAULT 0,
  -- C. Dribbling / 1v1 (1–5)
  sk_dribble_speed    SMALLINT DEFAULT 0,
  sk_direction_change SMALLINT DEFAULT 0,
  sk_beat_opp         SMALLINT DEFAULT 0,
  sk_tight_space      SMALLINT DEFAULT 0,
  sk_skill_exec       SMALLINT DEFAULT 0,
  -- D. Shooting / Finishing (1–5)
  sk_shoot_accuracy   SMALLINT DEFAULT 0,
  sk_shot_power       SMALLINT DEFAULT 0,
  sk_weak_finish      SMALLINT DEFAULT 0,
  sk_finish_pressure  SMALLINT DEFAULT 0,
  sk_first_time       SMALLINT DEFAULT 0,
  -- E. Tactical IQ / Game Intelligence (1–5)
  sk_positioning      SMALLINT DEFAULT 0,
  sk_scanning         SMALLINT DEFAULT 0,
  sk_decision         SMALLINT DEFAULT 0,
  sk_off_ball         SMALLINT DEFAULT 0,
  sk_spatial          SMALLINT DEFAULT 0,
  sk_transition       SMALLINT DEFAULT 0,
  -- Category scores (0–100, computed)
  score_ball_control  SMALLINT DEFAULT 0,
  score_passing       SMALLINT DEFAULT 0,
  score_dribbling     SMALLINT DEFAULT 0,
  score_shooting      SMALLINT DEFAULT 0,
  score_tactical      SMALLINT DEFAULT 0,
  score_total         SMALLINT DEFAULT 0,
  notes               TEXT DEFAULT ''
);

-- Indexes (เพิ่มความเร็ว query)
CREATE INDEX IF NOT EXISTS idx_sk_player    ON skill_assessments(player_id);
CREATE INDEX IF NOT EXISTS idx_sk_ts        ON skill_assessments(assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr_player    ON test_records(player_id);
CREATE INDEX IF NOT EXISTS idx_tr_ts        ON test_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ir_player    ON ir_reports(player_id);
CREATE INDEX IF NOT EXISTS idx_ir_ts        ON ir_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ath_club     ON athletes(club_id);
CREATE INDEX IF NOT EXISTS idx_ath_name     ON athletes(name);

-- 6. Attendance (เช็คชื่อฝึกซ้อม)
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date  DATE NOT NULL,
  session_name  TEXT DEFAULT 'ซ้อม',
  session_type  TEXT DEFAULT 'training',  -- training | match | fitness | other
  player_id     TEXT NOT NULL,
  status        TEXT DEFAULT 'present',   -- present | absent | late | excuse
  notes         TEXT DEFAULT '',
  created_by    TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_date, session_name, player_id)
);
CREATE INDEX IF NOT EXISTS idx_att_date   ON attendance(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_att_player ON attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_att_sess   ON attendance(session_date, session_name);

-- Helper function สำหรับ migrate endpoint เพื่ออัพเดท role constraint
CREATE OR REPLACE FUNCTION fix_role_constraint() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin','club','club_pro'));
  RETURN 'ok';
END;
$$;

-- app_settings table สำหรับ global Club permissions
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket สำหรับรูปนักกีฬา
-- (ทำใน Supabase Dashboard > Storage > New bucket: "athlete-photos", Public: ON)
