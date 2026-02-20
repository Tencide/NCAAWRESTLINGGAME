/**
 * WrestlingPath engine – typed interfaces for sim entities.
 * All game state is serializable for deterministic save/load.
 */

// ─── Wrestler attributes (0–100) ───────────────────────────────────────────
export type AttributeKey =
  | 'strength'
  | 'speed'
  | 'conditioning'
  | 'technique'
  | 'matIQ'
  | 'mental'
  | 'toughness';

export interface Attributes {
  strength: number;
  speed: number;
  conditioning: number;
  technique: number;
  matIQ: number;
  mental: number;
  toughness: number;
}

// ─── Meters (0–100) ─────────────────────────────────────────────────────────
export interface Meters {
  energy: number;
  health: number;
  stress: number;
  confidence: number;
}

// ─── Weight ───────────────────────────────────────────────────────────────
export interface WeightState {
  naturalWeight: number;   // lbs
  currentWeight: number;
  targetClass: number;     // weight class in lbs (106, 113, … 285)
}

// ─── Record (season + career) ───────────────────────────────────────────────
export interface RecordSnapshot {
  wins: number;
  losses: number;
  pins: number;
  techs: number;
  majors: number;
}

// ─── Injury ───────────────────────────────────────────────────────────────
export interface Injury {
  type: string;
  severity: number;   // 1–10
  weeksOut: number;
  reinjuryRisk: number; // 0–1
}

// ─── Potential / growth caps ───────────────────────────────────────────────
export interface Potential {
  /** Per-attribute ceiling (0–100) */
  ceiling: Record<AttributeKey, number>;
  /** Total attribute points gainable this year */
  yearlyGrowthCap: number;
  /** Already used this year */
  yearlyGrowthUsed: number;
}

// ─── Career context ─────────────────────────────────────────────────────────
export type Division = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO';
export type TeamRole = 'starter' | 'backup' | 'redshirt' | 'bench';

export interface CareerContext {
  grade: number;           // 9–12 HS, 13–16+ college (freshman = 13)
  year: number;            // sim year (1, 2, 3…)
  weekInYear: number;      // 1–52
  isHS: boolean;
  division: Division | null;
  teamRole: TeamRole;
  schoolId: string | null; // college school id when in college
  stateId: string | null;  // home state for HS
}

// ─── Reputation / recruiting ───────────────────────────────────────────────
export interface Reputation {
  coachTrust: number;      // 0–100
  recruitingScore: number; // computed
  localRank: number | null;
  stateRank: number | null;
  nationalRank: number | null;
  divisionRank: number | null; // college
}

// ─── Wrestler (player) ──────────────────────────────────────────────────────
export interface WrestlerState {
  id: string;
  name: string;
  attributes: Attributes;
  meters: Meters;
  weight: WeightState;
  academics: { gpa: number; eligibilityStatus: 'eligible' | 'ineligible' | 'probation' };
  career: CareerContext;
  record: RecordSnapshot;
  seasonRecord: RecordSnapshot;
  injuries: Injury[];
  potential: Potential;
  reputation: Reputation;
  /** Internal skill for sim; derived from attributes + context */
  trueSkill: number;
  /** Display rating relative to league */
  overallRating: number;
  /** Weeks of consecutive rest-heavy weeks (for decay) */
  consecutiveRestWeeks: number;
  /** College freshman: weeks in college (for "freshman shock" penalty) */
  weeksInCollege: number;
}

// ─── Opponent (generated) ──────────────────────────────────────────────────
export type StyleArchetype = 'neutral' | 'top' | 'scrambler' | 'defensive' | 'aggressive';

export interface Opponent {
  id: string;
  name: string;
  overallRating: number;
  trueSkill: number;
  style: StyleArchetype;
  consistency: number;   // 0–1
  clutch: number;        // 0–1
  injuryRisk: number;    // 0–1
  weightClass: number;
}

// ─── School ────────────────────────────────────────────────────────────────
export interface School {
  id: string;
  name: string;
  division: Division;
  tuitionCost: number;
  cityCostIndex: number;   // multiplier for rent etc.
  academicMinGPA: number;
  scholarshipBudget: number;
  needsByWeight: Record<number, number>; // weightClass -> need level 1–5
  rosterDepth: Record<number, number>;   // weightClass -> depth
  coachAggressiveness: number;  // 0–1
  facilitiesLevel: number;     // 0–100
  coachQuality: number;        // 0–100
}

// ─── Scholarship offer ────────────────────────────────────────────────────
export interface ScholarshipOffer {
  id: string;
  schoolId: string;
  tuitionCoveredPct: number;
  housingStipend: number;
  mealPlanPct: number;
  booksPct: number;
  durationYears: number;
  redshirtPlan: 'none' | 'optional' | 'recommended';
  guaranteedRosterSpot: boolean;
  deadlineWeek: number;   // sim week index
  offeredAtWeek: number;
}

// ─── Relationship ───────────────────────────────────────────────────────────
export type RelationshipStatus = 'single' | 'dating' | 'serious' | 'engaged' | 'married';
export type PartnerTrait = 'supportive' | 'drama' | 'jealousy';

export interface Relationship {
  status: RelationshipStatus;
  relationshipLevel: number;   // 0–100
  partnerName: string;
  partnerTraits: PartnerTrait[];
  weeklyTimeRequired: number; // hours
  sharedExpenses: number;     // weekly when married
}

// ─── Economy ────────────────────────────────────────────────────────────────
export interface EconomyState {
  cashBalance: number;
  weeklyExpenses: number;
  semesterTuitionDue: number;
  rent: number;
  food: number;
  books: number;
  travel: number;
  incomeSources: { type: string; amount: number; weekly: boolean }[];
  eventCostsThisWeek: number;
}

// ─── Time allocation (player choice) ───────────────────────────────────────
export interface TimeAllocation {
  techniqueTraining: number;
  conditioning: number;
  strength: number;
  filmStudy: number;
  study: number;
  recovery: number;
  social: number;
  job: number;
  extraPracticeBlocks: number;  // count of 2h blocks
  weightCut: number;
  relationshipTime: number;
}

// ─── Match result ───────────────────────────────────────────────────────────
export type MatchMethod = 'dec' | 'major' | 'tech' | 'fall';

export interface MatchResult {
  won: boolean;
  method: MatchMethod;
  myScore: number;
  oppScore: number;
  keyMoments: string[];
  opponentId: string;
  opponentName: string;
}

// ─── Ranked wrestler entry ──────────────────────────────────────────────────
export interface RankedEntry {
  id: string;
  name: string;
  overallRating: number;
  trueSkill: number;
  weightClass: number;
  wins?: number;
  losses?: number;
}

// ─── Game run state (full save) ─────────────────────────────────────────────
export interface GameState {
  version: number;
  seed: string;
  rngState: string;       // serialized RNG state for determinism
  weekIndex: number;      // global week since start (0, 1, 2…)
  wrestler: WrestlerState;
  economy: EconomyState;
  relationship: Relationship | null;
  /** Rankings by weight: state (HS), national (HS), or division (college) */
  rankingsByWeight: Record<number, RankedEntry[]>;
  /** Pending scholarship offers */
  offers: ScholarshipOffer[];
  /** Generated opponents this run (for replay) */
  opponentPool: Record<string, Opponent>;
  /** Weekly log entries for right panel */
  weeklyLog: { weekIndex: number; summary: string; details?: string }[];
  /** Current week narrative */
  narrative: string;
  /** Optional: current tournament/event in progress */
  currentEvent: { type: string; data: unknown } | null;
}
