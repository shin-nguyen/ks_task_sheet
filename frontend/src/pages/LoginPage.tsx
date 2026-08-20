import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isApiError } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('alice@team.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/epics');
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Login failed');
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
          <h1 className="mb-1 font-display text-[19px] font-semibold">Welcome back</h1>
          <p className="mb-5 text-sm text-ink2">Sheet-based feature &amp; task tracking for small teams.</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Email
              <Input className="mt-1 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink2">
              Password
              <Input className="mt-1 w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Button variant="primary" type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink2">
            No account? <Link to="/signup" className="font-semibold text-primary">Sign up</Link>
          </p>
          <p className="mt-3 text-center text-xs text-ink3">
            Demo: alice@team.dev / ben@team.dev / cara@team.dev / dan@team.dev — password: password123
          </p>
        </div>
      </div>
    </div>
  );
}
