/**
 * Tournament configs: HS season, state postseason, Fargo, Super 32, WNO.
 */

export interface TournamentConfig {
  id: string;
  name: string;
  type: 'hs_dual' | 'hs_invite' | 'state' | 'fargo' | 'super32' | 'wno';
  prestige: number;   // 1–2
  cost: number;
  difficulty: number; // multiplier for opponent strength
  month?: number;    // 1–12 for offseason
  inviteOnly: boolean;
  minRecruitingScore?: number;
  nationalRankMax?: number; // e.g. top 20 for WNO
}

export const TOURNAMENTS: TournamentConfig[] = [
  { id: 'hs-season', name: 'HS Season', type: 'hs_dual', prestige: 1, cost: 0, difficulty: 1, inviteOnly: false },
  { id: 'state', name: 'State Championship', type: 'state', prestige: 1.4, cost: 50, difficulty: 1.2, inviteOnly: false },
  { id: 'fargo', name: 'Fargo', type: 'fargo', prestige: 1.5, cost: 450, difficulty: 1.3, month: 7, inviteOnly: false },
  { id: 'super32', name: 'Super 32', type: 'super32', prestige: 1.4, cost: 280, difficulty: 1.25, month: 10, inviteOnly: false },
  { id: 'wno', name: "Who's Number One", type: 'wno', prestige: 1.6, cost: 280, difficulty: 1.4, month: 10, inviteOnly: true, minRecruitingScore: 68, nationalRankMax: 20 },
];

export const WEIGHT_CLASSES_HS = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285];
export const WEIGHT_CLASSES_COLLEGE = [125, 133, 141, 149, 157, 165, 174, 184, 197, 285];
