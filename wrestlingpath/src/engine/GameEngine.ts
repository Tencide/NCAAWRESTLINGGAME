/**
 * GameEngine – orchestrates week advance, allocation, matches, rankings, recruiting.
 * OOP: holds GameState + SeededRNG; methods mutate state; state is serializable for save/load.
 */

import type { GameState, TimeAllocation, WrestlerState, Opponent, MatchResult } from './types';
import { Wrestler } from './Wrestler';
import { SeededRNG } from './SeededRNG';
import { TimeBudget } from './TimeBudget';
import { MatchSimulator } from './MatchSimulator';
import { Progression } from './Progression';
import { RankingSystem } from './RankingSystem';
import { Recruiting } from './Recruiting';
import { Economy } from './Economy';
import { RelationshipManager } from './Relationship';

export class GameEngine {
  private state: GameState;
  private rng: SeededRNG;

  constructor(initialState: GameState) {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.rng = SeededRNG.deserialize(this.state.seed, this.state.rngState);
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  getRngState(): string {
    return this.rng.serialize();
  }

  /** Get available hours for current week */
  getAvailableHours(): number {
    const w = this.state.wrestler;
    const tournamentWeek = !!this.state.currentEvent?.type?.includes('tournament');
    const injuryHours = w.injuries.reduce((s, i) => s + Math.min(5, i.weeksOut * 2), 0);
    const weightCutHours = w.weight.currentWeight > w.weight.targetClass ? 3 : 0;
    return TimeBudget.availableHours({
      isHS: w.career.isHS,
      tournamentWeek,
      injuryRehabHours: injuryHours,
      weightCutLockedHours: weightCutHours,
    });
  }

  /** Validate and apply weekly allocation; apply training and recovery */
  applyWeeklyAllocation(allocation: TimeAllocation): { valid: boolean; error?: string; narrative?: string } {
    const available = this.getAvailableHours();
    const valid = TimeBudget.validate(allocation, available, this.state.wrestler.career.isHS);
    if (!valid.valid) return valid;

    const wrestler = Wrestler.fromState(this.state.wrestler);
    const gains = Progression.allocationToGains(
      allocation,
      this.state.wrestler.meters.energy,
      this.state.wrestler.meters.stress
    );
    const attrKeys = ['technique', 'conditioning', 'strength', 'matIQ', 'mental'] as const;
    const energyFactor = Progression.energyFactor(this.state.wrestler.meters.energy);
    const stressFactor = Progression.stressFactor(this.state.wrestler.meters.stress);
    for (const k of attrKeys) {
      const raw = gains[k] ?? 0;
      if (raw > 0) wrestler.applyTrainingGain(k, raw, energyFactor, stressFactor);
    }
    const recovery = Progression.recoveryEffects(allocation.recovery, allocation.recovery >= 6);
    const isRestHeavy = allocation.recovery >= 8 && allocation.techniqueTraining + allocation.conditioning + allocation.strength < 4;
    wrestler.applyRest(recovery.energy, recovery.health, Math.abs(recovery.stress), isRestHeavy);
    if (isRestHeavy) wrestler.applyRestDecay();

    wrestler.advanceWeek();
    this.state.wrestler = wrestler.serialize();
    this.state.weekIndex += 1;
    this.state.rngState = this.rng.serialize();
    this.state.wrestler.reputation.recruitingScore = Recruiting.computeScore(this.state.wrestler);
    if (this.state.relationship) {
      const { newLevel, conflict } = RelationshipManager.applyWeekly(this.state.relationship, allocation.relationshipTime);
      if (conflict) this.state.narrative = (this.state.narrative || '') + ' Your partner is upset about lack of time together.';
    }
    this.state.weeklyLog.push({
      weekIndex: this.state.weekIndex,
      summary: `Week ${this.state.weekIndex}: Training applied. Energy: ${this.state.wrestler.meters.energy.toFixed(0)}.`,
    });
    return { valid: true, narrative: 'Week complete. Training and recovery applied.' };
  }

  /** Run a single match vs opponent; update record and confidence */
  runMatch(opponent: Opponent): MatchResult {
    const result = MatchSimulator.run(
      this.state.wrestler,
      opponent,
      this.rng,
      {
        freshmanPenalty: 0, // use wrestler.getFreshmanShockPenalty() if we had Wrestler instance
      }
    );
    const wrestler = Wrestler.fromState(this.state.wrestler);
    wrestler.addMatchResult(result.won, result.method);
    if (result.won) {
      this.state.wrestler.meters.confidence = Math.min(100, this.state.wrestler.meters.confidence + 2);
    } else {
      this.state.wrestler.meters.confidence = Math.max(0, this.state.wrestler.meters.confidence - 3);
    }
    this.state.wrestler = wrestler.serialize();
    this.state.rngState = this.rng.serialize();
    return result;
  }

  /** Create initial game state for new run */
  static createInitialState(seed: string, wrestlerOverrides: Partial<WrestlerState> & { name: string }): GameState {
    const wrestler = new Wrestler(wrestlerOverrides);
    return {
      version: 1,
      seed,
      rngState: new SeededRNG(seed).serialize(),
      weekIndex: 0,
      wrestler: wrestler.serialize(),
      economy: {
        cashBalance: 500,
        weeklyExpenses: 15,
        semesterTuitionDue: 0,
        rent: 0,
        food: 0,
        books: 0,
        travel: 0,
        incomeSources: [],
        eventCostsThisWeek: 0,
      },
      relationship: null,
      rankingsByWeight: {},
      offers: [],
      opponentPool: {},
      weeklyLog: [],
      narrative: `${wrestlerOverrides.name} begins the journey.`,
      currentEvent: null,
    };
  }
}
