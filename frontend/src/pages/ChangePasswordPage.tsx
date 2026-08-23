import { Topbar } from '../components/layout/Topbar';
import { PasswordChangeForm } from '../components/auth/PasswordChangeForm';

export function ChangePasswordPage() {
  return (
    <div>
      <Topbar title="Change password" />
      <div className="max-w-sm rounded-lg border border-line bg-panel p-6 shadow-card">
        <PasswordChangeForm />
      </div>
    </div>
  );
}
