import { describe, it, expect } from 'vitest';
import { RankingSystem } from './RankingSystem';
import type { RankedEntry } from './types';

describe('RankingSystem', () => {
  it('getPlayerRankInList: rank 1 when highest rating', () => {
    const list: RankedEntry[] = [
      { id: 'a', name: 'A', overallRating: 80, trueSkill: 80, weightClass: 145 },
      { id: 'b', name: 'B', overallRating: 70, trueSkill: 70, weightClass: 145 },
    ];
    expect(RankingSystem.getPlayerRankInList(85, list)).toBe(1);
  });

  it('getPlayerRankInList: rank 2 when second', () => {
    const list: RankedEntry[] = [
      { id: 'a', name: 'A', overallRating: 80, trueSkill: 80, weightClass: 145 },
      { id: 'b', name: 'B', overallRating: 70, trueSkill: 70, weightClass: 145 },
    ];
    expect(RankingSystem.getPlayerRankInList(75, list)).toBe(2);
  });

  it('updateAfterMatch reorders by rating', () => {
    const list: RankedEntry[] = [
      { id: 'a', name: 'A', overallRating: 80, trueSkill: 80, weightClass: 145 },
      { id: 'b', name: 'B', overallRating: 70, trueSkill: 70, weightClass: 145 },
    ];
    const updated = RankingSystem.updateAfterMatch(list, 'b', 'a', 82, 78);
    expect(updated[0].id).toBe('b');
    expect(updated[0].overallRating).toBe(82);
  });
});
