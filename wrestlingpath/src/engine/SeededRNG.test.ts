import { describe, it, expect } from 'vitest';
import { SeededRNG } from './SeededRNG';

describe('SeededRNG', () => {
  it('determinism: same seed produces same sequence', () => {
    const a = new SeededRNG('test-seed-1');
    const b = new SeededRNG('test-seed-1');
    const seqA = [a.next(), a.next(), a.float(), a.int(1, 10)];
    const seqB = [b.next(), b.next(), b.float(), b.int(1, 10)];
    expect(seqA).toEqual(seqB);
  });

  it('different seed produces different sequence', () => {
    const a = new SeededRNG('seed-A');
    const b = new SeededRNG('seed-B');
    expect(a.next()).not.toBe(b.next());
  });

  it('deserialize restores state and continues same sequence', () => {
    const r1 = new SeededRNG('restore');
    const v1 = r1.next();
    const v2 = r1.next();
    const state = r1.serialize();
    const r2 = SeededRNG.deserialize('restore', state);
    expect(r2.next()).toBe(r1.next());
  });
});
