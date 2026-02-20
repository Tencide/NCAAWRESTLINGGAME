/**
 * Match simulation: winProb from effective skill difference + seeded variance.
 * Deterministic given same RNG state.
 */

import type { WrestlerState, Opponent, MatchResult, MatchMethod } from './types';
import type { SeededRNG } from './SeededRNG';

const SIGMOID_K = 8; // variance band; larger = more upsets
const STYLE_MATRIX: Record<string, Record<string, number>> = {
  neutral: { neutral: 0, top: -1, scrambler: 0, defensive: 1, aggressive: -1 },
  top: { neutral: 1, top: 0, scrambler: -1, defensive: 2, aggressive: 0 },
  scrambler: { neutral: 0, top: 1, scrambler: 0, defensive: 0, aggressive: 1 },
  defensive: { neutral: -1, top: -2, scrambler: 0, defensive: 0, aggressive: 2 },
  aggressive: { neutral: 1, top: 0, scrambler: -1, defensive: -2, aggressive: 0 },
};

function sigmoid(x: number, k: number = SIGMOID_K): number {
  return 1 / (1 + Math.exp(-x / k));
}

/** Effective skill for player: trueSkill + condition mods + style + penalties */
function effectiveSkill(
  w: WrestlerState,
  opp: Opponent,
  injuryPenalty: number,
  weightCutPenalty: number,
  freshmanPenalty: number
): number {
  const energyMod = (w.meters.energy / 100 - 0.5) * 5;
  const healthMod = (w.meters.health / 100 - 0.5) * 3;
  const stressMod = -(w.meters.stress / 100) * 4;
  const confidenceMod = (w.meters.confidence / 100 - 0.5) * 2;
  const styleMod = STYLE_MATRIX['neutral']?.[opp.style] ?? 0; // assume player "neutral" for now
  return (
    w.trueSkill +
    energyMod +
    healthMod +
    stressMod +
    confidenceMod -
    injuryPenalty -
    weightCutPenalty -
    freshmanPenalty +
    styleMod
  );
}

/** Opponent effective skill with consistency/clutch variance applied via RNG later */
function opponentEffective(opp: Opponent): number {
  return opp.trueSkill;
}

/** Decide method of victory/defeat (simplified) */
function decideMethod(
  won: boolean,
  skillDiff: number,
  rng: SeededRNG
): MatchMethod {
  if (!won) return 'dec';
  const roll = rng.float();
  if (roll < 0.15) return 'fall';
  if (roll < 0.35) return 'tech';
  if (roll < 0.55) return 'major';
  return 'dec';
}

export class MatchSimulator {
  /**
   * Run one match; returns result and does not mutate wrestler (caller updates record).
   */
  static run(
    player: WrestlerState,
    opponent: Opponent,
    rng: SeededRNG,
    options: {
      injuryPenalty?: number;
      weightCutPenalty?: number;
      freshmanPenalty?: number;
    } = {}
  ): MatchResult {
    const injuryPenalty = options.injuryPenalty ?? 0;
    const weightCutPenalty = options.weightCutPenalty ?? 0;
    const freshmanPenalty = options.freshmanPenalty ?? 0;

    const myEff = effectiveSkill(player, opponent, injuryPenalty, weightCutPenalty, freshmanPenalty);
    const oppEffBase = opponentEffective(opponent);
    const variance = rng.normal() * (1 - opponent.consistency) * 3;
    const oppEff = oppEffBase + variance;
    const diff = myEff - oppEff;
    const winProb = sigmoid(diff);
    const won = rng.float() < winProb;

    const method = decideMethod(won, diff, rng);
    let myScore = 0,
      oppScore = 0;
    if (won) {
      if (method === 'fall') myScore = 6;
      else if (method === 'tech') myScore = 16;
      else if (method === 'major') myScore = 12;
      else myScore = 5 + rng.int(0, 5);
      oppScore = method === 'fall' ? 0 : Math.min(myScore - (method === 'major' ? 8 : method === 'tech' ? 15 : 1), rng.int(0, 4));
    } else {
      oppScore = method === 'fall' ? 6 : 8 + rng.int(0, 6);
      myScore = method === 'fall' ? 0 : rng.int(0, Math.max(0, oppScore - 2));
    }

    const keyMoments: string[] = [];
    if (won) keyMoments.push('You controlled the pace.');
    else keyMoments.push('Opponent had the edge.');

    return {
      won,
      method,
      myScore,
      oppScore,
      keyMoments,
      opponentId: opponent.id,
      opponentName: opponent.name,
    };
  }
}
