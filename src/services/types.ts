import type { RecordStatus } from '@/types';

export interface UserRecord {
  id: number;
  username: string;
  passwordHash: string;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonRecord {
  id: number;
  name: string;
  mobileNumber?: string | null;
  place?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface FinancialRecordRow {
  id: number;
  personId: number;
  parentRecordId?: number | null;
  recordDate: string;
  statusDate?: string | null;
  originalAmount: number;
  principalOutstanding: number;
  interestAmount: number;
  outstandingAmount: number;
  status: RecordStatus;
  place?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface InterestRecordRow {
  id: number;
  financialRecordId: number;
  interestRate?: number | null;
  interestAmount: number;
  interestPaid: number;
  interestOutstanding: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER';

export interface PaymentRow {
  id: number;
  financialRecordId: number;
  personId: number;
  paymentDate: string;
  paymentAmount: number;
  principalPaid: number;
  interestPaid: number;
  paymentMode?: PaymentMode | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface RenewalRow {
  id: number;
  originalRecordId: number;
  renewedRecordId: number;
  renewalDate: string;
  notes?: string | null;
  createdAt: string;
}
