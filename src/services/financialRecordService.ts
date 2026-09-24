import { getAll, getById as dbGetById, insert, put, STORES } from '@/db/database';
import { scale2 } from '@/lib/decimal';
import { getByIdRaw as getPersonRaw } from './personService';
import type { FinancialRecordRow } from './types';
import type {
  FinancialRecordResponse,
  PageResponse,
  RecordStatus,
} from '@/types';
import type { FinancialRecordRequest, RecordSearchParams } from '@/api/records';

// Renewal chain data (parentRecordId, RENEWED status, etc.) is still part of the
// core record model, so this type and the renew()/getRenewalChain() logic below
// are kept even though the dedicated Renewals menu/page has been removed.
export interface RenewalRequest {
  renewalDate: string;
  newPrincipalAmount: number;
  newInterestAmount?: number;
  notes?: string;
}

class NotFoundError extends Error {}
export class BusinessValidationError extends Error {}

async function findEntity(id: number): Promise<FinancialRecordRow> {
  const row = await dbGetById<FinancialRecordRow>(STORES.financialRecords, id);
  if (!row || row.deleted) throw new NotFoundError(`FinancialRecord ${id} not found`);
  return row;
}

async function toResponse(row: FinancialRecordRow): Promise<FinancialRecordResponse> {
  const person = await getPersonRaw(row.personId);
  return {
    id: row.id,
    personId: row.personId,
    personName: person?.name ?? '(unknown)',
    parentRecordId: row.parentRecordId ?? undefined,
    recordDate: row.recordDate,
    originalAmount: row.originalAmount,
    principalOutstanding: row.principalOutstanding,
    interestAmount: row.interestAmount,
    outstandingAmount: row.outstandingAmount,
    status: row.status,
    place: row.place ?? undefined,
    notes: row.notes ?? undefined,
  };
}

async function activeRows(): Promise<FinancialRecordRow[]> {
  const all = await getAll<FinancialRecordRow>(STORES.financialRecords);
  return all.filter((r) => !r.deleted);
}

export async function create(request: FinancialRecordRequest): Promise<FinancialRecordResponse> {
  const person = await getPersonRaw(request.personId);
  if (!person) throw new NotFoundError(`Person ${request.personId} not found`);

  const now = new Date().toISOString();
  const record: Omit<FinancialRecordRow, 'id'> = {
    personId: person.id,
    parentRecordId: null,
    recordDate: request.recordDate,
    originalAmount: scale2(request.originalAmount),
    principalOutstanding: scale2(request.originalAmount),
    interestAmount: scale2(request.interestAmount),
    outstandingAmount: scale2(request.originalAmount),
    status: request.status,
    place: request.place || null,
    notes: request.notes || null,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  const id = await insert<Omit<FinancialRecordRow, 'id'>>(STORES.financialRecords, record);
  return toResponse({ ...record, id });
}

export async function update(id: number, request: FinancialRecordRequest): Promise<FinancialRecordResponse> {
  const row = await findEntity(id);

  if (row.personId !== request.personId) {
    const person = await getPersonRaw(request.personId);
    if (!person) throw new NotFoundError(`Person ${request.personId} not found`);
    row.personId = person.id;
  }

  row.recordDate = request.recordDate;
  row.originalAmount = scale2(request.originalAmount);
  row.interestAmount = scale2(request.interestAmount);
  row.status = request.status;
  row.place = request.place || null;
  row.notes = request.notes || null;
  row.updatedAt = new Date().toISOString();

  await put(STORES.financialRecords, row);
  return toResponse(row);
}

export async function remove(id: number): Promise<void> {
  const row = await findEntity(id);
  row.deleted = true;
  row.updatedAt = new Date().toISOString();
  await put(STORES.financialRecords, row);
}

export async function removeAll(): Promise<void> {
  const rows = await getAll<FinancialRecordRow>(STORES.financialRecords);
  const now = new Date().toISOString();
  for (const row of rows) {
    row.deleted = true;
    row.updatedAt = now;
    await put(STORES.financialRecords, row);
  }
}

export async function getById(id: number): Promise<FinancialRecordResponse> {
  return toResponse(await findEntity(id));
}

function parseSort(sort: string | undefined): { field: keyof FinancialRecordRow; dir: 1 | -1 } {
  if (!sort) return { field: 'recordDate', dir: 1 };
  const [field, dir] = sort.split(',');
  return { field: (field as keyof FinancialRecordRow) || 'recordDate', dir: dir === 'desc' ? -1 : 1 };
}

/** Mirrors FinancialRecordServiceImpl.search's dynamic Specification filtering. */
export async function search(params: RecordSearchParams): Promise<PageResponse<FinancialRecordResponse>> {
  let rows = await activeRows();

  if (params.personId != null) rows = rows.filter((r) => r.personId === params.personId);
  if (params.status) rows = rows.filter((r) => r.status === params.status);
  if (params.place && params.place.trim()) {
    const like = params.place.trim().toLowerCase();
    rows = rows.filter((r) => (r.place ?? '').toLowerCase().includes(like));
  }
  if (params.from) rows = rows.filter((r) => r.recordDate >= params.from!);
  if (params.to) rows = rows.filter((r) => r.recordDate <= params.to!);
  if (params.minAmount != null) rows = rows.filter((r) => r.outstandingAmount >= params.minAmount!);
  if (params.maxAmount != null) rows = rows.filter((r) => r.outstandingAmount <= params.maxAmount!);

  const { field, dir } = parseSort(params.sort);
  rows = [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return a.id - b.id;
    // Numeric fields compare numerically; everything else (dates, status, place) compares
    // correctly as a string (ISO dates sort lexicographically in the right order).
    const diff = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return diff > 0 ? dir : -dir;
  });

  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const totalElements = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const pageRows = rows.slice(page * size, page * size + size);
  const content = await Promise.all(pageRows.map(toResponse));

  return {
    content,
    pageNumber: page,
    pageSize: size,
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
  };
}

export async function renew(
  id: number,
  request: RenewalRequest
): Promise<{
  id: number;
  originalRecordId: number;
  renewedRecordId: number;
  renewalDate: string;
  notes?: string;
  chain: FinancialRecordResponse[];
}> {
  const original = await findEntity(id);

  if (original.status === 'CLOSED' || original.status === 'RENEWED') {
    throw new BusinessValidationError(
      `Record ${id} is already ${original.status} and cannot be renewed again`
    );
  }

  const now = new Date().toISOString();

  // Close the original record - historical data is preserved, never overwritten.
  original.status = 'RENEWED';
  original.outstandingAmount = 0;
  original.principalOutstanding = 0;
  original.updatedAt = now;
  await put(STORES.financialRecords, original);

  // Create the new linked record.
  const renewedRow: Omit<FinancialRecordRow, 'id'> = {
    personId: original.personId,
    parentRecordId: original.id,
    recordDate: request.renewalDate,
    originalAmount: scale2(request.newPrincipalAmount),
    principalOutstanding: scale2(request.newPrincipalAmount),
    interestAmount: scale2(request.newInterestAmount ?? 0),
    outstandingAmount: scale2(request.newPrincipalAmount),
    status: 'OPEN',
    place: original.place,
    notes: request.notes || null,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  const renewedId = await insert<Omit<FinancialRecordRow, 'id'>>(STORES.financialRecords, renewedRow);
  const renewed: FinancialRecordRow = { ...renewedRow, id: renewedId };

  const renewalRow = {
    originalRecordId: original.id,
    renewedRecordId: renewed.id,
    renewalDate: request.renewalDate,
    notes: request.notes || null,
    createdAt: now,
  };
  const renewalId = await insert(STORES.renewals, renewalRow);

  const chain = await buildRenewalChain(renewed);

  return {
    id: renewalId,
    originalRecordId: original.id,
    renewedRecordId: renewed.id,
    renewalDate: request.renewalDate,
    notes: request.notes || undefined,
    chain,
  };
}

/** Walks parentRecord links back to the original, oldest first. */
async function buildRenewalChain(latest: FinancialRecordRow): Promise<FinancialRecordResponse[]> {
  const chain: FinancialRecordRow[] = [];
  let current: FinancialRecordRow | undefined = latest;
  while (current) {
    chain.unshift(current);
    current = current.parentRecordId
      ? await dbGetById<FinancialRecordRow>(STORES.financialRecords, current.parentRecordId)
      : undefined;
  }
  return Promise.all(chain.map(toResponse));
}

export async function getRenewalChain(id: number): Promise<FinancialRecordResponse[]> {
  const record = await findEntity(id);

  // Walk backward to find the root of the chain.
  let root = record;
  while (root.parentRecordId) {
    const parent = await dbGetById<FinancialRecordRow>(STORES.financialRecords, root.parentRecordId);
    if (!parent) break;
    root = parent;
  }

  // Walk forward from the root, following renewals, collecting every record in order.
  const allRows = await getAll<FinancialRecordRow>(STORES.financialRecords);
  const chain: FinancialRecordRow[] = [root];
  let current = root;
  // A record is renewed at most once in this model, so there should be a single child.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const child = allRows.find((r) => r.parentRecordId === current.id);
    if (!child) break;
    chain.push(child);
    current = child;
  }

  return Promise.all(chain.map(toResponse));
}

export async function getRawById(id: number): Promise<FinancialRecordRow | undefined> {
  return dbGetById<FinancialRecordRow>(STORES.financialRecords, id);
}

export async function allActiveRaw(): Promise<FinancialRecordRow[]> {
  return activeRows();
}

export type { RecordStatus };
