import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth, isApiError } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function NameChangeForm() {
  const { user, updateName } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      await updateName(trimmed);
      toast.show('Name updated', 'success');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not update name');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
        Name
        <Input
          className="mt-1 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          required
        />
      </label>
      {error && <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <Button variant="primary" type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  );
}
