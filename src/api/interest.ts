import * as interestService from '@/services/interestService';
import type { InterestResponse } from '@/types';

export interface InterestRequest {
  interestRate?: number | null;
  interestAmount: number;
  interestPaid: number;
}

export const interestApi = {
  getByRecordId: (recordId: number): Promise<InterestResponse> => interestService.getByRecordId(recordId),

  upsert: (recordId: number, data: InterestRequest): Promise<InterestResponse> =>
    interestService.upsert(recordId, data),
};
