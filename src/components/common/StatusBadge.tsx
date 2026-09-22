import type { RecordStatus } from '@/types';

const statusConfig: Record<RecordStatus, { label: string; text: string; bg: string }> = {
  OPEN: { label: 'Open', text: 'text-status-outstanding', bg: 'bg-status-outstanding-bg' },
  CLOSED: { label: 'Closed', text: 'text-status-paid', bg: 'bg-status-paid-bg' },
  RENEWED: { label: 'Renewed', text: 'text-status-renewal', bg: 'bg-status-renewal-bg' },
  PARTIAL_PAYMENT: { label: 'Partial payment', text: 'text-status-info', bg: 'bg-status-info-bg' },
  PENDING_REVIEW: { label: 'Needs review', text: 'text-status-renewal', bg: 'bg-status-renewal-bg' },
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${config.text} ${config.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
