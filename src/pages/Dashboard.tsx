import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { Layout } from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Select } from '@/components/common/FormField';
import { dashboardApi } from '@/api/dashboard';
import { formatINR } from '@/utils/format';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'paid' | 'outstanding' | 'renewal' | 'info';
}) {
  const accentClass = accent
    ? {
        paid: 'text-status-paid',
        outstanding: 'text-status-outstanding',
        renewal: 'text-status-renewal',
        info: 'text-status-info',
      }[accent]
    : 'text-ink-text';

  return (
    <div className="bg-paper-card border border-ink/10 rounded-md p-5">
      <div className="text-xs font-medium text-ink-text/50 mb-2">{label}</div>
      <div className={`figure text-2xl font-semibold ${accentClass}`}>{value}</div>
    </div>
  );
}

export function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: availableYears, isLoading: loadingYears } = useQuery({
    queryKey: ['dashboard', 'years'],
    queryFn: dashboardApi.getAvailableYears,
  });

  const [interestYear, setInterestYear] = useState<number | null>(null);
  const [personYear, setPersonYear] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears?.[0] ?? currentYear;
  const yearOptions = availableYears && availableYears.length ? availableYears : [currentYear];

  const activeInterestYear = interestYear ?? defaultYear;
  const activePersonYear = personYear ?? defaultYear;

  const { data: monthlyInterest, isLoading: loadingInterest } = useQuery({
    queryKey: ['dashboard', 'monthlyInterest', activeInterestYear],
    queryFn: () => dashboardApi.getMonthlyInterest(activeInterestYear),
    enabled: !loadingYears,
  });

  const { data: outstandingByPerson, isLoading: loadingOutstanding } = useQuery({
    queryKey: ['dashboard', 'outstandingByPerson', activePersonYear],
    queryFn: () => dashboardApi.getOutstandingByPerson(activePersonYear),
    enabled: !loadingYears,
  });

  if (loadingSummary || loadingYears) {
    return (
      <Layout title="Dashboard">
        <LoadingIndicator label="Loading dashboard…" />
      </Layout>
    );
  }

  const monthlyInterestData = MONTH_LABELS.map((month, i) => ({
    month,
    interestAmount: monthlyInterest?.monthly.find((m) => m.month === i + 1)?.interestAmount ?? 0,
  }));

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total original amount" value={formatINR(summary?.totalOriginalAmount)} />
        <SummaryCard
          label="Total outstanding"
          value={formatINR(summary?.totalOutstandingAmount)}
          accent="outstanding"
        />
        <SummaryCard label="Total interest" value={formatINR(summary?.totalInterest)} accent="renewal" />
        <SummaryCard label="Total paid" value={formatINR(summary?.totalPaidAmount)} accent="paid" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Open records" value={String(summary?.openRecords ?? 0)} accent="outstanding" />
        <SummaryCard label="Closed records" value={String(summary?.closedRecords ?? 0)} accent="paid" />
        <SummaryCard label="Renewed records" value={String(summary?.renewedRecords ?? 0)} accent="renewal" />
        <SummaryCard
          label="Needs review"
          value={String(summary?.pendingReviewRecords ?? 0)}
          accent="renewal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-paper-card border border-ink/10 rounded-md p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-base font-semibold text-ink-text">
              Outstanding by person
            </h3>
            <div className="w-28">
              <Select
                value={activePersonYear}
                onChange={(e) => setPersonYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="text-xs text-ink-text/50 mb-3">
            Total amount: <span className="figure font-medium text-ink-text">{formatINR(outstandingByPerson?.totalAmount)}</span>
          </div>
          {loadingOutstanding ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-ink-text/50">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={outstandingByPerson?.byPerson ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#C9C2AE" opacity={0.4} />
                <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis
                  type="category"
                  dataKey="personName"
                  width={90}
                  tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans' }}
                />
                <Tooltip formatter={(value: number) => formatINR(value)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="outstandingAmount" fill="#A83A32" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-paper-card border border-ink/10 rounded-md p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-base font-semibold text-ink-text">
              Monthly interest amount
            </h3>
            <div className="w-28">
              <Select
                value={activeInterestYear}
                onChange={(e) => setInterestYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="text-xs text-ink-text/50 mb-3">
            Total amount: <span className="figure font-medium text-ink-text">{formatINR(monthlyInterest?.totalAmount)}</span>
          </div>
          {loadingInterest ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-ink-text/50">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyInterestData} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9C2AE" opacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  formatter={(value: number) => formatINR(value)}
                  contentStyle={{ fontSize: 12, fontFamily: 'IBM Plex Sans' }}
                />
                <Bar dataKey="interestAmount" name="Interest" fill="#B08D57" radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="interestAmount"
                    position="top"
                    formatter={(value: number) => (value ? formatINR(value) : '')}
                    style={{ fontSize: 9, fontFamily: 'IBM Plex Mono', fill: '#4A4433' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}
