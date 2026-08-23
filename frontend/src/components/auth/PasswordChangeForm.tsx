import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth, isApiError } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function PasswordChangeForm({
  onSuccess,
  submitLabel = 'Save password',
}: {
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.show('Password updated', 'success');
      onSuccess?.();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
        Current password
        <Input
          className="mt-1 w-full"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
        New password
        <Input
          className="mt-1 w-full"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
        Confirm new password
        <Input
          className="mt-1 w-full"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </label>
      {error && <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <Button variant="primary" type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
