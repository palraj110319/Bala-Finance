import * as financialRecordService from '@/services/financialRecordService';
import type { FinancialRecordResponse, PageResponse, RecordStatus } from '@/types';

export interface FinancialRecordRequest {
  personId: number;
  recordDate: string;
  originalAmount: number;
  interestAmount: number;
  status: RecordStatus;
  place?: string;
  notes?: string;
}

export interface RecordSearchParams {
  personId?: number;
  status?: RecordStatus;
  place?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export const recordsApi = {
  search: (params: RecordSearchParams): Promise<PageResponse<FinancialRecordResponse>> =>
    financialRecordService.search(params),

  getById: (id: number): Promise<FinancialRecordResponse> => financialRecordService.getById(id),

  create: (data: FinancialRecordRequest): Promise<FinancialRecordResponse> => financialRecordService.create(data),

  update: (id: number, data: FinancialRecordRequest): Promise<FinancialRecordResponse> =>
    financialRecordService.update(id, data),

  remove: (id: number): Promise<void> => financialRecordService.remove(id),

  removeAll: (): Promise<void> => financialRecordService.removeAll(),

  renew: (
    id: number,
    data: { renewalDate: string; newPrincipalAmount: number; newInterestAmount: number; notes?: string }
  ) => financialRecordService.renew(id, data),
};
