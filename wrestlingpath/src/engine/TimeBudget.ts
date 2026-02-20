/**
 * Weekly time budget: auto-deduct baseline, then validate player allocation.
 * Deterministic: same inputs => same available hours.
 */

import type { TimeAllocation } from './types';

const HOURS_PER_WEEK = 168;

export interface TimeBudgetConfig {
  isHS: boolean;
  /** Tournament week: extra locked hours (travel/competition/recovery) */
  tournamentWeek: boolean;
  /** Injury: rehab hours locked */
  injuryRehabHours: number;
  /** Weight cut: maintenance hours locked */
  weightCutLockedHours: number;
}

const HS_BASELINE = {
  sleep: 56,
  school: 40,
  mandatoryPractice: 10,
  commute: 6,
  homework: 5,
  lifeMaintenance: 10,
};
const HS_BASELINE_TOTAL =
  HS_BASELINE.sleep +
  HS_BASELINE.school +
  HS_BASELINE.mandatoryPractice +
  HS_BASELINE.commute +
  HS_BASELINE.homework +
  HS_BASELINE.lifeMaintenance;

const COLLEGE_BASELINE = {
  sleep: 56,
  classes: 18,
  mandatoryPractice: 10,
  teamLifting: 4,
  lifeMaintenance: 10,
  baselineStudy: 15,
  transit: 5,
};
const COLLEGE_BASELINE_TOTAL =
  COLLEGE_BASELINE.sleep +
  COLLEGE_BASELINE.classes +
  COLLEGE_BASELINE.mandatoryPractice +
  COLLEGE_BASELINE.teamLifting +
  COLLEGE_BASELINE.lifeMaintenance +
  COLLEGE_BASELINE.baselineStudy +
  COLLEGE_BASELINE.transit;

const TOURNAMENT_LOCKED_EXTRA = 20; // travel + competition + recovery
const EXTRA_PRACTICE_BLOCK_HOURS = 2;
const HS_MAX_EXTRA_PRACTICE_BLOCKS = 3;
const COLLEGE_MAX_EXTRA_PRACTICE_BLOCKS = 4;

export class TimeBudget {
  /**
   * Compute available hours for the week (before player allocation).
   */
  static availableHours(config: TimeBudgetConfig): number {
    const baseline = config.isHS ? HS_BASELINE_TOTAL : COLLEGE_BASELINE_TOTAL;
    let locked = baseline;
    if (config.tournamentWeek) locked += TOURNAMENT_LOCKED_EXTRA;
    locked += config.injuryRehabHours;
    locked += config.weightCutLockedHours;
    return Math.max(0, HOURS_PER_WEEK - locked);
  }

  /**
   * Total allocated hours from player choice.
   */
  static totalAllocated(a: TimeAllocation, isHS: boolean): number {
    const blocks = Math.min(
      a.extraPracticeBlocks,
      isHS ? HS_MAX_EXTRA_PRACTICE_BLOCKS : COLLEGE_MAX_EXTRA_PRACTICE_BLOCKS
    );
    return (
      a.techniqueTraining +
      a.conditioning +
      a.strength +
      a.filmStudy +
      a.study +
      a.recovery +
      a.social +
      a.job +
      blocks * EXTRA_PRACTICE_BLOCK_HOURS +
      a.weightCut +
      a.relationshipTime
    );
  }

  /**
   * Validate: sum(allocated) <= available, and extra practice within cap and 2h blocks.
   */
  static validate(
    allocation: TimeAllocation,
    availableHours: number,
    isHS: boolean
  ): { valid: boolean; error?: string } {
    const maxBlocks = isHS ? HS_MAX_EXTRA_PRACTICE_BLOCKS : COLLEGE_MAX_EXTRA_PRACTICE_BLOCKS;
    if (allocation.extraPracticeBlocks > maxBlocks) {
      return { valid: false, error: `Extra practice limited to ${maxBlocks} blocks (2h each) per week.` };
    }
    if (allocation.extraPracticeBlocks < 0) {
      return { valid: false, error: 'Extra practice blocks cannot be negative.' };
    }
    const total = this.totalAllocated(allocation, isHS);
    if (total > availableHours) {
      return { valid: false, error: `Total allocated ${total}h exceeds available ${availableHours}h.` };
    }
    return { valid: true };
  }

  static getExtraPracticeBlockHours(): number {
    return EXTRA_PRACTICE_BLOCK_HOURS;
  }

  static getHSMaxExtraPracticeBlocks(): number {
    return HS_MAX_EXTRA_PRACTICE_BLOCKS;
  }

  static getCollegeMaxExtraPracticeBlocks(): number {
    return COLLEGE_MAX_EXTRA_PRACTICE_BLOCKS;
  }
}
