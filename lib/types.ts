export interface User {
  username: string;
  role: 'admin' | 'club_pro' | 'club';
  displayName: string;
  clubId: string;
  logoUrl?: string;
}

export interface TestRecord {
  id?: string;
  Timestamp: string;
  PlayerID: string;
  Height: string;
  Weight: string;
  Muscle: string;
  Fat: string;
  CMJ: string;
  PeakPower: string;
  BMI: string;
  Rating: number;
  Speed30: string;
  Agility: string;
  YoYo: string;
  Situp: string;
  LongJump: string;
  Pushup: string;
  SitAndReach: string;
  AgiL: string;
  AgiR: string;
  YoYoLevel: string;
  YoYoShuttle: string;
  VO2Max: string;
}

export interface Athlete {
  PlayerID: string;
  Name: string;
  Nickname: string;
  DOB: string;
  Team: string;
  Squad?: string;
  DomHand: string;
  DomFoot: string;
  Position: string;
  Club: string;
  Province: string;
  ClubID: string;
  PhotoUrl: string;
  History: TestRecord[];
  Latest: Partial<TestRecord>;
}

export interface IRReport {
  id: string;
  Timestamp: string;
  PlayerID: string;
  Coach: string;
  Period: string;
  Season: string;
  B_OnTime: number;
  B_Effort: number;
  B_Teamwork: number;
  B_Respect: number;
  B_Attendance: number;
  B_Participation: number;
  B_Improvement: number;
  L_Sleep: number;
  L_Hydration: number;
  L_Diet: number;
  L_ScreenTime: number;
  T_Motricity: number;
  T_Technical: number;
  T_Tactic: number;
  T_OffFundam: number;
  T_DefFundam: number;
  T_Fitness: number;
  Med_Period1: string;
  Med_Injury1: string;
  Med_Absence1: string;
  Med_Period2: string;
  Med_Injury2: string;
  Med_Absence2: string;
  GoodLevel: string;
  ToImprove: string;
  Comments: string;
  BehaviourComment: string;
  LifestyleComment: string;
  TechnicalComment: string;
  IdpGoalShort: string;
  IdpGoalLong: string;
  IdpAction: string;
  IdpDream: string;
  BehaviourScore: number;
  LifestyleScore: number;
  TechnicalScore: number;
  OverallIRScore: number;
}

export interface UserRecord {
  Username: string;
  Password: string;
  Role: string;
  DisplayName: string;
  CreatedAt: string;
  ClubID: string;
  LogoUrl: string;
}

export type Page = 'home' | 'dashboard' | 'roster' | 'scout' | 'ir' | 'skill' | 'attendance' | 'training' | 'performance' | 'register' | 'adminUsers' | 'teamreport' | 'compare' | 'quicktest' | 'migrate' | 'lineup' | 'wellness' | 'tester' | 'help' | 'leaderboard' | 'batchadd' | 'matchlog' | 'calendar' | 'goals' | 'monitor' | 'nutrition' | 'nutritionPlanner';

export interface WellnessRecord {
  id: string;
  playerId: string;
  checkDate: string;
  fatigue: number;      // 1-5 (5=best)
  sleepQuality: number; // 1-5
  soreness: number;     // 1-5
  stress: number;       // 1-5 (5=best/lowest stress)
  mood: number;         // 1-5
  wellnessScore: number; // avg 0-100
  notes: string;
  createdBy: string;
}

export interface RPERecord {
  id: string;
  playerId: string;
  sessionDate: string;
  sessionName: string;
  sessionType: string;
  rpe: number;          // 1-10
  durationMin: number;  // minutes
  trainingLoad: number; // rpe × durationMin
  notes: string;
  createdBy: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excuse';
export type SessionType = 'training' | 'match' | 'fitness' | 'other';

export interface AttendanceRecord {
  id: string;
  sessionDate: string;
  sessionName: string;
  sessionType: SessionType;
  playerId: string;
  status: AttendanceStatus;
  notes: string;
  createdBy: string;
}

export interface AttendanceSession {
  date: string;
  name: string;
  type: SessionType;
  records: AttendanceRecord[];
}

export interface SkillAssessment {
  id: string;
  playerId: string;
  assessedAt: string;
  assessedBy: string;
  season: string;
  // Ball Control
  skFirstTouch: number; skBallControl: number; skReceiving: number;
  skWeakFoot: number;   skPressureCtrl: number;
  // Passing
  skPassAccuracy: number; skShortPass: number; skLongPass: number;
  skThroughPass: number;  skOneTouch: number;  skPassPressure: number;
  // Dribbling
  skDribbleSpeed: number; skDirectionChange: number; skBeatOpp: number;
  skTightSpace: number;   skSkillExec: number;
  // Shooting
  skShootAccuracy: number; skShotPower: number; skWeakFinish: number;
  skFinishPressure: number; skFirstTime: number;
  // Tactical IQ
  skPositioning: number; skScanning: number;  skDecision: number;
  skOffBall: number;     skSpatial: number;   skTransition: number;
  // Scores
  scoreBallControl: number; scorePassing: number; scoreDribbling: number;
  scoreShooting: number;    scoreTactical: number; scoreTotal: number;
  notes: string;
}
