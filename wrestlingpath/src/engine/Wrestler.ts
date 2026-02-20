/**
 * Wrestler – core entity with attributes, meters, record, progression.
 * OOP: mutates internal state via methods; state is serializable.
 */

import type {
  WrestlerState,
  Attributes,
  Meters,
  WeightState,
  AttributeKey,
  RecordSnapshot,
  Injury,
  Potential,
  CareerContext,
  Reputation,
} from './types';

const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength', 'speed', 'conditioning', 'technique', 'matIQ', 'mental', 'toughness',
];

const DEFAULT_ATTRIBUTES: Attributes = {
  strength: 50,
  speed: 50,
  conditioning: 50,
  technique: 50,
  matIQ: 50,
  mental: 50,
  toughness: 50,
};

const DEFAULT_METERS: Meters = {
  energy: 100,
  health: 100,
  stress: 0,
  confidence: 50,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function defaultRecord(): RecordSnapshot {
  return { wins: 0, losses: 0, pins: 0, techs: 0, majors: 0 };
}

export class Wrestler {
  private state: WrestlerState;

  constructor(initial: Partial<WrestlerState> & { name: string }) {
    const attrs = { ...DEFAULT_ATTRIBUTES, ...initial.attributes };
    const meters = { ...DEFAULT_METERS, ...initial.meters };
    const weight: WeightState = {
      naturalWeight: initial.weight?.naturalWeight ?? 145,
      currentWeight: initial.weight?.currentWeight ?? 145,
      targetClass: initial.weight?.targetClass ?? 145,
    };
    const potential: Potential = {
      ceiling: { ...DEFAULT_ATTRIBUTES, ...initial.potential?.ceiling },
      yearlyGrowthCap: initial.potential?.yearlyGrowthCap ?? 12,
      yearlyGrowthUsed: initial.potential?.yearlyGrowthUsed ?? 0,
    };
    this.state = {
      id: initial.id ?? 'player-' + Math.random().toString(36).slice(2, 9),
      name: initial.name,
      attributes: attrs,
      meters,
      weight,
      academics: initial.academics ?? { gpa: 3.0, eligibilityStatus: 'eligible' },
      career: {
        grade: initial.career?.grade ?? 9,
        year: initial.career?.year ?? 1,
        weekInYear: initial.career?.weekInYear ?? 1,
        isHS: initial.career?.isHS ?? true,
        division: initial.career?.division ?? null,
        teamRole: initial.career?.teamRole ?? 'starter',
        schoolId: initial.career?.schoolId ?? null,
        stateId: initial.career?.stateId ?? null,
      },
      record: initial.record ?? defaultRecord(),
      seasonRecord: initial.seasonRecord ?? defaultRecord(),
      injuries: initial.injuries ?? [],
      potential,
      reputation: initial.reputation ?? {
        coachTrust: 50,
        recruitingScore: 50,
        localRank: null,
        stateRank: null,
        nationalRank: null,
        divisionRank: null,
      },
      trueSkill: initial.trueSkill ?? 50,
      overallRating: initial.overallRating ?? 50,
      consecutiveRestWeeks: initial.consecutiveRestWeeks ?? 0,
      weeksInCollege: initial.weeksInCollege ?? 0,
    };
    this.recomputeRatings();
  }

  getState(): Readonly<WrestlerState> {
    return this.state;
  }

  /** Clone state for serialization (no getters) */
  serialize(): WrestlerState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Restore from saved state */
  static fromState(state: WrestlerState): Wrestler {
    const w = new Wrestler({ name: state.name });
    w.state = JSON.parse(JSON.stringify(state));
    return w;
  }

  /** TrueSkill from attributes (weighted average + style) */
  private computeTrueSkill(): number {
    const a = this.state.attributes;
    const raw =
      a.technique * 0.2 +
      a.matIQ * 0.2 +
      a.conditioning * 0.15 +
      a.strength * 0.15 +
      a.speed * 0.1 +
      a.mental * 0.1 +
      a.toughness * 0.1;
    return clamp(Math.round(raw), 1, 99);
  }

  /** Overall rating for display (can scale by division/league later) */
  private computeOverallRating(): number {
    const ts = this.state.trueSkill;
    const meterMod = (this.state.meters.energy / 100) * 0.1 + (this.state.meters.confidence / 100) * 0.05;
    return clamp(Math.round(ts * (1 + meterMod)), 1, 99);
  }

  recomputeRatings(): void {
    this.state.trueSkill = this.computeTrueSkill();
    this.state.overallRating = this.computeOverallRating();
  }

  getAttribute(key: AttributeKey): number {
    return this.state.attributes[key];
  }

  getMeter(key: keyof Meters): number {
    return this.state.meters[key];
  }

  /** Apply training gain with diminishing returns and caps */
  applyTrainingGain(attrKey: AttributeKey, rawGain: number, energyFactor: number, stressFactor: number): number {
    const current = this.state.attributes[attrKey];
    const ceiling = this.state.potential.ceiling[attrKey];
    if (current >= ceiling) return 0;

    let gain = rawGain * energyFactor * stressFactor;
    if (current >= 92) gain *= 0.25;
    else if (current >= 85) gain *= 0.5;

    const remaining = this.state.potential.yearlyGrowthCap - this.state.potential.yearlyGrowthUsed;
    if (remaining <= 0) gain *= 0.1;
    else if (remaining <= 2) gain *= 0.3;
    else if (remaining <= 4) gain *= 0.6;

    const actual = Math.floor(gain);
    if (actual <= 0) return 0;

    const capped = Math.min(actual, ceiling - current, remaining);
    this.state.attributes[attrKey] = clamp(current + capped, 0, 100);
    this.state.potential.yearlyGrowthUsed += capped;
    this.recomputeRatings();
    return capped;
  }

  /** Apply rest: restore energy/health, lower stress; track consecutive rest for decay */
  applyRest(energyGain: number, healthGain: number, stressLoss: number, isHeavyRest: boolean): void {
    this.state.meters.energy = clamp(this.state.meters.energy + energyGain, 0, 100);
    this.state.meters.health = clamp(this.state.meters.health + healthGain, 0, 100);
    this.state.meters.stress = clamp(this.state.meters.stress - stressLoss, 0, 100);
    if (isHeavyRest) this.state.consecutiveRestWeeks += 1;
    else this.state.consecutiveRestWeeks = 0;
    this.recomputeRatings();
  }

  /** Apply decay from too much rest (ring rust) */
  applyRestDecay(): void {
    if (this.state.consecutiveRestWeeks >= 4) {
      this.state.attributes.technique = Math.max(0, this.state.attributes.technique - 1);
      this.state.consecutiveRestWeeks = 0;
    } else if (this.state.consecutiveRestWeeks >= 2) {
      this.state.attributes.conditioning = Math.max(0, this.state.attributes.conditioning - 1);
      this.state.attributes.strength = Math.max(0, this.state.attributes.strength - 1);
    }
    this.recomputeRatings();
  }

  /** Reset yearly growth at season/offseason boundary */
  resetYearlyGrowth(): void {
    this.state.potential.yearlyGrowthUsed = 0;
  }

  /** Add win/loss to record */
  addMatchResult(won: boolean, method: 'dec' | 'major' | 'tech' | 'fall'): void {
    const sr = this.state.seasonRecord;
    const cr = this.state.record;
    if (won) {
      sr.wins += 1;
      cr.wins += 1;
      if (method === 'fall') sr.pins += 1;
      if (method === 'tech') sr.techs += 1;
      if (method === 'major') sr.majors += 1;
    } else {
      sr.losses += 1;
      cr.losses += 1;
    }
  }

  /** Advance week (e.g. week in year, weeks in college) */
  advanceWeek(): void {
    this.state.career.weekInYear += 1;
    if (this.state.career.weekInYear > 52) {
      this.state.career.weekInYear = 1;
      this.state.career.year += 1;
      this.resetYearlyGrowth();
    }
    if (!this.state.career.isHS && this.state.career.schoolId) {
      this.state.weeksInCollege = Math.min(32, this.state.weeksInCollege + 1);
    }
  }

  /** College entry: compress attributes by division cap */
  applyCollegeEntryCap(division: string, collegeEntryCap: number): void {
    const a = this.state.attributes;
    const keys = ATTRIBUTE_KEYS;
    for (const k of keys) {
      const v = a[k];
      a[k] = Math.min(100, Math.min(v, collegeEntryCap) + Math.round(Math.max(0, v - collegeEntryCap) * 0.35));
    }
    this.state.weeksInCollege = 0;
    this.recomputeRatings();
  }

  /** Freshman shock: temporary performance penalty (caller uses this for match mod) */
  getFreshmanShockPenalty(): number {
    if (this.state.career.isHS || this.state.weeksInCollege >= 8) return 0;
    return Math.max(0, 8 - this.state.weeksInCollege) * 1.5; // up to ~12 point penalty
  }
}
