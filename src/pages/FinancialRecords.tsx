import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Filter, ArrowUp, ArrowDown, ListX } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Modal } from '@/components/common/Modal';
import { Field, TextInput, Select, TextArea } from '@/components/common/FormField';
import { StatusBadge } from '@/components/common/StatusBadge';
import { recordsApi, type FinancialRecordRequest } from '@/api/records';
import { personsApi } from '@/api/persons';
import { formatINR, formatDate } from '@/utils/format';
import type { FinancialRecordResponse, RecordStatus } from '@/types';
import { useToast } from '@/context/ToastContext';

const emptyForm: FinancialRecordRequest = {
  personId: 0,
  recordDate: new Date().toISOString().slice(0, 10),
  originalAmount: 0,
  interestAmount: 0,
  status: 'OPEN',
  place: '',
  notes: '',
};

const statusOptions: RecordStatus[] = ['OPEN', 'CLOSED', 'RENEWED', 'PARTIAL_PAYMENT', 'PENDING_REVIEW'];

export function FinancialRecords() {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<RecordStatus | ''>('');
  const [personId, setPersonId] = useState<number | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRecordResponse | null>(null);
  const [form, setForm] = useState<FinancialRecordRequest>(emptyForm);
  const [personName, setPersonName] = useState('');
  const [resolvingPerson, setResolvingPerson] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinancialRecordResponse | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const { data: persons } = useQuery({
    queryKey: ['persons', 'all-for-select'],
    queryFn: () => personsApi.search(undefined, 0, 200),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['records', page, status, personId, dateSort],
    queryFn: () =>
      recordsApi.search({
        page,
        size: 20,
        status: status || undefined,
        personId: personId || undefined,
        sort: `recordDate,${dateSort}`,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (req: FinancialRecordRequest) => recordsApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Record created.', 'success');
      closeModal();
    },
    onError: () => show('Could not create the record. Check the details and try again.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: FinancialRecordRequest }) => recordsApi.update(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Record updated.', 'success');
      closeModal();
    },
    onError: () => show('Could not update the record.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recordsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      show('Record removed.', 'success');
      setDeleteTarget(null);
    },
    onError: () => show('Could not remove this record.', 'error'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => recordsApi.removeAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPage(0);
      show('All records removed.', 'success');
      setDeleteAllOpen(false);
    },
    onError: () => show('Could not remove all records.', 'error'),
  });

  const openAddModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setPersonName('');
    setModalOpen(true);
  };

  const openEditModal = (record: FinancialRecordResponse) => {
    setEditing(record);
    setForm({
      personId: record.personId,
      recordDate: record.recordDate,
      originalAmount: record.originalAmount,
      interestAmount: record.interestAmount,
      status: record.status,
      place: record.place ?? '',
      notes: record.notes ?? '',
    });
    setPersonName(record.personName);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setPersonName('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = personName.trim();
    if (!trimmedName) {
      show('Enter a person for this record.', 'error');
      return;
    }

    // Original amount is required unless an interest amount has been entered —
    // in that case the record can be saved with the original amount left blank.
    if (!form.originalAmount && !form.interestAmount) {
      show('Enter an original amount, or an interest amount.', 'error');
      return;
    }

    let req = form;
    try {
      setResolvingPerson(true);
      // Same person-lookup-or-create rule the Excel import already uses, so typing an
      // existing name reuses that person instead of creating a duplicate.
      const person = await personsApi.findOrCreateByName(trimmedName, form.place || undefined);
      req = { ...form, personId: person.id };
    } catch {
      show('Could not resolve this person. Please try again.', 'error');
      return;
    } finally {
      setResolvingPerson(false);
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, req });
    } else {
      createMutation.mutate(req);
    }
  };

  return (
    <Layout title="Financial Records">
      <div className="flex items-center justify-between mb-6 gap-4">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-ink/20 text-ink-text/70 hover:bg-ink/5 transition-colors"
        >
          <Filter size={15} />
          Filters
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add record
          </button>
          <button
            onClick={() => setDeleteAllOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-status-outstanding/40 text-status-outstanding text-sm font-medium hover:bg-status-outstanding/10 transition-colors"
          >
            <ListX size={16} />
            Delete all
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-paper-card border border-ink/10 rounded-md">
          <div className="w-48">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as RecordStatus | '');
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
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
                <th className="px-5 py-3">
                  <button
                    onClick={() => {
                      setDateSort((s) => (s === 'asc' ? 'desc' : 'asc'));
                      setPage(0);
                    }}
                    className="flex items-center gap-1 hover:text-ink-text transition-colors"
                    title={`Sort ${dateSort === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    Date
                    {dateSort === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  </button>
                </th>
                <th className="px-5 py-3">Person</th>
                <th className="px-5 py-3 text-right">Original</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3 text-right">Interest</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Place</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((record) => (
                <tr key={record.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-5 py-3 text-ink-text/70">{formatDate(record.recordDate)}</td>
                  <td className="px-5 py-3 font-medium text-ink-text">{record.personName}</td>
                  <td className="px-5 py-3 text-right figure text-ink-text">
                    {formatINR(record.originalAmount)}
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
                  <td className="px-5 py-3 text-ink-text/70">{record.place || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Edit"
                        onClick={() => openEditModal(record)}
                        className="p-1.5 text-ink-text/50 hover:text-brass transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteTarget(record)}
                        className="p-1.5 text-ink-text/50 hover:text-status-outstanding transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.content.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-ink-text/40 text-sm">
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

      <Modal open={modalOpen} title={editing ? 'Edit record' : 'Add record'} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <Field label="Person">
            <TextInput
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Enter person's name"
              required
            />
          </Field>
          <Field label="Record date">
            <TextInput
              type="date"
              value={form.recordDate}
              onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
              required
            />
          </Field>
          <Field label="Original amount (₹)">
            <TextInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.originalAmount || ''}
              onChange={(e) => setForm({ ...form, originalAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Interest amount (₹)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.interestAmount || ''}
              onChange={(e) => setForm({ ...form, interestAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as RecordStatus })}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Place">
            <TextInput
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
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
              disabled={createMutation.isPending || updateMutation.isPending || resolvingPerson}
              className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {editing ? 'Save changes' : 'Create record'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this record?"
        message={`This removes the record for ${deleteTarget?.personName} dated ${deleteTarget ? formatDate(deleteTarget.recordDate) : ''}. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete all records?"
        message="This permanently removes every financial record in the system, including any hidden by the current filters. This cannot be undone."
        confirmLabel="Delete all"
        danger
        onConfirm={() => deleteAllMutation.mutate()}
        onCancel={() => setDeleteAllOpen(false)}
      />
    </Layout>
  );
}
