import { useNavigate } from 'react-router-dom';
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm';
import { useAuth } from '../context/AuthContext';

export function ForcePasswordChangePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-panel shadow-raised">
        <div className="h-[5px] bg-rail" />
        <div className="p-8">
          <div className="mb-6 flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <span className="inline-block h-6 w-6 rounded-md bg-rail" />
            KS<span className="rail-text">Tasks</span>
          </div>
          <h1 className="mb-1 font-display text-[19px] font-semibold">Set a new password</h1>
          <p className="mb-5 text-sm text-ink2">
            An admin reset your password. Enter it below as your current password, then choose a new one to
            continue.
          </p>
          <PasswordChangeForm submitLabel="Continue" onSuccess={() => navigate('/epics', { replace: true })} />
          <p className="mt-5 text-center text-sm text-ink2">
            <button onClick={() => logout()} className="font-semibold text-primary hover:underline">
              Log out instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
