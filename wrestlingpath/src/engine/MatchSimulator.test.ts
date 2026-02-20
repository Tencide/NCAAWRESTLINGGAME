import { describe, it, expect } from 'vitest';
import { MatchSimulator } from './MatchSimulator';
import { SeededRNG } from './SeededRNG';
import type { WrestlerState, Opponent } from './types';

function makePlayer(overall: number, trueSkill: number): WrestlerState {
  return {
    id: 'p',
    name: 'Player',
    attributes: { strength: 50, speed: 50, conditioning: 50, technique: 50, matIQ: 50, mental: 50, toughness: 50 },
    meters: { energy: 90, health: 95, stress: 10, confidence: 60 },
    weight: { naturalWeight: 145, currentWeight: 145, targetClass: 145 },
    academics: { gpa: 3, eligibilityStatus: 'eligible' },
    career: { grade: 10, year: 1, weekInYear: 1, isHS: true, division: null, teamRole: 'starter', schoolId: null, stateId: 'IA' },
    record: { wins: 0, losses: 0, pins: 0, techs: 0, majors: 0 },
    seasonRecord: { wins: 0, losses: 0, pins: 0, techs: 0, majors: 0 },
    injuries: [],
    potential: { ceiling: { strength: 90, speed: 90, conditioning: 90, technique: 90, matIQ: 90, mental: 90, toughness: 90 }, yearlyGrowthCap: 12, yearlyGrowthUsed: 0 },
    reputation: { coachTrust: 50, recruitingScore: 50, localRank: null, stateRank: null, nationalRank: null, divisionRank: null },
    trueSkill,
    overallRating: overall,
    consecutiveRestWeeks: 0,
    weeksInCollege: 0,
  };
}

function makeOpponent(rating: number): Opponent {
  return {
    id: 'o1',
    name: 'Opponent',
    overallRating: rating,
    trueSkill: rating,
    style: 'neutral',
    consistency: 0.8,
    clutch: 0.5,
    injuryRisk: 0.1,
    weightClass: 145,
  };
}

describe('MatchSimulator', () => {
  it('same seed + same matchup => same result (determinism)', () => {
    const player = makePlayer(70, 70);
    const opp = makeOpponent(60);
    const rng1 = new SeededRNG('match-test');
    const rng2 = new SeededRNG('match-test');
    const res1 = MatchSimulator.run(player, opp, rng1);
    const res2 = MatchSimulator.run(player, opp, rng2);
    expect(res1.won).toBe(res2.won);
    expect(res1.method).toBe(res2.method);
  });

  it('strong favorite wins more often over many runs', () => {
    const player = makePlayer(85, 85);
    const opp = makeOpponent(55);
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG('variance-' + i);
      const res = MatchSimulator.run(player, opp, rng);
      if (res.won) wins++;
    }
    expect(wins).toBeGreaterThan(80);
  });

  it('underdog can win (variance band)', () => {
    const player = makePlayer(52, 52);
    const opp = makeOpponent(58);
    let upset = false;
    for (let i = 0; i < 200; i++) {
      const rng = new SeededRNG('upset-' + i);
      const res = MatchSimulator.run(player, opp, rng);
      if (res.won) upset = true;
    }
    expect(upset).toBe(true);
  });
});
