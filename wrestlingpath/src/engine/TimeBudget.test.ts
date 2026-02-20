import { describe, it, expect } from 'vitest';
import { TimeBudget } from './TimeBudget';
import type { TimeAllocation } from './types';

describe('TimeBudget', () => {
  it('available hours: HS non-tournament week', () => {
    const h = TimeBudget.availableHours({
      isHS: true,
      tournamentWeek: false,
      injuryRehabHours: 0,
      weightCutLockedHours: 0,
    });
    expect(h).toBeGreaterThanOrEqual(30);
    expect(h).toBeLessThanOrEqual(50);
  });

  it('available hours: tournament week reduces hours', () => {
    const normal = TimeBudget.availableHours({
      isHS: true,
      tournamentWeek: false,
      injuryRehabHours: 0,
      weightCutLockedHours: 0,
    });
    const tournament = TimeBudget.availableHours({
      isHS: true,
      tournamentWeek: true,
      injuryRehabHours: 0,
      weightCutLockedHours: 0,
    });
    expect(tournament).toBeLessThan(normal);
  });

  it('allocations cannot exceed availableHours', () => {
    const available = 40;
    const allocation: TimeAllocation = {
      techniqueTraining: 10,
      conditioning: 10,
      strength: 5,
      filmStudy: 2,
      study: 8,
      recovery: 5,
      social: 2,
      job: 0,
      extraPracticeBlocks: 2,
      weightCut: 0,
      relationshipTime: 0,
    };
    const total = TimeBudget.totalAllocated(allocation, true);
    const result = TimeBudget.validate(allocation, available, true);
    if (total > available) expect(result.valid).toBe(false);
  });

  it('extra practice capped at 3 blocks (HS) and 2h per block', () => {
    const allocation: TimeAllocation = {
      techniqueTraining: 0,
      conditioning: 0,
      strength: 0,
      filmStudy: 0,
      study: 0,
      recovery: 0,
      social: 0,
      job: 0,
      extraPracticeBlocks: 5,
      weightCut: 0,
      relationshipTime: 0,
    };
    const result = TimeBudget.validate(allocation, 100, true);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3 blocks');
  });

  it('college allows 4 extra practice blocks', () => {
    const allocation: TimeAllocation = {
      techniqueTraining: 0,
      conditioning: 0,
      strength: 0,
      filmStudy: 0,
      study: 0,
      recovery: 0,
      social: 0,
      job: 0,
      extraPracticeBlocks: 4,
      weightCut: 0,
      relationshipTime: 0,
    };
    const total = TimeBudget.totalAllocated(allocation, false);
    expect(total).toBe(8);
    const result = TimeBudget.validate(allocation, 50, false);
    expect(result.valid).toBe(true);
  });
});
