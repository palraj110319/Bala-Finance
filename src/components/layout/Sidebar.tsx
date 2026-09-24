import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Percent,
  BarChart3,
  Upload,
  Settings,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  enabled: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/records', label: 'Financial Records', icon: FileText, enabled: true },
  { to: '/interest', label: 'Interest', icon: Percent, enabled: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, enabled: true },
  { to: '/import', label: 'Excel Import', icon: Upload, enabled: true },
  { to: '/settings', label: 'Settings', icon: Settings, enabled: true },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-ink text-paper flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="font-display text-xl font-semibold tracking-tight">Bala Finance</div>
        <div className="text-xs text-paper/50 mt-0.5">Personal ledger</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 px-6 py-2.5 text-sm text-paper/30 cursor-not-allowed"
                title="Coming in a later phase"
              >
                <Icon size={17} strokeWidth={1.75} />
                {item.label}
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-paper font-medium border-l-2 border-brass'
                    : 'text-paper/70 hover:bg-white/5 hover:text-paper border-l-2 border-transparent'
                }`
              }
            >
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
