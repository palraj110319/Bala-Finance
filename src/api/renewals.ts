import * as financialRecordService from '@/services/financialRecordService';
import type { FinancialRecordResponse, RenewalResponse } from '@/types';

export interface RenewalRequest {
  renewalDate: string;
  newPrincipalAmount: number;
  newInterestAmount?: number;
  notes?: string;
}

export const renewalsApi = {
  renew: (recordId: number, data: RenewalRequest): Promise<RenewalResponse> =>
    financialRecordService.renew(recordId, data),

  getChain: (recordId: number): Promise<FinancialRecordResponse[]> =>
    financialRecordService.getRenewalChain(recordId),
};
