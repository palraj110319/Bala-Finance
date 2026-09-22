import { getAll, getById as dbGetById, insert, put, STORES } from '@/db/database';
import { scale2 } from '@/lib/decimal';
import type { InterestRecordRow, FinancialRecordRow } from './types';
import type { InterestResponse } from '@/types';
import type { InterestRequest } from '@/api/interest';

function toResponse(row: InterestRecordRow): InterestResponse {
  return {
    id: row.id,
    financialRecordId: row.financialRecordId,
    interestRate: row.interestRate ?? undefined,
    interestAmount: row.interestAmount,
    interestPaid: row.interestPaid,
    interestOutstanding: row.interestOutstanding,
  };
}

async function findByRecordId(recordId: number): Promise<InterestRecordRow | undefined> {
  const all = await getAll<InterestRecordRow>(STORES.interestRecords);
  return all.find((r) => r.financialRecordId === recordId);
}

export async function getByRecordId(recordId: number): Promise<InterestResponse> {
  const row = await findByRecordId(recordId);
  if (!row) throw new Error(`No interest record found for financial record id: ${recordId}`);
  return toResponse(row);
}

export async function upsert(recordId: number, request: InterestRequest): Promise<InterestResponse> {
  const record = await dbGetById<FinancialRecordRow>(STORES.financialRecords, recordId);
  if (!record || record.deleted) throw new Error(`FinancialRecord ${recordId} not found`);

  const existing = await findByRecordId(recordId);
  const now = new Date().toISOString();

  const interestAmount = scale2(request.interestAmount);
  const interestPaid = scale2(request.interestPaid);
  let interestOutstanding = scale2(interestAmount - interestPaid);
  if (interestOutstanding < 0) interestOutstanding = 0;

  if (existing) {
    existing.interestRate = request.interestRate ?? null;
    existing.interestAmount = interestAmount;
    existing.interestPaid = interestPaid;
    existing.interestOutstanding = interestOutstanding;
    existing.updatedAt = now;
    await put(STORES.interestRecords, existing);

    record.interestAmount = interestAmount;
    record.updatedAt = now;
    await put(STORES.financialRecords, record);

    return toResponse(existing);
  }

  const created: Omit<InterestRecordRow, 'id'> = {
    financialRecordId: recordId,
    interestRate: request.interestRate ?? null,
    interestAmount,
    interestPaid,
    interestOutstanding,
    createdAt: now,
    updatedAt: now,
  };
  const id = await insert<Omit<InterestRecordRow, 'id'>>(STORES.interestRecords, created);

  record.interestAmount = interestAmount;
  record.updatedAt = now;
  await put(STORES.financialRecords, record);

  return toResponse({ ...created, id });
}
