import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Link2, Filter } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Modal } from '@/components/common/Modal';
import { Field, TextInput, TextArea, Select } from '@/components/common/FormField';
import { StatusBadge } from '@/components/common/StatusBadge';
import { recordsApi } from '@/api/records';
import { personsApi } from '@/api/persons';
import { renewalsApi, type RenewalRequest } from '@/api/renewals';
import { formatINR, formatDate } from '@/utils/format';
import type { FinancialRecordResponse } from '@/types';
import { useToast } from '@/context/ToastContext';

const emptyForm: RenewalRequest = {
  renewalDate: new Date().toISOString().slice(0, 10),
  newPrincipalAmount: 0,
  newInterestAmount: 0,
  notes: '',
};

export function Renewals() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [page, setPage] = useState(0);
  const [personId, setPersonId] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [renewing, setRenewing] = useState<FinancialRecordResponse | null>(null);
  const [form, setForm] = useState<RenewalRequest>(emptyForm);
  const [chainFor, setChainFor] = useState<FinancialRecordResponse | null>(null);
  const [chain, setChain] = useState<FinancialRecordResponse[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  const { data: persons } = useQuery({
    queryKey: ['persons', 'all-for-select'],
    queryFn: () => personsApi.search(undefined, 0, 200),
  });

  // Renewals apply to records still carrying a balance.
  const { data, isLoading } = useQuery({
    queryKey: ['records', 'for-renewal', page, personId],
    queryFn: () =>
      recordsApi.search({ page, size: 20, personId: personId || undefined, sort: 'recordDate,desc' }),
  });

  const renewMutation = useMutation({
    mutationFn: ({ recordId, req }: { recordId: number; req: RenewalRequest }) =>
      renewalsApi.renew(recordId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Record renewed.', 'success');
      closeModal();
    },
    onError: () => show('Could not renew this record. Check the details and try again.', 'error'),
  });

  const openRenew = (record: FinancialRecordResponse) => {
    setRenewing(record);
    setForm({
      renewalDate: new Date().toISOString().slice(0, 10),
      newPrincipalAmount: record.outstandingAmount,
      newInterestAmount: 0,
      notes: '',
    });
  };

  const closeModal = () => {
    setRenewing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!renewing) return;
    renewMutation.mutate({ recordId: renewing.id, req: form });
  };

  const openChain = async (record: FinancialRecordResponse) => {
    setChainFor(record);
    setLoadingChain(true);
    try {
      const result = await renewalsApi.getChain(record.id);
      setChain(result);
    } catch {
      setChain([]);
      show('Could not load the renewal chain for this record.', 'error');
    } finally {
      setLoadingChain(false);
    }
  };

  return (
    <Layout title="Renewals">
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
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((record) => (
                <tr key={record.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 text-ink-text/70">{formatDate(record.recordDate)}</td>
                  <td className="px-5 py-3 font-medium text-ink-text">{record.personName}</td>
                  <td className="px-5 py-3 text-right figure text-status-outstanding">
                    {formatINR(record.outstandingAmount)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="View renewal chain"
                        onClick={() => openChain(record)}
                        className="p-1.5 text-ink-text/50 hover:text-status-info transition-colors"
                      >
                        <Link2 size={16} />
                      </button>
                      {(record.status === 'OPEN' || record.status === 'PARTIAL_PAYMENT') && (
                        <button
                          title="Renew"
                          onClick={() => openRenew(record)}
                          className="p-1.5 text-ink-text/50 hover:text-status-renewal transition-colors"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.content.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-text/40 text-sm">
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
        open={!!renewing}
        title={renewing ? `Renew record #${renewing.id} (${renewing.personName})` : 'Renew'}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <Field label="Renewal date">
            <TextInput
              type="date"
              value={form.renewalDate}
              onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
              required
            />
          </Field>
          <Field label="New principal amount (₹)">
            <TextInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.newPrincipalAmount || ''}
              onChange={(e) => setForm({ ...form, newPrincipalAmount: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="New interest amount (₹)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.newInterestAmount ?? ''}
              onChange={(e) => setForm({ ...form, newInterestAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Notes">
            <TextArea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              disabled={renewMutation.isPending}
              className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Renew record
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!chainFor}
        title={chainFor ? `Renewal chain · ${chainFor.personName}` : 'Renewal chain'}
        onClose={() => setChainFor(null)}
      >
        {loadingChain ? (
          <LoadingIndicator />
        ) : chain.length === 0 ? (
          <p className="text-sm text-ink-text/50 py-6 text-center">
            No renewal history for this record.
          </p>
        ) : (
          <ul className="space-y-2">
            {chain.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-4 py-3 rounded border border-ink/10 text-sm"
              >
                <div>
                  <span className="font-medium text-ink-text">#{r.id}</span>{' '}
                  <span className="text-ink-text/60">{formatDate(r.recordDate)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="figure text-ink-text/70">{formatINR(r.originalAmount)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </Layout>
  );
}
