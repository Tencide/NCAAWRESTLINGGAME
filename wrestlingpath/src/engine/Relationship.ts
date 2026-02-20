/**
 * Relationship: level change from allocated time vs required.
 * Conflict events and bonuses; deterministic given allocation.
 */

import type { Relationship } from './types';

const LEVEL_GAIN_PER_HOUR_ABOVE_REQUIRED = 0.5;
const LEVEL_LOSS_PER_HOUR_BELOW_REQUIRED = 1.5;

export class RelationshipManager {
  static updateLevel(rel: Relationship, allocatedHours: number): number {
    const diff = allocatedHours - rel.weeklyTimeRequired;
    if (diff >= 0) {
      return Math.min(100, rel.relationshipLevel + diff * LEVEL_GAIN_PER_HOUR_ABOVE_REQUIRED);
    }
    return Math.max(0, rel.relationshipLevel + diff * LEVEL_LOSS_PER_HOUR_BELOW_REQUIRED);
  }

  static applyWeekly(rel: Relationship, allocatedHours: number): { newLevel: number; conflict: boolean } {
    const newLevel = this.updateLevel(rel, allocatedHours);
    const conflict = allocatedHours < rel.weeklyTimeRequired && rel.relationshipLevel < 40 && Math.random() < 0.2;
    rel.relationshipLevel = newLevel;
    return { newLevel, conflict };
  }
}
