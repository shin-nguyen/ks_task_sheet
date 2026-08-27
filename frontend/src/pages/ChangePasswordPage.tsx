import { Topbar } from '../components/layout/Topbar';
import { NameChangeForm } from '../components/auth/NameChangeForm';
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm';

export function ChangePasswordPage() {
  return (
    <div>
      <Topbar title="Account" />
      <div className="flex max-w-sm flex-col gap-6">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-card">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Your name</h2>
          <NameChangeForm />
        </div>
        <div className="rounded-lg border border-line bg-panel p-6 shadow-card">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">Change password</h2>
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}
