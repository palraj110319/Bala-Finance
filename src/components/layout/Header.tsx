import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header({ title }: { title: string }) {
  const { username, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-ink/15 bg-paper-card">
      <h1 className="font-display text-2xl font-semibold text-ink-text tracking-tight">{title}</h1>
      <div className="flex items-center gap-4 text-sm text-ink-text/70">
        {username && <span>{username}</span>}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-ink-text/60 hover:text-ink-text transition-colors"
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </header>
  );
}
