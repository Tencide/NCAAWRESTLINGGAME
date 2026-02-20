/**
 * Economy: weekly expenses, income, event costs.
 * HS vs College; deterministic given state.
 */

import type { EconomyState, WrestlerState } from './types';

const HS_WEEKLY_EXPENSES_BASE = 15;
const COLLEGE_RENT_BASE = 120;
const COLLEGE_FOOD_BASE = 80;
const COLLEGE_BOOKS_WEEKLY = 20;

export class Economy {
  static computeWeeklyExpenses(
    isHS: boolean,
    cityCostIndex: number,
    tuitionDueThisSemester: number,
    weeksInSemester: number
  ): Partial<EconomyState> {
    if (isHS) {
      return {
        weeklyExpenses: HS_WEEKLY_EXPENSES_BASE * cityCostIndex,
        rent: 0,
        food: 0,
        books: 0,
        travel: 0,
        semesterTuitionDue: 0,
      };
    }
    const rent = COLLEGE_RENT_BASE * cityCostIndex;
    const food = COLLEGE_FOOD_BASE * cityCostIndex;
    const books = COLLEGE_BOOKS_WEEKLY;
    const weeklyTuition = weeksInSemester > 0 ? tuitionDueThisSemester / weeksInSemester : 0;
    return {
      weeklyExpenses: rent + food + books + weeklyTuition,
      rent,
      food,
      books,
      travel: 0,
      semesterTuitionDue: tuitionDueThisSemester,
    };
  }

  static applyWeeklyIncome(eco: EconomyState, incomeAmount: number): void {
    eco.cashBalance += incomeAmount;
  }

  static deductExpenses(eco: EconomyState): void {
    eco.cashBalance -= eco.weeklyExpenses;
    eco.cashBalance -= eco.eventCostsThisWeek;
    eco.eventCostsThisWeek = 0;
  }
}
