import { getAll, STORES } from '@/db/database';
import { sumMoney } from '@/lib/decimal';
import { allActiveRaw } from './financialRecordService';
import type { PaymentRow } from './types';
import type { DashboardSummaryResponse, MonthlyInterestResponse, OutstandingByPersonResponse } from '@/types';
import { getByIdRaw as getPersonRaw } from './personService';

export async function getSummary(): Promise<DashboardSummaryResponse> {
  const records = await allActiveRaw();
  const payments = (await getAll<PaymentRow>(STORES.payments)).filter((p) => !p.deleted);

  return {
    totalOriginalAmount: sumMoney(records.map((r) => r.originalAmount)),
    totalOutstandingAmount: sumMoney(records.map((r) => r.outstandingAmount)),
    totalInterest: sumMoney(records.map((r) => r.interestAmount)),
    totalPaidAmount: sumMoney(payments.map((p) => p.paymentAmount)),
    openRecords: records.filter((r) => r.status === 'OPEN').length,
    closedRecords: records.filter((r) => r.status === 'CLOSED').length,
    renewedRecords: records.filter((r) => r.status === 'RENEWED').length,
    pendingReviewRecords: records.filter((r) => r.status === 'PENDING_REVIEW').length,
  };
}

/** Distinct years that have at least one record, newest first. */
export async function getAvailableYears(): Promise<number[]> {
  const records = await allActiveRaw();
  const years = new Set(records.map((r) => new Date(r.recordDate).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export async function getMonthlyInterest(year: number): Promise<MonthlyInterestResponse> {
  const records = await allActiveRaw();
  const byMonth = new Map<number, number>();

  for (const r of records) {
    // Group by Status Date when the record has one (set via Excel import); records without a
    // Status Date (e.g. created manually) fall back to the existing recordDate-based behaviour.
    const effectiveDate = r.statusDate || r.recordDate;
    const d = new Date(effectiveDate);
    if (d.getFullYear() !== year) continue;
    const month = d.getMonth() + 1;
    byMonth.set(month, (byMonth.get(month) ?? 0) + r.interestAmount);
  }

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    interestAmount: byMonth.get(i + 1) ?? 0,
  }));

  return {
    totalAmount: sumMoney(monthly.map((m) => m.interestAmount)),
    monthly,
  };
}

export async function getOutstandingByPerson(year: number): Promise<OutstandingByPersonResponse> {
  const records = await allActiveRaw();
  const byPerson = new Map<number, number>();

  for (const r of records) {
    if (new Date(r.recordDate).getFullYear() !== year) continue;
    byPerson.set(r.personId, (byPerson.get(r.personId) ?? 0) + r.outstandingAmount);
  }

  const entries = await Promise.all(
    Array.from(byPerson.entries()).map(async ([personId, outstandingAmount]) => {
      const person = await getPersonRaw(personId);
      return {
        personId,
        personName: person?.name ?? '(unknown)',
        outstandingAmount,
      };
    })
  );

  return {
    totalAmount: sumMoney(entries.map((e) => e.outstandingAmount)),
    byPerson: entries,
  };
}
