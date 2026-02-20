/**
 * Opponent generation: names + stats by weight/division. Seeded for determinism.
 */

import type { Opponent } from '../engine/types';
import type { SeededRNG } from '../engine/SeededRNG';

const FIRST = ['Jake', 'Kyle', 'David', 'Ryan', 'Cole', 'Bryce', 'Parker', 'Chase', 'Luke', 'Mason', 'Hunter', 'Logan', 'Tyler', 'Eric', 'Jason'];
const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Martinez', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Young', 'King'];
const STYLES: Opponent['style'][] = ['neutral', 'top', 'scrambler', 'defensive', 'aggressive'];

export function generateOpponent(
  weightClass: number,
  meanTrueSkill: number,
  variance: number,
  rng: SeededRNG,
  idPrefix: string
): Opponent {
  const trueSkill = Math.max(30, Math.min(95, meanTrueSkill + (rng.float() - 0.5) * variance));
  const overallRating = Math.max(40, Math.min(99, trueSkill + rng.int(-3, 3)));
  const first = FIRST[rng.next() % FIRST.length];
  const last = LAST[rng.next() % LAST.length];
  return {
    id: idPrefix + '-' + rng.next().toString(36),
    name: first + ' ' + last,
    overallRating,
    trueSkill,
    style: STYLES[rng.next() % STYLES.length],
    consistency: 0.6 + rng.float() * 0.35,
    clutch: 0.4 + rng.float() * 0.5,
    injuryRisk: 0.1 + rng.float() * 0.2,
    weightClass,
  };
}

/** Generate a pool of opponents for a weight class (e.g. state rankings) */
export function generatePool(
  weightClass: number,
  count: number,
  meanTrueSkill: number,
  variance: number,
  rng: SeededRNG,
  idPrefix: string
): Opponent[] {
  const out: Opponent[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateOpponent(weightClass, meanTrueSkill, variance, rng, idPrefix));
  }
  out.sort((a, b) => b.overallRating - a.overallRating);
  return out;
}
