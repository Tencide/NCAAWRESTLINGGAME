/**
 * Unified game engine: week-by-week choices + tournaments + offseason + recruiting.
 * Uses SeededRNG for deterministic save/load.
 */

import { SeededRNG } from '../SeededRNG';
import type { UnifiedState, LeagueKey, ChoiceItem, OffseasonEventItem, CustomStartOptions, WeekModifiers, ChoicePreview, HSScheduleEntry, Opponent, OpponentPools, WeekSummary, RelationshipEntry, RelationshipActionItem } from './types';

const WEIGHT_CLASSES = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285];
const HS_LEAGUES: LeagueKey[] = ['HS_JV', 'HS_VARSITY', 'HS_ELITE'];
const LEAGUES: Record<LeagueKey, { meanTrueSkill: number; ratingBase: number; ratingScale: number }> = {
  HS_JV: { meanTrueSkill: 42, ratingBase: 52, ratingScale: 0.81 },
  HS_VARSITY: { meanTrueSkill: 50, ratingBase: 55, ratingScale: 0.88 },
  HS_ELITE: { meanTrueSkill: 58, ratingBase: 58, ratingScale: 0.98 },
  JUCO: { meanTrueSkill: 55, ratingBase: 56, ratingScale: 0.38 },
  NAIA: { meanTrueSkill: 60, ratingBase: 58, ratingScale: 0.36 },
  D3: { meanTrueSkill: 62, ratingBase: 58, ratingScale: 0.35 },
  D2: { meanTrueSkill: 66, ratingBase: 60, ratingScale: 0.33 },
  D1: { meanTrueSkill: 74, ratingBase: 62, ratingScale: 0.3 },
};
/** HS year calendar (52 weeks): Offseason 9–20, Summer 21–30, Preseason 31–38, Regular 39–49, Postseason 50–52 */
const HS_OFFSEASON_START = 9;
const HS_OFFSEASON_END = 20;
const HS_SUMMER_START = 21;
const HS_SUMMER_END = 30;
const HS_PRESEASON_START = 31;
const HS_PRESEASON_END = 38;
const HS_REGULAR_START = 39;
const HS_REGULAR_END = 49;
const HS_WEEK_DISTRICT = 50;
const HS_WEEK_STATE = 51;
const HS_WEEK_WRAP = 52;
const FARGO_WEEKS = [27, 28];
const SUPER32_WEEK = 36;
const WNO_WEEK = 37;
const WNO_RECRUITING_MIN = 68;
const WEEK_CONFERENCE_COLLEGE = 8;
const WEEK_NCAA = 12;
const DISTRICTS_QUALIFY_TOP = 4;
const CONFERENCE_QUALIFY_TOP = 3;
const OFFSEASON_EVENTS: Record<string, { name: string; week: number; cost: number; prestige: number; recScoreMin: number; inviteOnly: boolean }> = {
  fargo: { name: 'Fargo', week: 27, cost: 450, prestige: 1.4, recScoreMin: 0, inviteOnly: false },
  super32: { name: 'Super 32', week: SUPER32_WEEK, cost: 320, prestige: 1.25, recScoreMin: 0, inviteOnly: false },
  wno: { name: "Who's Number One", week: WNO_WEEK, cost: 280, prestige: 1.5, recScoreMin: WNO_RECRUITING_MIN, inviteOnly: true },
};
const HOURS_PER_WEEK = 40;
const BASE_HOURS_AUTO = 0;

function defaultWeekModifiers(): WeekModifiers {
  return {
    trainingMult: 1,
    performanceMult: 1,
    injuryRiskMult: 1,
    weightCutSeverityMult: 1,
    reasons: [],
  };
}

const PARENT_NAMES = ['Mom', 'Dad', 'Mike', 'Sarah', 'James', 'Lisa', 'David', 'Jennifer'];
const SIBLING_FIRST = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];
const COACH_NAMES = ['Coach Williams', 'Coach Martinez', 'Coach Brown', 'Coach Davis'];
const FRIEND_FIRST = ['Jake', 'Kyle', 'Marcus', 'Devin', 'Chris', 'Nick', 'Tyler', 'Cole'];

function generateInitialRelationships(rng: SeededRNG, _playerName: string): RelationshipEntry[] {
  const list: RelationshipEntry[] = [];
  const id = () => 'rel_' + rng.int(1, 1e9) + '_' + rng.int(1, 1e9);
  const parent1 = PARENT_NAMES[rng.next() % PARENT_NAMES.length];
  let parent2 = PARENT_NAMES[rng.next() % PARENT_NAMES.length];
  while (parent2 === parent1) parent2 = PARENT_NAMES[rng.next() % PARENT_NAMES.length];
  list.push({ id: id(), kind: 'parent', name: parent1, level: 70 + rng.int(0, 25), label: 'Parent' });
  list.push({ id: id(), kind: 'parent', name: parent2, level: 65 + rng.int(0, 30), label: 'Parent' });
  const numSiblings = rng.int(0, 2);
  for (let i = 0; i < numSiblings; i++) {
    list.push({ id: id(), kind: 'sibling', name: SIBLING_FIRST[rng.next() % SIBLING_FIRST.length], level: 40 + rng.int(0, 40), label: 'Sibling' });
  }
  list.push({ id: id(), kind: 'coach', name: COACH_NAMES[rng.next() % COACH_NAMES.length], level: 50 + rng.int(0, 30), label: 'Coach' });
  const numFriends = 2 + rng.int(0, 2);
  for (let i = 0; i < numFriends; i++) {
    list.push({ id: id(), kind: 'friend', name: FRIEND_FIRST[rng.next() % FRIEND_FIRST.length], level: 35 + rng.int(0, 45), label: 'Friend' });
  }
  return list;
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaultStats(): UnifiedState['stats'] {
  return {
    matchesWon: 0,
    matchesLost: 0,
    pins: 0,
    techs: 0,
    majors: 0,
    tournamentsWon: 0,
    stateAppearances: 0,
    stateTitles: 0,
    statePlacements: [],
    ncaaAppearances: 0,
    ncaaAllAmerican: 0,
    ncaaTitles: 0,
    ncaaPlacements: [],
    seasonWins: 0,
    seasonLosses: 0,
    seasonPins: 0,
    seasonTechs: 0,
    seasonMajors: 0,
    winStreak: 0,
    weightMisses: 0,
    fargoPlacements: [],
    super32Placements: [],
    wnoAppearances: 0,
    wnoWins: 0,
    hsRecord: { matchesWon: 0, matchesLost: 0, pins: 0, techs: 0, majors: 0, stateAppearances: 0, stateTitles: 0 },
    collegeRecord: { matchesWon: 0, matchesLost: 0, pins: 0, techs: 0, majors: 0, ncaaAppearances: 0, ncaaAllAmerican: 0, ncaaTitles: 0 },
  };
}

function computeTrueSkill(s: UnifiedState): number {
  const w = (s.technique ?? 50) * 0.28 + (s.matIQ ?? 50) * 0.24 + (s.conditioning ?? 50) * 0.22 +
    (s.strength ?? 50) * 0.12 + (s.speed ?? 50) * 0.08 + (s.flexibility ?? 50) * 0.06;
  return w;
}

function overallFromTrueSkill(ts: number, league: LeagueKey): number {
  const ctx = LEAGUES[league];
  if (!ctx) return clamp(40, 99, Math.round(50 + (ts - 50) * 0.4));
  const raw = ctx.ratingBase + (ts - ctx.meanTrueSkill) * ctx.ratingScale;
  return Math.round(clamp(40, 99, raw));
}

function updateRating(s: UnifiedState): void {
  s.trueSkill = computeTrueSkill(s);
  s.overallRating = overallFromTrueSkill(s.trueSkill, s.league);
}

function addStory(s: UnifiedState, text: string): void {
  s.history.push({ year: s.year, week: s.week, age: s.age, text });
  s.story = text;
}

function isInCollege(s: UnifiedState): boolean {
  return HS_LEAGUES.indexOf(s.league) === -1;
}

function getEffectiveModifiers(s: UnifiedState): WeekModifiers {
  const w = s.weekModifiers ?? defaultWeekModifiers();
  return {
    trainingMult: clamp(0.1, 2, w.trainingMult),
    performanceMult: clamp(0.1, 2, w.performanceMult),
    injuryRiskMult: clamp(0, 3, w.injuryRiskMult),
    weightCutSeverityMult: clamp(0, 3, w.weightCutSeverityMult),
    reasons: w.reasons ?? [],
  };
}

function getHSPhase(week: number): string {
  if (week >= HS_OFFSEASON_START && week <= HS_OFFSEASON_END) return 'Offseason (Spring)';
  if (week >= HS_SUMMER_START && week <= HS_SUMMER_END) return 'Summer';
  if (week >= HS_PRESEASON_START && week <= HS_PRESEASON_END) return 'Preseason (Fall)';
  if (week >= HS_REGULAR_START && week <= HS_REGULAR_END) return 'Regular Season';
  if (week === HS_WEEK_DISTRICT) return 'District/Sectional';
  if (week === HS_WEEK_STATE) return 'State Tournament';
  if (week === HS_WEEK_WRAP) return 'Season Wrap';
  if (week >= 1 && week < HS_OFFSEASON_START) return 'Early Offseason';
  return 'Offseason';
}

function isHSRegularSeason(week: number): boolean {
  return week >= HS_REGULAR_START && week <= HS_REGULAR_END;
}

export class UnifiedEngine {
  private state: UnifiedState;
  private rng: SeededRNG;

  constructor(initial: UnifiedState) {
    this.state = JSON.parse(JSON.stringify(initial));
    const old = this.state as unknown as { month?: number; hoursLeftThisMonth?: number; monthsInCollege?: number; didPartTimeThisMonth?: boolean; lastMonthEconomy?: unknown };
    if (this.state.week == null) this.state.week = old.month ?? 1;
    if (this.state.hoursLeftThisWeek == null) this.state.hoursLeftThisWeek = old.hoursLeftThisMonth ?? HOURS_PER_WEEK;
    if (this.state.weeksInCollege == null) this.state.weeksInCollege = old.monthsInCollege != null ? old.monthsInCollege * 4 : 0;
    if (this.state.didPartTimeThisWeek == null) this.state.didPartTimeThisWeek = old.didPartTimeThisMonth ?? false;
    if (this.state.lastWeekEconomy == null) this.state.lastWeekEconomy = null;
    if (this.state.relationship == null) this.state.relationship = null;
    if (this.state.weekModifiers == null) this.state.weekModifiers = defaultWeekModifiers();
    if (this.state.relationships == null) this.state.relationships = [];
    if (this.state.offseasonEventsUsedThisYear == null) this.state.offseasonEventsUsedThisYear = {};
    if (this.state.hsSchedule == null) this.state.hsSchedule = null;
    if (this.state.opponentPools == null) this.state.opponentPools = null;
    if (this.state.lastWeekSummary == null) this.state.lastWeekSummary = null;
    this.rng = SeededRNG.deserialize(this.state.seed, this.state.rngState);
  }

  getState(): Readonly<UnifiedState> {
    return this.state;
  }

  getRngState(): string {
    return this.rng.serialize();
  }

  private saveRng(): void {
    this.state.rngState = this.rng.serialize();
  }

  /** Create initial state for new game. Pass customStart to override age, year, week, league. */
  static createState(seed: string, options: { name: string; weightClass?: number; stateId?: string; customStart?: CustomStartOptions }): UnifiedState {
    const s = options as { name: string; weightClass: number; customStart?: CustomStartOptions };
    const custom = s.customStart;
    const weightClass = WEIGHT_CLASSES.includes(s.weightClass) ? s.weightClass : 145;
    const rng = new SeededRNG(seed);
    const attrs = {
      technique: 35 + rng.int(0, 20),
      matIQ: 32 + rng.int(0, 20),
      conditioning: 38 + rng.int(0, 20),
      strength: 30 + rng.int(0, 20),
      speed: 32 + rng.int(0, 20),
      flexibility: 35 + rng.int(0, 20),
    };
    const league = custom?.league && HS_LEAGUES.includes(custom.league) ? custom.league : (custom?.league && LEAGUES[custom.league as LeagueKey] ? custom.league as LeagueKey : 'HS_JV');
    const trueSkill = (attrs.technique * 0.28 + attrs.matIQ * 0.24 + attrs.conditioning * 0.22 + attrs.strength * 0.12 + attrs.speed * 0.08 + attrs.flexibility * 0.06);
    const age = custom?.age != null ? clamp(14, 24, custom.age) : 14;
    const year = custom?.year != null ? Math.max(1, custom.year) : 1;
    const week = custom?.week != null ? clamp(1, 52, custom.week) : 1;
    const inCollege = HS_LEAGUES.indexOf(league) === -1;
    const state: UnifiedState = {
      seed,
      rngState: rng.serialize(),
      name: options.name || 'Wrestler',
      age,
      year,
      week,
      league,
      collegeName: inCollege ? 'College' : null,
      fromHS: HS_LEAGUES.includes(league),
      weeksInCollege: 0,
      weightClass,
      ...attrs,
      energy: 100,
      health: 100,
      stress: 0,
      happiness: 75,
      grades: 75,
      social: 50,
      money: 200,
      trueSkill,
      overallRating: overallFromTrueSkill(trueSkill, league),
      recruitingScore: 50,
      potentialCeiling: 95,
      yearlyGrowthCap: 14,
      yearlyGrowthUsed: 0,
      consecutiveRestWeeks: 0,
      techniqueTranslationWeeks: 0,
      stateQualified: false,
      ncaaQualified: false,
      didPartTimeThisWeek: false,
      broke: false,
      story: custom ? `Week ${week}, Year ${year}. ${options.name || 'Wrestler'} continues.` : options.name + ' starts high school. Make your first choice.',
      history: [],
      accolades: [],
      stats: defaultStats(),
      rankingsByWeight: {},
      lastWeekEconomy: null,
      pendingRandomChoice: null,
      offers: [],
      pendingNILDeal: null,
      hoursLeftThisWeek: HOURS_PER_WEEK,
      weekModifiers: defaultWeekModifiers(),
      relationship: null,
      relationships: generateInitialRelationships(rng, options.name || 'Wrestler'),
      offseasonEventsUsedThisYear: {},
      hsSchedule: null,
      opponentPools: null,
      lastWeekSummary: null,
    };
    if (custom) {
      if (custom.technique != null) state.technique = clamp(0, 100, custom.technique);
      if (custom.matIQ != null) state.matIQ = clamp(0, 100, custom.matIQ);
      if (custom.conditioning != null) state.conditioning = clamp(0, 100, custom.conditioning);
      if (custom.strength != null) state.strength = clamp(0, 100, custom.strength);
      if (custom.speed != null) state.speed = clamp(0, 100, custom.speed);
      if (custom.flexibility != null) state.flexibility = clamp(0, 100, custom.flexibility);
      if (custom.energy != null) state.energy = clamp(0, 100, custom.energy);
      if (custom.health != null) state.health = clamp(0, 100, custom.health);
      if (custom.stress != null) state.stress = clamp(0, 100, custom.stress);
      if (custom.happiness != null) state.happiness = clamp(0, 100, custom.happiness);
      if (custom.grades != null) state.grades = clamp(0, 100, custom.grades);
      if (custom.social != null) state.social = clamp(0, 100, custom.social);
      if (custom.money != null) state.money = Math.max(0, custom.money);
      if (custom.recruitingScore != null) state.recruitingScore = clamp(0, 100, custom.recruitingScore);
      updateRating(state);
    }
    return state;
  }

  /** Hours cost per choice (deducted from hoursLeftThisWeek). */
  private static readonly HOURS_COST: Record<string, number> = {
    train_technique: 10,
    train_conditioning: 10,
    train_strength: 8,
    study_film: 4,
    compete: 12,
    rest: 4,
    study: 6,
    hang_out: 4,
    part_time_job: 12,
    relationship_time: 6,
    date: 6,
    party: 5,
    argument: 2,
    interview: 3,
    rehab: 6,
  };

  private static readonly MONEY_COST: Record<string, number> = {
    date: 30,
    party: 20,
    interview: 0,
    rehab: 0,
    argument: 0,
  };

  /** Modifier deltas and reason per action (stack onto weekModifiers). */
  private static readonly MODIFIER_DELTAS: Record<string, { trainingMult?: number; performanceMult?: number; injuryRiskMult?: number; weightCutSeverityMult?: number; reason: string }> = {
    relationship_time: { performanceMult: 0.05, reason: 'Time with partner' },
    date: { performanceMult: 0.08, reason: 'Date night' },
    argument: { performanceMult: -0.1, reason: 'Argument' },
    party: { trainingMult: -0.1, performanceMult: -0.05, reason: 'Party' },
    interview: { performanceMult: 0.05, reason: 'Interview' },
    rehab: { injuryRiskMult: -0.2, trainingMult: -0.05, reason: 'Rehab' },
    rest: { injuryRiskMult: -0.15, reason: 'Rest' },
  };

  private applyWeekModifierDeltas(
    deltas: { trainingMult?: number; performanceMult?: number; injuryRiskMult?: number; weightCutSeverityMult?: number },
    reason: string,
  ): void {
    const s = this.state;
    const w = s.weekModifiers ?? defaultWeekModifiers();
    if (deltas.trainingMult != null) w.trainingMult += deltas.trainingMult;
    if (deltas.performanceMult != null) w.performanceMult += deltas.performanceMult;
    if (deltas.injuryRiskMult != null) w.injuryRiskMult += deltas.injuryRiskMult;
    if (deltas.weightCutSeverityMult != null) w.weightCutSeverityMult += deltas.weightCutSeverityMult;
    if (reason && !w.reasons.includes(reason)) w.reasons.push(reason);
  }

  getChoicePreview(choiceKey: string): ChoicePreview | null {
    const hours = UnifiedEngine.HOURS_COST[choiceKey] ?? 6;
    const money = UnifiedEngine.MONEY_COST[choiceKey] ?? 0;
    const md = UnifiedEngine.MODIFIER_DELTAS[choiceKey];
    const modifierDeltas = md ? {
      trainingMult: md.trainingMult,
      performanceMult: md.performanceMult,
      injuryRiskMult: md.injuryRiskMult,
      weightCutSeverityMult: md.weightCutSeverityMult,
    } : undefined;
    const reason = md?.reason;
    const base: ChoicePreview = { hours, money, reason, modifierDeltas };
    switch (choiceKey) {
      case 'train_technique':
      case 'train_conditioning':
      case 'train_strength':
        return { ...base, energy: -20 };
      case 'study_film':
        return { ...base, energy: 5 };
      case 'compete':
        return { ...base, energy: -14 };
      case 'rest':
        return { ...base, health: 3, happiness: 2, energy: 28, stress: -2 };
      case 'study':
        return { ...base, energy: 8 };
      case 'hang_out':
        return { ...base, energy: 10 };
      case 'part_time_job':
        return { ...base };
      case 'relationship_time':
        return { ...base };
      case 'date':
        return { ...base, happiness: 8 };
      case 'party':
        return { ...base, happiness: 5, energy: -5 };
      case 'argument':
        return { ...base, stress: 5, happiness: -5 };
      case 'interview':
        return { ...base, happiness: 3 };
      case 'rehab':
        return { ...base, health: 5 };
      default:
        return base;
    }
  }

  getChoices(): ChoiceItem[] {
    const s = this.state;
    const hoursLeft = s.hoursLeftThisWeek ?? HOURS_PER_WEEK;
    const money = s.money ?? 0;
    if (hoursLeft <= 0) return [];
    const list: ChoiceItem[] = [
      { key: 'train_technique', label: 'Train technique', tab: 'training' },
      { key: 'train_conditioning', label: 'Train conditioning', tab: 'training' },
      { key: 'train_strength', label: 'Lift weights', tab: 'training' },
      { key: 'study_film', label: 'Study film', tab: 'training' },
      ...(isInCollege(s) ? [{ key: 'compete', label: 'Compete / scrimmage', tab: 'training' as const }] : []),
      { key: 'rest', label: 'Rest and recover', tab: 'training' },
      { key: 'study', label: 'Study', tab: 'life' },
      { key: 'hang_out', label: 'Hang out', tab: 'life' },
      { key: 'party', label: 'Party', tab: 'life' },
      { key: 'interview', label: 'Media interview', tab: 'life' },
      { key: 'rehab', label: 'Rehab / recovery', tab: 'life' },
    ];
    if (isInCollege(s)) list.push({ key: 'part_time_job', label: 'Part-time job', tab: 'life' });
    if (s.relationship) {
      list.push({ key: 'relationship_time', label: 'Spend time with ' + s.relationship.partnerName, tab: 'relationship' });
      list.push({ key: 'date', label: 'Date night', tab: 'relationship' });
      list.push({ key: 'argument', label: 'Argument (stress)', tab: 'relationship' });
    }
    return list.filter((c) => {
      const h = UnifiedEngine.HOURS_COST[c.key] ?? 6;
      const m = UnifiedEngine.MONEY_COST[c.key] ?? 0;
      return h <= hoursLeft && m <= money;
    });
  }

  applyChoice(choiceKey: string): void {
    const s = this.state;
    const hoursCost = UnifiedEngine.HOURS_COST[choiceKey] ?? 6;
    const moneyCost = UnifiedEngine.MONEY_COST[choiceKey] ?? 0;
    s.hoursLeftThisWeek = Math.max(0, (s.hoursLeftThisWeek ?? HOURS_PER_WEEK) - hoursCost);
    if (moneyCost > 0) s.money = Math.max(0, (s.money ?? 0) - moneyCost);
    const mod = UnifiedEngine.MODIFIER_DELTAS[choiceKey];
    if (mod) {
      this.applyWeekModifierDeltas(
        {
          trainingMult: mod.trainingMult,
          performanceMult: mod.performanceMult,
          injuryRiskMult: mod.injuryRiskMult,
          weightCutSeverityMult: mod.weightCutSeverityMult,
        },
        mod.reason,
      );
    }
    const energyCost = 20;
    const eff = getEffectiveModifiers(s);
    const canTrainHard = (s.energy ?? 100) >= 25;
    const mult = () => {
      const cap = s.yearlyGrowthCap ?? 14;
      const used = s.yearlyGrowthUsed ?? 0;
      if (used >= cap) return 0;
      const ef = 0.4 + 0.6 * ((s.energy ?? 100) / 100);
      const rem = cap - used;
      const cf = rem <= 2 ? 0.2 : rem <= 4 ? 0.6 : 1;
      return Math.min(1, ef * cf);
    };
    const addGrowth = (attr: keyof UnifiedState, raw: number) => {
      const cur = (s[attr] as number) ?? 50;
      const ceiling = s.potentialCeiling ?? 99;
      const diminished = raw > 0 ? (cur >= 92 ? raw * 0.25 : cur >= 85 ? raw * 0.5 : raw) : 0;
      const actual = Math.floor(diminished * mult() * eff.trainingMult);
      const capped = Math.min(ceiling - cur, actual, (s.yearlyGrowthCap ?? 14) - (s.yearlyGrowthUsed ?? 0));
      if (capped > 0) {
        (s as unknown as Record<string, number>)[attr] = cur + capped;
        s.yearlyGrowthUsed = (s.yearlyGrowthUsed ?? 0) + capped;
      }
    };

    switch (choiceKey) {
      case 'train_technique':
        s.consecutiveRestWeeks = 0;
        s.energy = Math.max(0, (s.energy ?? 100) - energyCost);
        addGrowth('technique', canTrainHard ? this.rng.int(1, 3) : this.rng.int(0, 1));
        if (s.techniqueTranslationWeeks) s.techniqueTranslationWeeks--;
        addStory(s, canTrainHard ? 'You drilled hard. Technique improved.' : 'You were tired; light technique work.');
        break;
      case 'train_conditioning':
        s.consecutiveRestWeeks = 0;
        s.energy = Math.max(0, (s.energy ?? 100) - energyCost);
        addGrowth('conditioning', canTrainHard ? this.rng.int(1, 3) : this.rng.int(0, 1));
        addStory(s, 'You pushed your cardio. Gas tank improved.');
        break;
      case 'train_strength':
        s.consecutiveRestWeeks = 0;
        s.energy = Math.max(0, (s.energy ?? 100) - energyCost);
        addGrowth('strength', canTrainHard ? this.rng.int(0, 2) : this.rng.int(0, 1));
        addStory(s, 'You hit the weight room. Stronger.');
        break;
      case 'study_film':
        s.consecutiveRestWeeks = 0;
        addGrowth('matIQ', this.rng.int(0, 2));
        s.energy = Math.min(100, (s.energy ?? 100) + 5);
        addStory(s, 'Film study paid off. Mat IQ up.');
        break;
      case 'compete':
        s.energy = Math.max(0, (s.energy ?? 100) - 14);
        const matches = this.rng.int(2, 5);
        let w = 0, l = 0;
        for (let i = 0; i < matches; i++) {
          let winChance = clamp(0.02, 0.98, 0.45 + (s.overallRating ?? 50) / 120);
          winChance = clamp(0.02, 0.98, winChance * eff.performanceMult);
          if (this.rng.float() < winChance) { s.stats.matchesWon++; s.stats.seasonWins++; w++; }
          else { s.stats.matchesLost++; s.stats.seasonLosses++; l++; }
        }
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(2, 6));
        s.stats.hsRecord.matchesWon += w;
        s.stats.hsRecord.matchesLost += l;
        addStory(s, `You competed. Went ${w}-${l} this week.`);
        break;
      case 'rest':
        s.consecutiveRestWeeks = (s.consecutiveRestWeeks ?? 0) + 1;
        s.health = Math.min(100, (s.health ?? 100) + this.rng.int(2, 5));
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(1, 4));
        s.energy = Math.min(100, (s.energy ?? 100) + 28);
        s.stress = Math.max(0, (s.stress ?? 0) - this.rng.int(1, 3));
        if (s.consecutiveRestWeeks >= 2) s.conditioning = Math.max(0, (s.conditioning ?? 50) - 1);
        addStory(s, 'You rested. Body and mind feel better.');
        break;
      case 'study':
        s.grades = Math.min(100, (s.grades ?? 75) + this.rng.int(1, 4));
        s.energy = Math.min(100, (s.energy ?? 100) + 8);
        addStory(s, 'You hit the books. Grades improved.');
        break;
      case 'hang_out':
        s.social = Math.min(100, (s.social ?? 50) + this.rng.int(2, 5));
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(1, 4));
        s.energy = Math.min(100, (s.energy ?? 100) + 10);
        addStory(s, 'You hung out. Social and mood improved.');
        break;
      case 'part_time_job':
        s.didPartTimeThisWeek = true;
        s.money = (s.money ?? 0) + this.rng.int(200, 450);
        s.health = Math.max(0, (s.health ?? 100) - this.rng.int(0, 2));
        addStory(s, 'You worked a shift. Earned some cash.');
        break;
      case 'relationship_time':
        if (s.relationship) {
          s.relationship.level = Math.min(100, (s.relationship.level ?? 50) + this.rng.int(2, 5));
          addStory(s, 'You spent time with ' + s.relationship.partnerName + '. Relationship stronger.');
        }
        break;
      case 'date':
        if (s.relationship) {
          s.relationship.level = Math.min(100, (s.relationship.level ?? 50) + this.rng.int(3, 6));
          s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(5, 12));
          addStory(s, 'Date night with ' + s.relationship.partnerName + '. Great week for performance.');
        }
        break;
      case 'party':
        s.social = Math.min(100, (s.social ?? 50) + this.rng.int(3, 6));
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(2, 6));
        s.energy = Math.max(0, (s.energy ?? 100) - 5);
        addStory(s, 'You went to a party. Social up but training takes a hit this week.');
        break;
      case 'argument':
        s.stress = Math.min(100, (s.stress ?? 0) + this.rng.int(4, 8));
        s.happiness = Math.max(0, (s.happiness ?? 75) - this.rng.int(3, 7));
        if (s.relationship) s.relationship.level = Math.max(0, (s.relationship.level ?? 50) - this.rng.int(2, 4));
        addStory(s, 'Argument with ' + (s.relationship?.partnerName ?? 'someone') + '. Performance may suffer.');
        break;
      case 'interview':
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(2, 5));
        addStory(s, 'Media interview went well. Slight confidence boost.');
        break;
      case 'rehab':
        s.health = Math.min(100, (s.health ?? 100) + this.rng.int(4, 8));
        addStory(s, 'Rehab session. Injury risk down, body recovering.');
        break;
      default:
        addStory(s, 'Week ' + s.week + ', Year ' + s.year + '.');
    }
    updateRating(s);
    this.computeRecruitingScore();
    this.saveRng();
  }

  private computeRecruitingScore(): void {
    const s = this.state;
    let score = s.trueSkill ?? 50;
    if ((s.grades ?? 75) >= 3.5) score += 8;
    else if ((s.grades ?? 75) < 2.5) score -= 10;
    (s.stats.statePlacements ?? []).forEach((p) => { if (p === 1) score += 4; else if (p <= 4) score += 1.5; });
    (s.stats.fargoPlacements ?? []).forEach((p) => { if (p <= 2) score += 3; else if (p <= 4) score += 2; });
    s.recruitingScore = Math.round(clamp(0, 100, score));
  }

  private generateOpponentPools(weightClass: number): OpponentPools {
    const first = ['Jake', 'Kyle', 'David', 'Ryan', 'Cole', 'Blake', 'Mason', 'Hunter', 'Chase', 'Tyler'];
    const last = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson'];
    const styles: Opponent['style'][] = ['grinder', 'scrambler', 'defensive'];
    const unranked: Opponent[] = [];
    for (let i = 0; i < 30; i++) {
      unranked.push({
        id: `unr_${weightClass}_${this.rng.next()}`,
        name: first[this.rng.next() % first.length] + ' ' + last[this.rng.next() % last.length],
        overallRating: clamp(40, 88, 50 + (this.rng.float() - 0.5) * 50),
        style: styles[this.rng.next() % 3],
        clutch: this.rng.int(20, 80),
      });
    }
    const stateRanked: Opponent[] = [];
    for (let r = 1; r <= 20; r++) {
      stateRanked.push({
        id: `state_${weightClass}_${r}`,
        name: first[this.rng.next() % first.length] + ' ' + last[this.rng.next() % last.length],
        overallRating: clamp(55, 95, 60 + (this.rng.float() - 0.5) * 30),
        stateRank: r,
        style: styles[this.rng.next() % 3],
        clutch: this.rng.int(30, 90),
      });
    }
    stateRanked.sort((a, b) => b.overallRating - a.overallRating);
    const nationalRanked: Opponent[] = [];
    for (let r = 1; r <= 20; r++) {
      nationalRanked.push({
        id: `nat_${weightClass}_${r}`,
        name: first[this.rng.next() % first.length] + ' ' + last[this.rng.next() % last.length],
        overallRating: clamp(65, 99, 70 + (this.rng.float() - 0.5) * 25),
        nationalRank: r,
        stateRank: this.rng.int(1, 10),
        style: styles[this.rng.next() % 3],
        clutch: this.rng.int(40, 95),
      });
    }
    nationalRanked.sort((a, b) => b.overallRating - a.overallRating);
    return { unranked, stateRanked, nationalRanked };
  }

  private generateHSSchedule(): HSScheduleEntry[] {
    const wc = this.state.weightClass ?? 145;
    if (!this.state.opponentPools) this.state.opponentPools = this.generateOpponentPools(wc);
    const pools = this.state.opponentPools;
    const template: { week: number; type: HSScheduleEntry['type'] }[] = [
      { week: 39, type: 'dual' }, { week: 40, type: 'dual' }, { week: 41, type: 'tournament' },
      { week: 42, type: 'dual' }, { week: 43, type: 'rival' }, { week: 44, type: 'tournament' },
      { week: 45, type: 'dual' }, { week: 46, type: 'dual' }, { week: 47, type: 'tournament' },
      { week: 48, type: 'dual' }, { week: 49, type: 'dual' },
    ];
    const stateWeeks = [39, 42, 45];
    const nationalWeek = (this.state.recruitingScore ?? 50) >= 55 || (this.state.stats?.fargoPlacements?.length ?? 0) > 0 ? 43 : null;
    const entries: HSScheduleEntry[] = template.map((t) => {
      let opponentId: string | undefined;
      if (t.type === 'dual' || t.type === 'rival') {
        if (nationalWeek === t.week && pools.nationalRanked.length > 0)
          opponentId = pools.nationalRanked[this.rng.next() % pools.nationalRanked.length].id;
        else if (stateWeeks.includes(t.week) && pools.stateRanked.length > 0)
          opponentId = pools.stateRanked[this.rng.next() % pools.stateRanked.length].id;
        else if (pools.unranked.length > 0)
          opponentId = pools.unranked[this.rng.next() % pools.unranked.length].id;
      }
      return { week: t.week, type: t.type, opponentId };
    });
    return entries;
  }

  private findOpponent(id: string): Opponent | null {
    const p = this.state.opponentPools;
    if (!p) return null;
    const all = [...p.unranked, ...p.stateRanked, ...p.nationalRanked];
    return all.find((o) => o.id === id) ?? null;
  }

  private simOneMatch(opponent: Opponent, isRival: boolean): { won: boolean; method: string } {
    const s = this.state;
    const eff = getEffectiveModifiers(s);
    let winChance = 0.45 + (s.overallRating ?? 50) / 120 - opponent.overallRating / 120;
    winChance *= eff.performanceMult;
    if (isRival) winChance += (this.rng.float() - 0.5) * 0.2;
    winChance = clamp(0.05, 0.95, winChance);
    const won = this.rng.float() < winChance;
    const method = won ? (this.rng.float() < 0.3 ? 'Fall' : this.rng.float() < 0.5 ? 'Tech' : 'Dec') : 'Dec';
    return { won, method };
  }

  private runHSWeekCompetition(): WeekSummary | null {
    const s = this.state;
    if (!HS_LEAGUES.includes(s.league) || s.week < HS_REGULAR_START || s.week > HS_REGULAR_END) return null;
    if (!s.hsSchedule || s.hsSchedule.length === 0) return null;
    const entry = s.hsSchedule.find((e) => e.week === s.week);
    if (!entry || entry.type === 'none') return null;
    const summary: WeekSummary = { week: s.week, year: s.year, phase: getHSPhase(s.week), message: [] };
    const recBefore = s.recruitingScore ?? 50;

    if (entry.type === 'dual' || entry.type === 'rival') {
      if (s.league === 'HS_JV') {
        summary.eventType = 'dual';
        summary.message.push('JV week: practice only (no varsity match).');
        s.lastWeekSummary = summary;
        return summary;
      }
      const opp = entry.opponentId ? this.findOpponent(entry.opponentId) : null;
      const opponent = opp ?? (s.opponentPools?.unranked[this.rng.next() % (s.opponentPools?.unranked?.length ?? 1)] ?? null);
      if (!opponent) {
        summary.message.push('No opponent scheduled.');
        s.lastWeekSummary = summary;
        return summary;
      }
      const { won, method } = this.simOneMatch(opponent, entry.type === 'rival');
      if (won) {
        s.stats.matchesWon++; s.stats.seasonWins++; s.stats.hsRecord.matchesWon++;
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(2, 6));
      } else {
        s.stats.matchesLost++; s.stats.seasonLosses++; s.stats.hsRecord.matchesLost++;
      }
      summary.eventType = 'dual';
      summary.matches = [{ opponentName: opponent.name, opponentOverall: opponent.overallRating, stateRank: opponent.stateRank, nationalRank: opponent.nationalRank, won, method }];
      summary.recordChange = { wins: won ? 1 : 0, losses: won ? 0 : 1 };
      summary.message.push(`${won ? 'W' : 'L'} vs ${opponent.name} (${opponent.overallRating})${opponent.stateRank ? ` #${opponent.stateRank} state` : ''}${opponent.nationalRank ? ` #${opponent.nationalRank} national` : ''} — ${method}.`);
    } else if (entry.type === 'tournament') {
      const numMatches = this.rng.int(3, 6);
      const matches: WeekSummary['matches'] = [];
      let wins = 0, losses = 0;
      for (let i = 0; i < numMatches; i++) {
        const pool = s.opponentPools;
        const oppList = [...(pool?.unranked ?? []), ...(pool?.stateRanked ?? [])];
        const opp = oppList[this.rng.next() % Math.max(1, oppList.length)];
        const { won, method } = this.simOneMatch(opp, false);
        if (won) { wins++; s.stats.matchesWon++; s.stats.seasonWins++; s.stats.hsRecord.matchesWon++; }
        else { losses++; s.stats.matchesLost++; s.stats.seasonLosses++; s.stats.hsRecord.matchesLost++; }
        matches.push({ opponentName: opp.name, opponentOverall: opp.overallRating, stateRank: opp.stateRank, nationalRank: opp.nationalRank, won, method });
      }
      const place = losses === 0 ? 1 : losses === 1 ? 2 : losses <= 2 ? 3 : 4;
      summary.eventType = 'tournament';
      summary.matches = matches;
      summary.placement = place;
      summary.recordChange = { wins, losses };
      summary.message.push(`Tournament: ${wins}-${losses}, placed ${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : '4th'}.`);
    }

    this.computeRecruitingScore();
    summary.recruitingChange = (s.recruitingScore ?? 50) - recBefore;
    s.lastWeekSummary = summary;
    return summary;
  }

  advanceWeek(): boolean {
    const s = this.state;
    s.lastWeekSummary = null;
    s.weekModifiers = defaultWeekModifiers();
    s.week++;
    const availableAfterBase = HOURS_PER_WEEK - BASE_HOURS_AUTO;
    s.hoursLeftThisWeek = availableAfterBase;
    s.energy = Math.min(100, (s.energy ?? 100) + 6);
    if (s.fromHS && s.weeksInCollege < 52 * 4) s.weeksInCollege++;
    if (s.relationship) {
      s.relationship.level = Math.max(0, (s.relationship.level ?? 50) - 2);
      if (s.relationship.level < 20 && this.rng.float() < 0.15) {
        addStory(s, 'You and ' + s.relationship.partnerName + ' grew apart. Single again.');
        s.relationship = null;
        s.relationships = (s.relationships ?? []).filter((r) => r.kind !== 'romantic');
      }
    } else if (s.age >= 15 && (s.social ?? 50) >= 50 && this.rng.float() < 0.12) {
      const names = ['Jordan', 'Sam', 'Alex', 'Morgan', 'Riley'];
      s.relationship = {
        status: 'dating',
        partnerName: names[this.rng.next() % names.length],
        level: 30,
        weeklyTimeRequired: 4,
      };
      addStory(s, 'You started dating ' + s.relationship.partnerName + '!');
    }
    const didPartTime = s.didPartTimeThisWeek;
    s.didPartTimeThisWeek = false;
    const income = isInCollege(s) ? 0 : 20;
    const partIncome = didPartTime ? this.rng.int(200, 450) : 0;
    const expenses = isInCollege(s) ? Math.round((450 + 280 + 80 + 2200 + 120) / 4) : (this.rng.float() < 0.5 ? 10 : 0);
    s.money = Math.max(0, (s.money ?? 0) + income + partIncome - expenses);
    s.lastWeekEconomy = { expenses: { total: expenses }, income: { total: income + partIncome }, net: income + partIncome - expenses, balance: s.money };

    if (s.week > 52) {
      s.week = 1;
      s.age++;
      s.year++;
      s.yearlyGrowthUsed = 0;
      s.consecutiveRestWeeks = 0;
      s.offseasonEventsUsedThisYear = {};
      s.stats.seasonWins = 0;
      s.stats.seasonLosses = 0;
      s.stats.seasonPins = 0;
      s.stats.seasonTechs = 0;
      s.stats.seasonMajors = 0;
      if (HS_LEAGUES.includes(s.league)) {
        s.hsSchedule = this.generateHSSchedule();
        s.opponentPools = this.state.opponentPools;
      }
      const rating = s.overallRating ?? 50;
      const goodEnoughForVarsity = rating >= 68;
      const goodEnoughForElite = rating >= 75;
      if (s.league === 'HS_JV' && (s.age >= 15 || goodEnoughForVarsity)) {
        s.league = 'HS_VARSITY';
        addStory(s, goodEnoughForVarsity && s.age < 15 ? 'Your level earned you a varsity spot. Tougher competition.' : 'You made varsity. Tougher competition.');
      } else if (s.league === 'HS_VARSITY' && (s.age >= 17 || goodEnoughForElite)) {
        s.league = 'HS_ELITE';
        addStory(s, goodEnoughForElite && s.age < 17 ? "You're good enough for Elite. College scouts are watching." : "You're now HS Elite. College scouts are watching.");
      } else {
        s.story = 'Week ' + s.week + ', Year ' + s.year + '.';
      }
    } else {
      if (HS_LEAGUES.includes(s.league) && isHSRegularSeason(s.week)) {
        if (!s.hsSchedule || s.hsSchedule.length === 0) {
          s.hsSchedule = this.generateHSSchedule();
          s.opponentPools = this.state.opponentPools;
        }
        this.runHSWeekCompetition();
      }
      const ran = this.runPostWeekTournaments();
      if (!ran) {
        if (!s.lastWeekSummary) s.story = 'Week ' + s.week + ', Year ' + s.year + '.';
      }
    }
    updateRating(s);
    this.computeRecruitingScore();
    this.saveRng();
    return s.week === 1;
  }

  private runPostWeekTournaments(): boolean {
    const s = this.state;
    if (s.week === HS_WEEK_DISTRICT && HS_LEAGUES.includes(s.league)) {
      if (s.league === 'HS_JV') {
        addStory(s, "JV doesn't compete at districts. Focus on next year.");
        return true;
      }
      const place = clamp(1, 8, Math.round(1 + (1 - (s.overallRating ?? 50) / 100) * 6 + (this.rng.float() - 0.5) * 2));
      s.stateQualified = place <= DISTRICTS_QUALIFY_TOP;
      s.lastWeekSummary = { week: s.week, year: s.year, phase: 'District/Sectional', eventType: 'district', message: [s.stateQualified ? `Districts: You placed ${place} and qualified for state!` : `Districts: You placed ${place}. Top ${DISTRICTS_QUALIFY_TOP} qualify. Season over.`] };
      addStory(s, s.stateQualified ? `Districts: You placed ${place} and qualified for state!` : `Districts: You placed ${place}. Top ${DISTRICTS_QUALIFY_TOP} qualify. Season over.`);
      return true;
    }
    if (s.week === HS_WEEK_STATE && HS_LEAGUES.includes(s.league) && s.stateQualified) {
      s.stats.stateAppearances++;
      s.stats.hsRecord.stateAppearances++;
      const place = clamp(1, 8, Math.round(1 + (1 - (s.overallRating ?? 50) / 100) * 6.5 + (this.rng.float() - 0.5) * 2));
      s.stats.statePlacements.push(place);
      if (place === 1) {
        s.stats.stateTitles++;
        s.stats.hsRecord.stateTitles++;
        s.accolades.push('State Champion (Year ' + s.year + ')');
        addStory(s, 'STATE TOURNAMENT: You won the state title!');
      } else addStory(s, `State tournament: You placed ${place}.`);
      s.stateQualified = false;
      s.lastWeekSummary = { week: s.week, year: s.year, phase: 'State Tournament', eventType: 'state', placement: place, message: [place === 1 ? 'STATE CHAMPION!' : `State: placed ${place}.`] };
      return true;
    }
    if (s.week === HS_WEEK_WRAP && HS_LEAGUES.includes(s.league)) {
      s.lastWeekSummary = { week: s.week, year: s.year, phase: 'Season Wrap', eventType: 'wrap', message: [`Season complete. Record: ${s.stats.seasonWins}-${s.stats.seasonLosses}. Recruiting: ${s.recruitingScore}.`] };
      s.story = 'Week ' + s.week + ', Year ' + s.year + '. Season wrap.';
      return true;
    }
    if (s.week === WEEK_CONFERENCE_COLLEGE && isInCollege(s)) {
      const place = clamp(1, 8, Math.round(1 + (1 - (s.overallRating ?? 50) / 100) * 6 + (this.rng.float() - 0.5) * 2));
      s.ncaaQualified = place <= CONFERENCE_QUALIFY_TOP;
      addStory(s, s.ncaaQualified ? `Conference: You placed ${place} and qualified for NCAAs!` : `Conference: You placed ${place}. Top ${CONFERENCE_QUALIFY_TOP} advance.`);
      return true;
    }
    if (s.week === WEEK_NCAA && isInCollege(s) && s.ncaaQualified) {
      s.stats.ncaaAppearances++;
      s.stats.collegeRecord.ncaaAppearances++;
      const place = clamp(1, 8, Math.round(1 + (1 - (s.overallRating ?? 50) / 100) * 5 + (this.rng.float() - 0.5) * 2));
      s.stats.ncaaPlacements.push(place);
      if (place === 1) {
        s.stats.ncaaTitles++;
        s.stats.collegeRecord.ncaaTitles++;
        s.accolades.push('NCAA Champion (Year ' + s.year + ')');
        addStory(s, 'NCAA CHAMPIONSHIPS: You won the national title!');
      } else if (place <= 8) {
        s.stats.ncaaAllAmerican++;
        s.stats.collegeRecord.ncaaAllAmerican++;
        addStory(s, `NCAA Championships: You placed ${place}. All-American!`);
      } else addStory(s, 'NCAA Championships: You went 0-2. Experience for next year.');
      s.ncaaQualified = false;
      return true;
    }
    return false;
  }

  getOffseasonEvents(): OffseasonEventItem[] {
    const s = this.state;
    if (HS_LEAGUES.indexOf(s.league) === -1) return [];
    const used = s.offseasonEventsUsedThisYear ?? {};
    const list: OffseasonEventItem[] = [];
    for (const [key, ev] of Object.entries(OFFSEASON_EVENTS)) {
      if (used[key]) continue;
      const weekMatch = key === 'fargo' ? FARGO_WEEKS.includes(s.week) : s.week === ev.week;
      if (!weekMatch) continue;
      if (ev.inviteOnly && (s.recruitingScore ?? 50) < ev.recScoreMin) continue;
      list.push({ ...ev, key, canAfford: (s.money ?? 0) >= ev.cost });
    }
    return list;
  }

  runOffseasonEvent(eventKey: string): { success: boolean; place?: number; eventName?: string; message?: string; matches?: { won: boolean; method: string }[] } {
    const s = this.state;
    const ev = OFFSEASON_EVENTS[eventKey];
    const weekOk = eventKey === 'fargo' ? FARGO_WEEKS.includes(s.week) : s.week === ev.week;
    if (!ev || !weekOk || HS_LEAGUES.indexOf(s.league) === -1)
      return { success: false, message: 'Not available.' };
    if ((s.money ?? 0) < ev.cost) return { success: false, message: "You can't afford it." };
    if ((s.offseasonEventsUsedThisYear ?? {})[eventKey]) return { success: false, message: 'Already competed here this year.' };
    s.offseasonEventsUsedThisYear = s.offseasonEventsUsedThisYear ?? {};
    s.offseasonEventsUsedThisYear[eventKey] = true;
    s.money = Math.max(0, (s.money ?? 0) - ev.cost);

    const numMatches = eventKey === 'fargo' ? 5 : 4;
    const eff = getEffectiveModifiers(s);
    const myRating = s.overallRating ?? 50;
    const matches: { won: boolean; method: string }[] = [];
    let wins = 0;

    for (let i = 0; i < numMatches; i++) {
      const oppStrength = 50 + (ev.prestige - 1) * 15 + (this.rng.float() - 0.5) * 20 + (i * 4);
      const oppRating = clamp(45, 95, Math.round(oppStrength));
      let winChance = 0.45 + myRating / 120 - oppRating / 120;
      winChance *= eff.performanceMult;
      winChance = clamp(0.08, 0.92, winChance);
      const won = this.rng.float() < winChance;
      const method = won ? (this.rng.float() < 0.25 ? 'Fall' : this.rng.float() < 0.5 ? 'Tech' : 'Dec') : 'Dec';
      matches.push({ won, method });
      if (won) {
        wins++;
        s.stats.matchesWon++;
        s.stats.seasonWins++;
      } else {
        s.stats.matchesLost++;
        s.stats.seasonLosses++;
      }
    }

    const placeFromWins = (w: number): number => {
      if (w >= numMatches) return 1;
      if (w >= numMatches - 1) return 1 + this.rng.int(0, 2);
      if (w >= numMatches - 2) return 3 + this.rng.int(0, 2);
      if (w >= 1) return 5 + this.rng.int(0, 2);
      return 7 + this.rng.int(0, 1);
    };
    const place = clamp(1, 8, placeFromWins(wins));
    s.stats.hsRecord.matchesWon += wins;
    s.stats.hsRecord.matchesLost += numMatches - wins;
    const matchStr = matches.map((m) => (m.won ? 'W' : 'L') + ' (' + m.method + ')').join(', ');
    addStory(s, `${ev.name}: You went ${wins}-${numMatches - wins}. ${matchStr}. Placed ${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : place + 'th'}.`);

    if (eventKey === 'fargo') {
      s.stats.fargoPlacements.push(place);
      if (place <= 2) s.accolades.push('Fargo ' + (place === 1 ? 'Champ' : 'Runner-up') + ' (Year ' + s.year + ')');
    } else if (eventKey === 'super32') {
      s.stats.super32Placements.push(place);
      if (place <= 2) s.accolades.push('Super 32 ' + (place === 1 ? 'Champ' : 'Runner-up') + ' (Year ' + s.year + ')');
    } else if (eventKey === 'wno') {
      s.stats.wnoAppearances++;
      if (place === 1) {
        s.stats.wnoWins++;
        s.accolades.push('WNO Champion (Year ' + s.year + ')');
        s.overallRating = Math.min(99, (s.overallRating ?? 50) + 5);
      }
    }
    this.computeRecruitingScore();
    this.saveRng();
    return { success: true, place, eventName: ev.name, matches };
  }

  getRelationships(): RelationshipEntry[] {
    const s = this.state;
    const list = [...(s.relationships ?? [])];
    if (s.relationship && !list.some((r) => r.kind === 'romantic')) {
      list.push({
        id: 'romantic_sync',
        kind: 'romantic',
        name: s.relationship.partnerName,
        level: s.relationship.level,
        label: 'Partner',
      });
    }
    return list;
  }

  getRelationshipActions(relId: string): RelationshipActionItem[] {
    const s = this.state;
    const rel = this.getRelationships().find((r) => r.id === relId);
    if (!rel) return [];
    const hoursLeft = s.hoursLeftThisWeek ?? HOURS_PER_WEEK;
    const money = s.money ?? 0;
    const actions: RelationshipActionItem[] = [];
    switch (rel.kind) {
      case 'parent':
        if (hoursLeft >= 4) actions.push({ key: 'rel_spend_time', label: 'Spend time', hours: 4 });
        if (hoursLeft >= 2) actions.push({ key: 'rel_ask_advice', label: 'Ask for advice', hours: 2 });
        break;
      case 'sibling':
        if (hoursLeft >= 4) actions.push({ key: 'rel_spend_time', label: 'Spend time', hours: 4 });
        if (hoursLeft >= 3) actions.push({ key: 'rel_hang_out', label: 'Hang out', hours: 3 });
        break;
      case 'coach':
        if (hoursLeft >= 6) actions.push({ key: 'rel_spend_time', label: 'Spend time', hours: 6 });
        if (hoursLeft >= 4) actions.push({ key: 'rel_get_advice', label: 'Get coaching advice', hours: 4 });
        break;
      case 'friend':
        if (hoursLeft >= 4) actions.push({ key: 'rel_spend_time', label: 'Spend time', hours: 4 });
        if (hoursLeft >= 3) actions.push({ key: 'rel_hang_out', label: 'Hang out', hours: 3 });
        break;
      case 'romantic':
        if (hoursLeft >= 6) actions.push({ key: 'rel_spend_time', label: 'Spend time together', hours: 6 });
        if (hoursLeft >= 6 && money >= 30) actions.push({ key: 'rel_date', label: 'Date night', hours: 6, money: 30 });
        if (hoursLeft >= 2) actions.push({ key: 'rel_argument', label: 'Argument (stress)', hours: 2 });
        break;
    }
    return actions;
  }

  applyRelationshipAction(relId: string, actionKey: string): void {
    const s = this.state;
    const rel = this.getRelationships().find((r) => r.id === relId);
    if (!rel) return;
    const actions = this.getRelationshipActions(relId);
    const act = actions.find((a) => a.key === actionKey);
    if (!act || (s.hoursLeftThisWeek ?? 0) < act.hours || ((act.money ?? 0) > 0 && (s.money ?? 0) < (act.money ?? 0))) return;
    s.hoursLeftThisWeek = Math.max(0, (s.hoursLeftThisWeek ?? HOURS_PER_WEEK) - act.hours);
    if (act.money != null && act.money > 0) s.money = Math.max(0, (s.money ?? 0) - act.money);
    const delta = this.rng.int(2, 5);
    const negDelta = this.rng.int(2, 4);
    const syncRelLevel = (newLevel: number) => {
      if (rel.kind === 'romantic' && s.relationship) s.relationship.level = newLevel;
      const stateRel = s.relationships?.find((r) => r.id === relId);
      if (stateRel) stateRel.level = newLevel;
    };
    switch (actionKey) {
      case 'rel_spend_time':
        syncRelLevel(Math.min(100, rel.level + delta));
        if (rel.kind === 'romantic' && s.relationship) this.applyWeekModifierDeltas({ performanceMult: 0.05 }, 'Time with partner');
        addStory(s, `You spent time with ${rel.name}. Relationship stronger.`);
        break;
      case 'rel_ask_advice':
        syncRelLevel(Math.min(100, rel.level + 1));
        s.stress = Math.max(0, (s.stress ?? 0) - this.rng.int(1, 3));
        addStory(s, `You asked ${rel.name} for advice. Felt supported.`);
        break;
      case 'rel_hang_out':
        syncRelLevel(Math.min(100, rel.level + delta));
        s.social = Math.min(100, (s.social ?? 50) + this.rng.int(1, 3));
        s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(1, 4));
        addStory(s, `You hung out with ${rel.name}.`);
        break;
      case 'rel_get_advice':
        syncRelLevel(Math.min(100, rel.level + 2));
        const matGain = this.rng.int(0, 1);
        if (matGain) s.matIQ = Math.min(100, (s.matIQ ?? 50) + 1);
        addStory(s, `Coach ${rel.name} gave you some pointers.${matGain ? ' Mat IQ up.' : ''}`);
        break;
      case 'rel_date':
        if (rel.kind === 'romantic' && s.relationship) {
          const newLevel = Math.min(100, s.relationship.level + this.rng.int(3, 6));
          s.relationship.level = newLevel;
          syncRelLevel(newLevel);
          s.happiness = Math.min(100, (s.happiness ?? 75) + this.rng.int(5, 12));
          this.applyWeekModifierDeltas({ performanceMult: 0.08 }, 'Date night');
        }
        addStory(s, `Date night with ${rel.name}. Great for performance.`);
        break;
      case 'rel_argument':
        if (rel.kind === 'romantic' && s.relationship) {
          const newLevel = Math.max(0, s.relationship.level - negDelta);
          s.relationship.level = newLevel;
          syncRelLevel(newLevel);
          this.applyWeekModifierDeltas({ performanceMult: -0.1 }, 'Argument');
        }
        s.stress = Math.min(100, (s.stress ?? 0) + this.rng.int(4, 8));
        s.happiness = Math.max(0, (s.happiness ?? 75) - this.rng.int(3, 7));
        addStory(s, `Argument with ${rel.name}. Performance may suffer.`);
        break;
      default:
        break;
    }
    updateRating(s);
    this.saveRng();
  }

  getRankingsBoard(): Record<number, Array<{ rank: number; name: string; overall: number }> & { playerRank?: number; playerRating?: number }> {
    const s = this.state;
    type Row = { rank: number; name: string; overall: number };
    type BoardRow = Row[] & { playerRank?: number; playerRating?: number };
    const board: Record<number, BoardRow> = {} as Record<number, BoardRow>;
    const wc = s.weightClass ?? 145;
    const firstNames = ['Jake', 'Kyle', 'David', 'Ryan', 'Cole', 'Blake', 'Mason', 'Hunter'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson'];
    for (const w of WEIGHT_CLASSES) {
      if (!s.rankingsByWeight[w] || s.rankingsByWeight[w].length === 0) {
        s.rankingsByWeight[w] = [];
        for (let i = 0; i < 15; i++) {
          const ts = 58 + (this.rng.float() - 0.5) * 28;
          const overall = clamp(62, 99, Math.round(72 + (this.rng.float() - 0.5) * 22));
          s.rankingsByWeight[w].push({
            id: `ai_${w}_${this.rng.next()}`,
            name: firstNames[this.rng.next() % firstNames.length] + ' ' + lastNames[this.rng.next() % lastNames.length],
            overallRating: overall,
            trueSkill: ts,
          });
        }
        s.rankingsByWeight[w].sort((a, b) => b.overallRating - a.overallRating);
      }
      const list = s.rankingsByWeight[w];
      if (w === wc) {
        const myRating = s.overallRating ?? 50;
        const playerEntry = { id: 'player', name: s.name, overallRating: myRating, trueSkill: s.trueSkill ?? 50 };
        const combined = [...list, playerEntry].sort((a, b) => b.overallRating - a.overallRating);
        const rows: Row[] = combined.slice(0, 10).map((e, i) => ({ rank: i + 1, name: e.name, overall: e.overallRating }));
        const entry = rows as BoardRow;
        const playerIndex = combined.findIndex((e) => e.id === 'player');
        entry.playerRank = playerIndex >= 0 ? playerIndex + 1 : list.length + 1;
        entry.playerRating = myRating;
        board[w] = entry;
      } else {
        const rows: Row[] = list.slice(0, 10).map((e, i) => ({ rank: i + 1, name: e.name, overall: e.overallRating }));
        board[w] = rows as BoardRow;
      }
    }
    return board;
  }

  getWeekLabel(): string {
    return 'Week ' + (this.state.week ?? 1);
  }

  getWeekModifiers(): WeekModifiers {
    return getEffectiveModifiers(this.state);
  }

  getHSPhaseForWeek(week: number): string {
    return getHSPhase(week);
  }

  getHSScheduleEntry(week: number): HSScheduleEntry | undefined {
    return this.state.hsSchedule?.find((e) => e.week === week);
  }

  static getWeightClasses(): number[] {
    return [...WEIGHT_CLASSES];
  }
}
