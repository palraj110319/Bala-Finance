import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAll, STORES } from '@/db/database';
import { allActiveRaw } from './financialRecordService';
import { getByIdRaw as getPersonRaw } from './personService';
import type { PaymentRow } from './types';
import type { ReportFormat, ReportType } from '@/api/reports';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function plain(n: number): string {
  return n.toFixed(2);
}

async function activePayments(): Promise<PaymentRow[]> {
  return (await getAll<PaymentRow>(STORES.payments)).filter((p) => !p.deleted);
}

async function personName(personId: number): Promise<string> {
  const p = await getPersonRaw(personId);
  return p?.name ?? '(unknown)';
}

async function monthlySummaryRows(): Promise<[string, number, number, number][]> {
  const records = await allActiveRaw();
  const byMonth = new Map<string, [number, number, number]>();

  for (const r of records) {
    const d = new Date(r.recordDate);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(ym) ?? [0, 0, 0];
    byMonth.set(ym, [cur[0] + r.originalAmount, cur[1] + r.outstandingAmount, cur[2] + r.interestAmount]);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([ym, [orig, out, int]]) => [ym, orig, out, int]);
}

async function buildReport(type: ReportType): Promise<{ headers: string[]; rows: string[][] }> {
  switch (type) {
    case 'OUTSTANDING': {
      const headers = ['Person', 'Record Date', 'Original Amt', 'Outstanding Amt', 'Status', 'Place'];
      const records = (await allActiveRaw()).filter((r) => r.outstandingAmount > 0);
      const rows = await Promise.all(
        records.map(async (r) => [
          await personName(r.personId),
          fmtDate(r.recordDate),
          plain(r.originalAmount),
          plain(r.outstandingAmount),
          r.status,
          r.place ?? '',
        ])
      );
      return { headers, rows };
    }
    case 'PERSON_WISE': {
      const headers = ['Person', 'Total Original', 'Total Outstanding', 'Total Interest', 'Record Count'];
      const records = await allActiveRaw();
      const byPerson = new Map<number, { original: number; outstanding: number; interest: number; count: number }>();
      for (const r of records) {
        const cur = byPerson.get(r.personId) ?? { original: 0, outstanding: 0, interest: 0, count: 0 };
        cur.original += r.originalAmount;
        cur.outstanding += r.outstandingAmount;
        cur.interest += r.interestAmount;
        cur.count += 1;
        byPerson.set(r.personId, cur);
      }
      const rows = await Promise.all(
        Array.from(byPerson.entries()).map(async ([personId, agg]) => [
          await personName(personId),
          plain(agg.original),
          plain(agg.outstanding),
          plain(agg.interest),
          String(agg.count),
        ])
      );
      return { headers, rows };
    }
    case 'INTEREST': {
      const headers = ['Person', 'Record Date', 'Interest Amt', 'Status'];
      const records = await allActiveRaw();
      const rows = await Promise.all(
        records.map(async (r) => [await personName(r.personId), fmtDate(r.recordDate), plain(r.interestAmount), r.status])
      );
      return { headers, rows };
    }
    case 'PAYMENT': {
      const headers = ['Person', 'Payment Date', 'Amount', 'Principal Paid', 'Interest Paid', 'Mode'];
      const payments = await activePayments();
      const rows = await Promise.all(
        payments.map(async (p) => [
          await personName(p.personId),
          fmtDate(p.paymentDate),
          plain(p.paymentAmount),
          plain(p.principalPaid),
          plain(p.interestPaid),
          p.paymentMode ?? '',
        ])
      );
      return { headers, rows };
    }
    case 'MONTHLY': {
      const headers = ['Month', 'Original Amt', 'Outstanding Amt', 'Interest Amt'];
      const monthly = await monthlySummaryRows();
      const rows = monthly.map(([ym, orig, out, int]) => [ym, plain(orig), plain(out), plain(int)]);
      return { headers, rows };
    }
    case 'YEARLY': {
      const headers = ['Year', 'Original Amt', 'Outstanding Amt', 'Interest Amt'];
      const monthly = await monthlySummaryRows();
      const byYear = new Map<string, [number, number, number]>();
      for (const [ym, orig, out, int] of monthly) {
        const year = ym.substring(0, 4);
        const cur = byYear.get(year) ?? [0, 0, 0];
        byYear.set(year, [cur[0] + orig, cur[1] + out, cur[2] + int]);
      }
      const rows = Array.from(byYear.entries()).map(([year, [orig, out, int]]) => [
        year,
        plain(orig),
        plain(out),
        plain(int),
      ]);
      return { headers, rows };
    }
    default:
      throw new Error(`Unsupported report type: ${type}`);
  }
}

function toXlsxBlob(headers: string[], rows: string[][], type: ReportType): Blob {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type);
  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function toPdfBlob(headers: string[], rows: string[][], type: ReportType): Blob {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`${type.replace(/_/g, ' ')} REPORT`, 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated: ${fmtDate(new Date().toISOString())}`, 14, 25);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fontStyle: 'bold' },
  });
  return doc.output('blob');
}

export async function generateReport(type: ReportType, format: ReportFormat): Promise<Blob> {
  const { headers, rows } = await buildReport(type);
  return format === 'XLSX' ? toXlsxBlob(headers, rows, type) : toPdfBlob(headers, rows, type);
}

export function fileName(type: ReportType, format: ReportFormat): string {
  const ext = format === 'XLSX' ? 'xlsx' : 'pdf';
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${type.toLowerCase()}-report-${date}.${ext}`;
}
