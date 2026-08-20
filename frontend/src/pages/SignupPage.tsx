import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isApiError } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, name, password);
      navigate('/epics');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-panel shadow-raised">
        <div className="h-[5px] bg-rail" />
        <div className="p-8">
          <div className="mb-6 flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <span className="inline-block h-6 w-6 rounded-md bg-rail" />
            KS<span className="rail-text">Tasks</span>
          </div>
          <h1 className="mb-1 font-display text-[19px] font-semibold">Create an account</h1>
          <p className="mb-5 text-sm text-ink2">Any teammate can sign up — no invite needed.</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Name
              <Input className="mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Email
              <Input className="mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Password
              <Input
                className="mt-1 w-full"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button variant="primary" type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink2">
            Already have an account? <Link to="/login" className="font-semibold text-primary">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
