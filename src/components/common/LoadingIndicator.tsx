export function LoadingIndicator({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-text/50 text-sm">
      <span className="w-4 h-4 border-2 border-ink-text/20 border-t-brass rounded-full animate-spin" />
      {label}
    </div>
  );
}
