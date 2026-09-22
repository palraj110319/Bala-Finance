interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
      <div className="bg-paper-card rounded-md shadow-xl w-full max-w-sm p-6 border border-ink/10">
        <h3 className="font-display text-lg font-semibold text-ink-text mb-2">{title}</h3>
        <p className="text-sm text-ink-text/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded text-ink-text/70 hover:bg-ink/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded font-medium text-white transition-colors ${
              danger ? 'bg-status-outstanding hover:opacity-90' : 'bg-ink hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
