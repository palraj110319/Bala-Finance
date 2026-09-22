import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium text-ink-text/60 mb-1.5">{label}</span>
      {children}
      {error && <span className="block text-xs text-status-outstanding mt-1">{error}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm rounded border border-ink/20 bg-white text-ink-text focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm rounded border border-ink/20 bg-white text-ink-text focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 text-sm rounded border border-ink/20 bg-white text-ink-text focus:outline-none focus:ring-2 focus:ring-brass/40 focus:border-brass ${props.className ?? ''}`}
    />
  );
}
