import { useState, type FormEvent } from 'react';
import { LogOut, ShieldCheck, User, KeyRound } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Field, TextInput } from '@/components/common/FormField';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import * as authService from '@/services/authService';

export function Settings() {
  const { username, role, logout } = useAuth();
  const { show } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!username) return;
    if (newPassword.length < 8) {
      show('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      show('New password and confirmation do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(username, currentPassword, newPassword);
      show('Password updated.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update the password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Settings">
      <div className="max-w-xl bg-paper-card border border-ink/10 rounded-md divide-y divide-ink/10">
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-text mb-4">Account</h2>
          <div className="flex items-center gap-3 mb-3 text-sm">
            <User size={16} className="text-ink-text/40" />
            <span className="text-ink-text/60 w-28">Signed in as</span>
            <span className="font-medium text-ink-text">{username ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck size={16} className="text-ink-text/40" />
            <span className="text-ink-text/60 w-28">Role</span>
            <span className="font-medium text-ink-text">{role ?? '—'}</span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-text mb-2 flex items-center gap-2">
            <KeyRound size={16} className="text-ink-text/40" />
            Change password
          </h2>
          <p className="text-sm text-ink-text/60 mb-4">
            This app has no server, so this is a local-only account stored in this browser. Change the
            default password on first use.
          </p>
          <form onSubmit={handleChangePassword}>
            <Field label="Current password">
              <TextInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="New password (min. 8 characters)">
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirm new password">
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-ink text-paper font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>

        <div className="p-6">
          <h2 className="font-display text-lg font-semibold text-ink-text mb-2">Session</h2>
          <p className="text-sm text-ink-text/60 mb-4">
            Sign out of Bala Finance on this device.
          </p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-ink text-paper text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </Layout>
  );
}
