import { describe, it, expect } from 'vitest';
import { Recruiting } from './Recruiting';
import type { ScholarshipOffer, School } from './types';

describe('Recruiting', () => {
  it('negotiationSuccessChance increases with recruitingScore and need', () => {
    const low = Recruiting.negotiationSuccessChance(40, 2, 30000, 0.5);
    const high = Recruiting.negotiationSuccessChance(85, 5, 50000, 0.8);
    expect(high).toBeGreaterThan(low);
  });

  it('resolveCounter: deterministic given same RNG state', async () => {
    const { SeededRNG } = await import('./SeededRNG');
    const offer: ScholarshipOffer = { id: '1', schoolId: 'iowa', tuitionCoveredPct: 50, housingStipend: 0, mealPlanPct: 0, booksPct: 0, durationYears: 4, redshirtPlan: 'none', guaranteedRosterSpot: false, deadlineWeek: 100, offeredAtWeek: 50 };
    const school: School = { id: 'iowa', name: 'Iowa', division: 'D1', tuitionCost: 32000, cityCostIndex: 1.1, academicMinGPA: 2.8, scholarshipBudget: 900000, needsByWeight: { 145: 5 }, rosterDepth: {}, coachAggressiveness: 0.9, facilitiesLevel: 98, coachQuality: 95 };
    const rng1 = new SeededRNG('negot-1');
    const rng2 = new SeededRNG('negot-1');
    const res1 = Recruiting.resolveCounter(offer, school, 75, rng1);
    const res2 = Recruiting.resolveCounter(offer, school, 75, rng2);
    expect(res1.success).toBe(res2.success);
  });
});
