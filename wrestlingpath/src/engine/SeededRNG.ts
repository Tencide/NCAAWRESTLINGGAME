/**
 * Seeded RNG for deterministic simulation.
 * Same seed + same sequence of calls => identical outcomes.
 * Uses a simple mulberry32-style generator; state is serializable.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: string | number) {
    const s = typeof seed === 'string' ? this.hashCode(seed) : seed;
    this.state = s >>> 0;
    if (this.state === 0) this.state = 1;
  }

  private hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i);
      h = h | 0;
    }
    return h;
  }

  /** Advance state and return next uint32 [0, 2^32-1] */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Float in [0, 1) */
  float(): number {
    return this.next() / 4294967296;
  }

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    const range = max - min + 1;
    return min + (this.next() % range);
  }

  /** Pick one from array */
  pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error('Cannot pick from empty array');
    return arr[this.next() % arr.length];
  }

  /** Bernoulli with probability p */
  chance(p: number): boolean {
    return this.float() < p;
  }

  /** Gaussian-ish variance: mean 0, scale 1; rough approximation */
  normal(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.float();
    while (v === 0) v = this.float();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Serialize state for save */
  serialize(): string {
    return String(this.state);
  }

  /** Restore from save */
  static deserialize(seed: string, stateStr: string): SeededRNG {
    const rng = new SeededRNG(seed);
    rng.state = parseInt(stateStr, 10) >>> 0;
    return rng;
  }
}
