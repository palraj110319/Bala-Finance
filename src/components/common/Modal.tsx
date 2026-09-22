import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4">
      <div className="bg-paper-card rounded-md shadow-xl w-full max-w-lg border border-ink/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          <h3 className="font-display text-lg font-semibold text-ink-text">{title}</h3>
          <button onClick={onClose} className="text-ink-text/50 hover:text-ink-text transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
