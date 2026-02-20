import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import type { TimeAllocation } from './types';

describe('GameEngine', () => {
  it('determinism: same seed + same allocation => same state after advance', () => {
    const initial1 = GameEngine.createInitialState('determinism-seed', { name: 'A' });
    const initial2 = GameEngine.createInitialState('determinism-seed', { name: 'A' });
    const eng1 = new GameEngine(initial1);
    const eng2 = new GameEngine(initial2);
    const alloc: TimeAllocation = {
      techniqueTraining: 4,
      conditioning: 3,
      strength: 2,
      filmStudy: 1,
      study: 5,
      recovery: 4,
      social: 2,
      job: 0,
      extraPracticeBlocks: 1,
      weightCut: 0,
      relationshipTime: 0,
    };
    eng1.applyWeeklyAllocation(alloc);
    eng2.applyWeeklyAllocation(alloc);
    const s1 = eng1.getState();
    const s2 = eng2.getState();
    expect(s1.weekIndex).toBe(s2.weekIndex);
    expect(s1.wrestler.attributes.strength).toBe(s2.wrestler.attributes.strength);
    expect(s1.rngState).toBe(s2.rngState);
  });
});
