import * as XLSX from 'xlsx';
import { insert, STORES } from '@/db/database';
import { scale2 } from '@/lib/decimal';
import { findOrCreateByName } from './personService';
import type { FinancialRecordRow } from './types';
import type {
  ExcelImportPreviewResponse,
  ExcelImportPreviewRow,
  ExcelImportResultResponse,
  RecordStatus,
} from '@/types';

/**
 * Parses workbooks matching the "Bala_Debt_details.xlsx" structure:
 * columns [Date, Name, Principle Amt, Status, Intrest Amt, Place, Notes, Original Amt] (header
 * spellings, including "Intrest Amt" and "Principle Amt", are intentional — they match the
 * original source data), one sheet per year-range. Status values observed: Closed, Renewl
 * (=Renewed), Open, or blank.
 *
 * Column semantics (inferred from real data, not just headers):
 *  - For CLOSED/RENEWED rows: "Original Amt" = amount originally lent, "Principle Amt" ~ 0.
 *  - For OPEN (or ambiguous) rows: "Principle Amt" = current outstanding principal,
 *    "Original Amt" is often blank, in which case Principle Amt is used as the original too.
 */

interface StagedRow {
  rowNumber: number;
  sheetName: string;
  personName: string;
  recordDate: string | null; // ISO yyyy-MM-dd
  originalAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: RecordStatus | null; // null if ambiguous/flagged
  place: string | null;
  notes: string | null;
  validationState: 'VALID' | 'FLAGGED' | 'INVALID';
  validationMessage: string | null;
}

const TTL_MS = 30 * 60 * 1000;
const stagingStore = new Map<string, { rows: StagedRow[]; expiresAt: number }>();

function stage(rows: StagedRow[]): string {
  const token = crypto.randomUUID();
  stagingStore.set(token, { rows, expiresAt: Date.now() + TTL_MS });
  return token;
}

function retrieve(token: string): StagedRow[] {
  const staged = stagingStore.get(token);
  if (!staged || Date.now() > staged.expiresAt) {
    stagingStore.delete(token);
    throw new Error('Import preview has expired or was not found. Please re-upload the file.');
  }
  return staged.rows;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  }

  const str = String(raw).trim();
  if (!str) return null;

  // dd-MM-yyyy or d-M-yyyy
  let m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return isoFrom(m[3], m[2], m[1]);

  // dd/MM/yyyy or d/M/yyyy
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return isoFrom(m[3], m[2], m[1]);

  // yyyy-MM-dd
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoFrom(m[1], m[2], m[3]);

  return null;
}

function isoFrom(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${pad2(mo)}-${pad2(d)}`;
  // Reject impossible calendar dates (e.g. 31-02-2024), same spirit as DateTimeFormatter.parse failing.
  const check = new Date(iso);
  if (Number.isNaN(check.getTime()) || check.getUTCDate() !== d || check.getUTCMonth() + 1 !== mo) {
    return null;
  }
  return iso;
}

function parseDecimal(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function getString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return String(raw);
  const str = String(raw).trim();
  return str || null;
}

function mapStatus(raw: string | null): RecordStatus | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case 'closed':
      return 'CLOSED';
    case 'open':
      return 'OPEN';
    case 'renewl':
    case 'renewal':
    case 'renewed':
      return 'RENEWED'; // "Renewl" typo seen in source data
    default:
      return null;
  }
}

function parseSheet(sheetName: string, rows: unknown[][]): StagedRow[] {
  const out: StagedRow[] = [];
  if (rows.length === 0) return out;

  const headerRow = rows[0];
  const colIndex = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    if (typeof cell === 'string' && cell.trim()) colIndex.set(cell.trim(), idx);
  });

  const dateCol = colIndex.get('Date') ?? -1;
  const nameCol = colIndex.get('Name') ?? -1;
  const principalCol = colIndex.get('Principle Amt') ?? -1;
  const statusCol = colIndex.get('Status') ?? -1;
  const interestCol = colIndex.get('Intrest Amt') ?? -1;
  const placeCol = colIndex.get('Place') ?? -1;
  const notesCol = colIndex.get('Notes') ?? -1;
  const originalCol = colIndex.get('Original Amt') ?? -1;

  const cellAt = (row: unknown[], col: number) => (col < 0 ? undefined : row[col]);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed for user-facing messages, matching the header being row 1

    const name = getString(cellAt(row, nameCol));
    // Skip blank rows and the trailing "Total Amount" summary rows.
    if (!name || name.toLowerCase() === 'total amount') continue;

    const date = parseDate(cellAt(row, dateCol));
    const principal = parseDecimal(cellAt(row, principalCol));
    const interest = parseDecimal(cellAt(row, interestCol));
    const original = parseDecimal(cellAt(row, originalCol));
    const place = getString(cellAt(row, placeCol));
    const notes = getString(cellAt(row, notesCol));
    const statusRaw = getString(cellAt(row, statusCol));

    const status = mapStatus(statusRaw);

    let validationState: 'VALID' | 'FLAGGED' | 'INVALID';
    let validationMessage: string | null = null;

    if (date == null) {
      validationState = 'INVALID';
      validationMessage = 'Missing or unparseable date';
    } else if (status == null && !statusRaw) {
      validationState = 'FLAGGED';
      validationMessage = 'Status is blank - needs manual review before import';
    } else if (status == null) {
      validationState = 'INVALID';
      validationMessage = `Unrecognized status value: '${statusRaw}'`;
    } else {
      validationState = 'VALID';
    }

    // Original amount fallback: for OPEN/ambiguous rows the sheet often leaves
    // "Original Amt" blank and stores the amount in "Principle Amt" instead.
    let resolvedOriginal = original ?? principal;
    if (resolvedOriginal == null) {
      resolvedOriginal = 0;
      if (validationState === 'VALID') {
        validationState = 'INVALID';
        validationMessage = 'No original or principal amount present';
      }
    }

    out.push({
      rowNumber: rowNum,
      sheetName,
      personName: name.trim(),
      recordDate: date,
      originalAmount: scale2(resolvedOriginal),
      principalAmount: scale2(principal ?? 0),
      interestAmount: scale2(interest ?? 0),
      status,
      place,
      notes,
      validationState,
      validationMessage,
    });
  }

  return out;
}

export async function preview(file: File): Promise<ExcelImportPreviewResponse> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const stagedRows: StagedRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
    stagedRows.push(...parseSheet(sheetName, rows));
  }

  const token = stage(stagedRows);

  const valid = stagedRows.filter((r) => r.validationState === 'VALID').length;
  const flagged = stagedRows.filter((r) => r.validationState === 'FLAGGED').length;
  const invalid = stagedRows.filter((r) => r.validationState === 'INVALID').length;

  const previewRows: ExcelImportPreviewRow[] = stagedRows.map((r) => ({
    rowNumber: r.rowNumber,
    sheetName: r.sheetName,
    personName: r.personName,
    recordDate: r.recordDate ?? undefined,
    originalAmount: r.originalAmount,
    principalAmount: r.principalAmount,
    interestAmount: r.interestAmount,
    status: r.status ?? undefined,
    place: r.place ?? undefined,
    notes: r.notes ?? undefined,
    validationState: r.validationState,
    validationMessage: r.validationMessage ?? undefined,
  }));

  return {
    importToken: token,
    totalRows: stagedRows.length,
    validRows: valid,
    flaggedRows: flagged,
    invalidRows: invalid,
    rows: previewRows,
  };
}

export async function confirm(importToken: string, includeFlaggedRows: boolean): Promise<ExcelImportResultResponse> {
  const rows = retrieve(importToken);

  let success = 0;
  let skipped = 0;
  const failed: { rowNumber: number; reason: string }[] = [];

  for (const row of rows) {
    if (row.validationState === 'INVALID') {
      skipped++;
      continue;
    }
    if (row.validationState === 'FLAGGED' && !includeFlaggedRows) {
      skipped++;
      continue;
    }

    try {
      const person = await findOrCreateByName(row.personName, row.place);
      const status: RecordStatus = row.status ?? 'PENDING_REVIEW';
      const isOpenLike = status === 'OPEN' || status === 'PENDING_REVIEW';
      const now = new Date().toISOString();

      const record: Omit<FinancialRecordRow, 'id'> = {
        personId: person.id,
        parentRecordId: null,
        recordDate: row.recordDate!,
        originalAmount: row.originalAmount,
        principalOutstanding: isOpenLike ? row.principalAmount : 0,
        interestAmount: row.interestAmount,
        outstandingAmount: isOpenLike ? row.principalAmount : 0,
        status,
        place: row.place,
        notes: row.notes,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };
      await insert<Omit<FinancialRecordRow, 'id'>>(STORES.financialRecords, record);
      success++;
    } catch (ex) {
      failed.push({ rowNumber: row.rowNumber, reason: ex instanceof Error ? ex.message : String(ex) });
    }
  }

  stagingStore.delete(importToken);

  return {
    successCount: success,
    failedCount: failed.length,
    skippedCount: skipped,
    failedRows: failed,
  };
}
