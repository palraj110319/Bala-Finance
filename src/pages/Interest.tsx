import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Percent, Filter } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Modal } from '@/components/common/Modal';
import { Field, TextInput, Select } from '@/components/common/FormField';
import { StatusBadge } from '@/components/common/StatusBadge';
import { recordsApi } from '@/api/records';
import { personsApi } from '@/api/persons';
import { interestApi, type InterestRequest } from '@/api/interest';
import { formatINR, formatDate } from '@/utils/format';
import type { FinancialRecordResponse } from '@/types';
import { useToast } from '@/context/ToastContext';

const emptyForm: InterestRequest = { interestRate: undefined, interestAmount: 0, interestPaid: 0 };

export function Interest() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [page, setPage] = useState(0);
  const [personId, setPersonId] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [managing, setManaging] = useState<FinancialRecordResponse | null>(null);
  const [form, setForm] = useState<InterestRequest>(emptyForm);
  const [loadingInterest, setLoadingInterest] = useState(false);

  const { data: persons } = useQuery({
    queryKey: ['persons', 'all-for-select'],
    queryFn: () => personsApi.search(undefined, 0, 200),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['records', 'for-interest', page, personId],
    queryFn: () =>
      recordsApi.search({ page, size: 20, personId: personId || undefined, sort: 'recordDate,desc' }),
  });

  const upsertMutation = useMutation({
    mutationFn: ({ recordId, req }: { recordId: number; req: InterestRequest }) =>
      interestApi.upsert(recordId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Interest details saved.', 'success');
      closeModal();
    },
    onError: () => show('Could not save interest details.', 'error'),
  });

  const openManage = async (record: FinancialRecordResponse) => {
    setManaging(record);
    setLoadingInterest(true);
    try {
      const existing = await interestApi.getByRecordId(record.id);
      setForm({
        interestRate: existing.interestRate ?? undefined,
        interestAmount: existing.interestAmount,
        interestPaid: existing.interestPaid,
      });
    } catch {
      // No interest record yet — start from the record's own interest amount.
      setForm({ interestRate: undefined, interestAmount: record.interestAmount, interestPaid: 0 });
    } finally {
      setLoadingInterest(false);
    }
  };

  const closeModal = () => {
    setManaging(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!managing) return;
    upsertMutation.mutate({ recordId: managing.id, req: form });
  };

  return (
    <Layout title="Interest">
      <div className="flex items-center justify-between mb-6 gap-4">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-ink/20 text-ink-text/70 hover:bg-ink/5 transition-colors"
        >
          <Filter size={15} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-paper-card border border-ink/10 rounded-md">
          <div className="w-56">
            <Select
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value ? Number(e.target.value) : '');
                setPage(0);
              }}
            >
              <option value="">All persons</option>
              {persons?.content.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <div className="bg-paper-card border border-ink/10 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs font-medium text-ink-text/50">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3 text-right">Principal</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3 text-right">Interest</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((record) => (
                <tr key={record.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 text-ink-text/70">{formatDate(record.recordDate)}</td>
                  <td className="px-5 py-3 font-medium text-ink-text">{record.personName}</td>
                  <td className="px-5 py-3 text-right figure text-ink-text">
                    {formatINR(record.principalOutstanding)}
                  </td>
                  <td className="px-5 py-3 text-right figure text-status-outstanding">
                    {formatINR(record.outstandingAmount)}
                  </td>
                  <td className="px-5 py-3 text-right figure text-ink-text/70">
                    {formatINR(record.interestAmount)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Manage interest"
                        onClick={() => openManage(record)}
                        className="p-1.5 text-ink-text/50 hover:text-brass transition-colors"
                      >
                        <Percent size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.content.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-text/40 text-sm">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-ink/10 text-xs text-ink-text/50">
              <span>
                Page {data.pageNumber + 1} of {data.totalPages} · {data.totalElements} total
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-ink/15 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-ink/15 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!managing}
        title={managing ? `Interest · Record #${managing.id} (${managing.personName})` : 'Interest'}
        onClose={closeModal}
      >
        {loadingInterest ? (
          <LoadingIndicator />
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Interest rate (% p.a., optional)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.interestRate ?? ''}
                onChange={(e) =>
                  setForm({ ...form, interestRate: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
            <Field label="Interest amount (₹)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.interestAmount || ''}
                onChange={(e) => setForm({ ...form, interestAmount: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Interest paid (₹)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.interestPaid || ''}
                onChange={(e) => setForm({ ...form, interestPaid: Number(e.target.value) })}
              />
            </Field>
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded text-ink-text/70 hover:bg-ink/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={upsertMutation.isPending}
                className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
