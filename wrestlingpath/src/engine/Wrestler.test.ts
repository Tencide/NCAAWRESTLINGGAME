import { describe, it, expect } from 'vitest';
import { Wrestler } from './Wrestler';

describe('Wrestler', () => {
  it('recordkeeping: wins and losses increment correctly', () => {
    const w = new Wrestler({ name: 'Test' });
    w.addMatchResult(true, 'dec');
    w.addMatchResult(false, 'dec');
    w.addMatchResult(true, 'fall');
    const state = w.getState();
    expect(state.record.wins).toBe(2);
    expect(state.record.losses).toBe(1);
    expect(state.seasonRecord.wins).toBe(2);
    expect(state.seasonRecord.losses).toBe(1);
    expect(state.seasonRecord.pins).toBe(1);
  });

  it('yearly growth cap: gains reduce when cap reached', () => {
    const w = new Wrestler({
      name: 'Test',
      potential: { ceiling: { strength: 100, speed: 100, conditioning: 100, technique: 100, matIQ: 100, mental: 100, toughness: 100 }, yearlyGrowthCap: 5, yearlyGrowthUsed: 0 },
    });
    const before = w.getState().attributes.strength;
    w.applyTrainingGain('strength', 10, 1, 1);
    w.applyTrainingGain('strength', 10, 1, 1);
    w.applyTrainingGain('strength', 10, 1, 1);
    w.applyTrainingGain('strength', 10, 1, 1);
    w.applyTrainingGain('strength', 10, 1, 1);
    w.applyTrainingGain('strength', 10, 1, 1);
    const after = w.getState().attributes.strength;
    expect(after - before).toBeLessThanOrEqual(6);
    expect(w.getState().potential.yearlyGrowthUsed).toBeLessThanOrEqual(5);
  });

  it('resetYearlyGrowth zeros yearlyGrowthUsed', () => {
    const w = new Wrestler({ name: 'Test' });
    w.applyTrainingGain('strength', 5, 1, 1);
    expect(w.getState().potential.yearlyGrowthUsed).toBeGreaterThan(0);
    w.resetYearlyGrowth();
    expect(w.getState().potential.yearlyGrowthUsed).toBe(0);
  });

  it('repeated rest causes decay after 2+ and 4+ weeks', () => {
    const w = new Wrestler({ name: 'Test' });
    const initialCond = w.getState().attributes.conditioning;
    w.applyRest(10, 5, 2, true);
    w.applyRest(10, 5, 2, true);
    w.applyRestDecay();
    const afterTwo = w.getState().attributes.conditioning;
    expect(afterTwo).toBeLessThanOrEqual(initialCond);
  });
});
