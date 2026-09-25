export type RecordStatus = 'OPEN' | 'CLOSED' | 'RENEWED' | 'PARTIAL_PAYMENT' | 'PENDING_REVIEW';

export interface PersonResponse {
  id: number;
  name: string;
  mobileNumber?: string;
  place?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialRecordResponse {
  id: number;
  personId: number;
  personName: string;
  parentRecordId?: number;
  recordDate: string;
  statusDate?: string;
  originalAmount: number;
  principalOutstanding: number;
  interestAmount: number;
  outstandingAmount: number;
  status: RecordStatus;
  place?: string;
  notes?: string;
}

export interface DashboardSummaryResponse {
  totalOriginalAmount: number;
  totalOutstandingAmount: number;
  totalInterest: number;
  totalPaidAmount: number;
  openRecords: number;
  closedRecords: number;
  renewedRecords: number;
  pendingReviewRecords: number;
}

export interface PersonOutstandingPoint {
  personId: number;
  personName: string;
  outstandingAmount: number;
}

export interface OutstandingByPersonResponse {
  totalAmount: number;
  byPerson: PersonOutstandingPoint[];
}

export interface MonthlyInterestPoint {
  month: number; // 1-12
  interestAmount: number;
}

export interface MonthlyInterestResponse {
  totalAmount: number;
  monthly: MonthlyInterestPoint[];
}

export interface InterestResponse {
  id: number;
  financialRecordId: number;
  interestRate?: number;
  interestAmount: number;
  interestPaid: number;
  interestOutstanding: number;
}

export interface RenewalResponse {
  id: number;
  originalRecordId: number;
  renewedRecordId: number;
  renewalDate: string;
  notes?: string;
  chain?: FinancialRecordResponse[];
}

export interface ExcelImportPreviewRow {
  rowNumber: number;
  sheetName: string;
  personName: string;
  recordDate?: string;
  statusDate?: string;
  originalAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
  status?: RecordStatus;
  place?: string;
  notes?: string;
  validationState: 'VALID' | 'FLAGGED' | 'INVALID';
  validationMessage?: string;
}

export interface ExcelImportPreviewResponse {
  importToken: string;
  totalRows: number;
  validRows: number;
  flaggedRows: number;
  invalidRows: number;
  rows: ExcelImportPreviewRow[];
}

export interface ExcelImportResultResponse {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  failedRows: { rowNumber: number; reason: string }[];
}

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
