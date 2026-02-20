/**
 * Training → attribute gains with diminishing returns, energy/stress factors, injury risk.
 * Pure functions for testability; Wrestler applies gains.
 */

import type { AttributeKey, TimeAllocation } from './types';

const LOG_SCALE = 4;

/** Diminishing returns: gain scales with log(1 + hours) */
export function trainingGainFromHours(hours: number): number {
  if (hours <= 0) return 0;
  return Math.log(1 + hours * 0.5) * LOG_SCALE;
}

/** Energy factor: low energy reduces gain */
export function energyFactor(energy: number): number {
  return 0.4 + 0.6 * (energy / 100);
}

/** Stress factor: high stress reduces gain */
export function stressFactor(stress: number): number {
  return Math.max(0.2, 1 - stress / 100);
}

/** Map allocation to attribute gains (per week). Returns partial gains by attribute. */
export function allocationToGains(
  allocation: TimeAllocation,
  energy: number,
  stress: number
): Partial<Record<AttributeKey, number>> {
  const e = energyFactor(energy);
  const s = stressFactor(stress);
  return {
    technique: trainingGainFromHours(allocation.techniqueTraining) * e * s,
    conditioning: trainingGainFromHours(allocation.conditioning) * e * s,
    strength: trainingGainFromHours(allocation.strength) * e * s,
    matIQ: trainingGainFromHours(allocation.filmStudy) * 0.8 * e * s,
    mental: trainingGainFromHours(allocation.study) * 0.3 * e * s,
  };
}

/** Overtraining: injury risk from total intense hours */
export function injuryRiskFromAllocation(allocation: TimeAllocation): number {
  const intense =
    allocation.techniqueTraining +
    allocation.conditioning +
    allocation.strength +
    Math.min(allocation.extraPracticeBlocks, 4) * 2;
  if (intense <= 10) return 0;
  return Math.min(0.3, (intense - 10) * 0.01);
}

/** Recovery: energy/health gain and stress loss from recovery + rest-heavy week */
export function recoveryEffects(
  recoveryHours: number,
  isRestHeavy: boolean
): { energy: number; health: number; stress: number } {
  const energy = Math.min(15, recoveryHours * 1.5);
  const health = Math.min(10, recoveryHours);
  const stress = isRestHeavy ? -8 : -Math.min(5, recoveryHours * 0.5);
  return { energy, health, stress: -Math.abs(stress) };
}

export const Progression = {
  allocationToGains,
  recoveryEffects,
  energyFactor,
  stressFactor,
  trainingGainFromHours,
  injuryRiskFromAllocation,
};
