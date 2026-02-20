/**
 * Rankings by weight class: state (HS), national (HS), division (college).
 * Updates after events; deterministic when fed same results + RNG.
 */

import type { RankedEntry, WrestlerState, Opponent } from './types';

const WEIGHT_CLASSES = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285];

export class RankingSystem {
  /** Build initial ranked list from opponent pool for a weight class */
  static buildFromPool(
    pool: Opponent[],
    weightClass: number,
    rngStateForSort: number
  ): RankedEntry[] {
    const list = pool
      .filter((o) => o.weightClass === weightClass)
      .map((o) => ({
        id: o.id,
        name: o.name,
        overallRating: o.overallRating,
        trueSkill: o.trueSkill,
        weightClass: o.weightClass,
        wins: 0,
        losses: 0,
      }))
      .sort((a, b) => b.overallRating - a.overallRating);
    return list;
  }

  /** Get player rank in a list (1-based) by comparing rating */
  static getPlayerRankInList(playerRating: number, list: RankedEntry[]): number {
    let rank = 1;
    for (const e of list) {
      if (e.overallRating > playerRating) rank++;
    }
    return rank;
  }

  /** Update rankings after a match: winner moves up, loser moves down (simplified swap) */
  static updateAfterMatch(
    list: RankedEntry[],
    winnerId: string,
    loserId: string,
    winnerRating: number,
    loserRating: number
  ): RankedEntry[] {
    const out = list.slice();
    const wi = out.findIndex((e) => e.id === winnerId);
    const li = out.findIndex((e) => e.id === loserId);
    if (wi >= 0) out[wi] = { ...out[wi], overallRating: winnerRating, wins: (out[wi].wins ?? 0) + 1 };
    if (li >= 0) out[li] = { ...out[li], overallRating: loserRating, losses: (out[li].losses ?? 0) + 1 };
    out.sort((a, b) => b.overallRating - a.overallRating);
    return out;
  }

  /** Insert or update player in rankings (e.g. after Fargo boost) */
  static upsertPlayer(
    list: RankedEntry[],
    playerId: string,
    playerName: string,
    playerRating: number,
    weightClass: number
  ): RankedEntry[] {
    const without = list.filter((e) => e.id !== playerId);
    without.push({
      id: playerId,
      name: playerName,
      overallRating: playerRating,
      trueSkill: playerRating,
      weightClass,
    });
    without.sort((a, b) => b.overallRating - a.overallRating);
    return without;
  }

  static getWeightClasses(): number[] {
    return [...WEIGHT_CLASSES];
  }
}
