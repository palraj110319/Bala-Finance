import * as dashboardService from '@/services/dashboardService';
import type {
  DashboardSummaryResponse,
  MonthlyInterestResponse,
  OutstandingByPersonResponse,
} from '@/types';

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummaryResponse> => dashboardService.getSummary(),

  getAvailableYears: (): Promise<number[]> => dashboardService.getAvailableYears(),

  getMonthlyInterest: (year: number): Promise<MonthlyInterestResponse> => dashboardService.getMonthlyInterest(year),

  getOutstandingByPerson: (year: number): Promise<OutstandingByPersonResponse> =>
    dashboardService.getOutstandingByPerson(year),
};
