/**
 * Recruiting score computation and scholarship negotiation.
 * Deterministic given same state; negotiation success uses RNG.
 */

import type { WrestlerState, School, ScholarshipOffer } from './types';
import type { SeededRNG } from './SeededRNG';

export class Recruiting {
  /** Compute recruiting score from wrestler state */
  static computeScore(w: WrestlerState): number {
    let score = w.trueSkill * 0.5 + w.overallRating * 0.3;
    const gpa = w.academics.gpa;
    if (gpa >= 3.5) score += 8;
    else if (gpa >= 3.0) score += 4;
    else if (gpa < 2.5) score -= 10;
    if (w.reputation.stateRank != null && w.reputation.stateRank <= 4) score += 6;
    if (w.reputation.nationalRank != null && w.reputation.nationalRank <= 20) score += 10;
    const wins = w.record.wins;
    const losses = w.record.losses;
    if (wins + losses > 0) {
      const winPct = wins / (wins + losses);
      if (winPct >= 0.85) score += 4;
    }
    if (w.injuries.length > 0) score -= 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /** Probability that counter-offer succeeds (0–1) */
  static negotiationSuccessChance(
    recruitingScore: number,
    schoolNeed: number,
    remainingBudget: number,
    coachAggressiveness: number
  ): number {
    const scoreNorm = recruitingScore / 100;
    const needNorm = Math.min(1, schoolNeed / 5);
    const budgetNorm = Math.min(1, remainingBudget / 50000);
    const base = 0.3 + scoreNorm * 0.4 + needNorm * 0.2 + coachAggressiveness * 0.1;
    return Math.max(0.1, Math.min(0.9, base * (0.8 + budgetNorm * 0.2)));
  }

  /** Resolve counter: roll RNG, return success and updated offer if accepted */
  static resolveCounter(
    currentOffer: ScholarshipOffer,
    school: School,
    recruitingScore: number,
    rng: SeededRNG
  ): { success: boolean; newOffer?: ScholarshipOffer } {
    const need = school.needsByWeight[145] ?? 3;
    const chance = this.negotiationSuccessChance(
      recruitingScore,
      need,
      school.scholarshipBudget,
      school.coachAggressiveness
    );
    if (!rng.chance(chance)) return { success: false };
    return {
      success: true,
      newOffer: { ...currentOffer, tuitionCoveredPct: Math.min(100, currentOffer.tuitionCoveredPct + 5) },
    };
  }
}
