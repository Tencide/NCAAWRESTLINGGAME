/**
 * Unified game state (NCAA + WrestlingPath combined).
 * Week-based flow: choices per week, tournaments at set weeks, offseason, recruiting.
 */

export type LeagueKey =
  | 'HS_JV'
  | 'HS_VARSITY'
  | 'HS_ELITE'
  | 'JUCO'
  | 'NAIA'
  | 'D3'
  | 'D2'
  | 'D1';

export interface UnifiedState {
  seed: string;
  rngState: string;
  name: string;
  age: number;
  year: number;
  /** Week of year 1–52. Advance per week; when week > 52, next year. */
  week: number;
  league: LeagueKey;
  collegeName: string | null;
  fromHS: boolean;
  weeksInCollege: number;
  weightClass: number;
  technique: number;
  matIQ: number;
  conditioning: number;
  strength: number;
  speed: number;
  flexibility: number;
  energy: number;
  health: number;
  stress: number;
  happiness: number;
  grades: number;
  social: number;
  money: number;
  trueSkill: number;
  overallRating: number;
  recruitingScore: number;
  potentialCeiling: number;
  yearlyGrowthCap: number;
  yearlyGrowthUsed: number;
  consecutiveRestWeeks: number;
  techniqueTranslationWeeks: number;
  stateQualified: boolean;
  ncaaQualified: boolean;
  didPartTimeThisWeek: boolean;
  broke: boolean;
  story: string;
  history: { year: number; week: number; age: number; text: string }[];
  accolades: string[];
  stats: {
    matchesWon: number;
    matchesLost: number;
    pins: number;
    techs: number;
    majors: number;
    tournamentsWon: number;
    stateAppearances: number;
    stateTitles: number;
    statePlacements: number[];
    ncaaAppearances: number;
    ncaaAllAmerican: number;
    ncaaTitles: number;
    ncaaPlacements: number[];
    seasonWins: number;
    seasonLosses: number;
    seasonPins: number;
    seasonTechs: number;
    seasonMajors: number;
    winStreak: number;
    weightMisses: number;
    fargoPlacements: number[];
    super32Placements: number[];
    wnoAppearances: number;
    wnoWins: number;
    hsRecord: Record<string, number>;
    collegeRecord: Record<string, number>;
  };
  rankingsByWeight: Record<number, { id: string; name: string; overallRating: number; trueSkill: number }[]>;
  lastWeekEconomy: { expenses: { total: number }; income: { total: number }; net: number; balance: number } | null;
  pendingRandomChoice: {
    prompt: string;
    options: { label: string; resultText: string; effect: (s: UnifiedState) => void }[];
  } | null;
  offers: unknown[];
  pendingNILDeal: unknown | null;
  /** Hours left this week (resets each week). If 0, no actions available. */
  hoursLeftThisWeek: number;
  /** Temporary multipliers for this week only; reset at start of each week. Affects training, match performance, injury risk, weight cut. */
  weekModifiers: WeekModifiers;
  /** Relationship; null = single. Kept for backward compat; also sync with relationships list. */
  relationship: {
    status: 'dating' | 'serious' | 'engaged' | 'married';
    partnerName: string;
    level: number;
    weeklyTimeRequired: number;
  } | null;
  /** All relationships: parents, siblings, coach, friends, romantic. */
  relationships: RelationshipEntry[];
  /** Offseason events already used this year (one per event per year). */
  offseasonEventsUsedThisYear: Record<string, boolean>;
  /** HS only: season schedule W39–W49 (dual/tournament/rival/none). Generated at start of year; persisted for determinism. */
  hsSchedule: HSScheduleEntry[] | null;
  /** HS only: opponent pools for schedule (state-ranked, national, unranked). Persisted. */
  opponentPools: OpponentPools | null;
  /** After "Next Week": summary for UI (match result, record, ranking, recruiting, etc.). Cleared when advancing again. */
  lastWeekSummary: WeekSummary | null;
}

/** One entry in the HS season schedule (weeks 39–49). */
export interface HSScheduleEntry {
  week: number;
  type: 'dual' | 'tournament' | 'rival' | 'none';
  /** Set when type is dual/rival: opponent id from pool. */
  opponentId?: string;
}

/** Single opponent for dual/tournament. */
export interface Opponent {
  id: string;
  name: string;
  overallRating: number;
  stateRank?: number;
  nationalRank?: number;
  style: 'grinder' | 'scrambler' | 'defensive';
  clutch: number;
}

/** Pools per weight for HS schedule (generated once per year). */
export interface OpponentPools {
  unranked: Opponent[];
  stateRanked: Opponent[];
  nationalRanked: Opponent[];
}

/** Type of relationship (for display and available actions). */
export type RelationshipKind = 'parent' | 'sibling' | 'coach' | 'friend' | 'romantic';

/** One relationship entry (parent, sibling, coach, friend, or romantic partner). */
export interface RelationshipEntry {
  id: string;
  kind: RelationshipKind;
  name: string;
  level: number;
  /** Optional: e.g. "Mom", "Head coach" for UI. */
  label?: string;
}

/** Action available for a relationship (spend time, date, get advice, etc.). */
export interface RelationshipActionItem {
  key: string;
  label: string;
  hours: number;
  money?: number;
}

/** Shown after Next Week: competition result and deltas. */
export interface WeekSummary {
  week: number;
  year: number;
  phase: string;
  eventType?: 'dual' | 'tournament' | 'district' | 'state' | 'wrap' | 'none';
  matches?: { opponentName: string; opponentOverall: number; stateRank?: number; nationalRank?: number; won: boolean; method?: string }[];
  placement?: number;
  recordChange?: { wins: number; losses: number };
  message: string[];
  energyChange?: number;
  stressChange?: number;
  recruitingChange?: number;
}

/** Optional overrides when starting a new game (custom start). */
export interface CustomStartOptions {
  age?: number;
  year?: number;
  week?: number;
  league?: LeagueKey;
  /** Stat overrides (only applied when using custom start). */
  technique?: number;
  matIQ?: number;
  conditioning?: number;
  strength?: number;
  speed?: number;
  flexibility?: number;
  energy?: number;
  health?: number;
  stress?: number;
  happiness?: number;
  grades?: number;
  social?: number;
  money?: number;
  recruitingScore?: number;
}

/** Week-level multipliers (stack from actions); reset each week. Base 1.0 = no change. */
export interface WeekModifiers {
  trainingMult: number;
  performanceMult: number;
  injuryRiskMult: number;
  weightCutSeverityMult: number;
  /** Human-readable reasons for UI (e.g. "Date night", "Rehab"). */
  reasons: string[];
}

export interface ChoiceItem {
  key: string;
  label: string;
  /** Tab/category for grouping. */
  tab?: 'training' | 'relationship' | 'life';
}

/** Preview of an action's effects (hours, money, meters, modifier deltas). */
export interface ChoicePreview {
  hours: number;
  money: number;
  energy?: number;
  health?: number;
  stress?: number;
  happiness?: number;
  /** Additive deltas applied to weekModifiers (e.g. trainingMult: 0.05). */
  modifierDeltas?: Partial<Record<keyof Omit<WeekModifiers, 'reasons'>, number>>;
  reason?: string;
}

export interface OffseasonEventItem {
  key: string;
  name: string;
  week: number;
  cost: number;
  prestige: number;
  canAfford: boolean;
}
