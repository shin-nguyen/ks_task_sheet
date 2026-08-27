import { useState } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAdminResetPassword, useDeleteUser, useUpdateUserRole, useUsers } from '../hooks/useUsers';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import type { UserRole, UserSummary } from '../types';

function ResetPasswordModal({ member, onClose }: { member: UserSummary; onClose: () => void }) {
  const resetPassword = useAdminResetPassword();
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const valid = newPassword.length >= 6 && newPassword === confirmPassword;

  async function submit() {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: member.id, newPassword });
      toast.show(`Password reset for ${member.name}`, 'success');
      onClose();
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not reset password', 'error');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset password for ${member.name}`}
      width={420}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!valid || resetPassword.isPending}>
            Reset password
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] text-ink2">
          Sets a new password for this user. They'll be required to change it the next time they log in.
        </p>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">New password</label>
          <Input
            autoFocus
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-ink2">Confirm new password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            className="w-full"
          />
        </div>
        {error && <p className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function TeamRow({ member }: { member: UserSummary }) {
  const { user: currentUser } = useAuth();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const toast = useToast();
  const [resetting, setResetting] = useState(false);
  const isSelf = member.id === currentUser?.id;

  async function changeRole(role: UserRole) {
    if (role === member.role) return;
    try {
      await updateRole.mutateAsync({ id: member.id, role });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update role', 'error');
    }
  }

  async function deleteMember() {
    if (!confirm(`Delete ${member.name}? This can't be undone.`)) return;
    try {
      await deleteUser.mutateAsync(member.id);
      toast.show(`${member.name} deleted`, 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not delete user', 'error');
    }
  }

  return (
    <div className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
      <Avatar name={member.name} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-ink">
          {member.name}
          {isSelf && <span className="ml-2 text-[13px] font-normal text-ink2">(you)</span>}
        </div>
        <div className="truncate text-[13.5px] text-ink2">{member.email}</div>
      </div>
      <Button onClick={() => setResetting(true)}>Reset password</Button>
      <Select
        value={member.role}
        onChange={(e) => changeRole(e.target.value as UserRole)}
        disabled={updateRole.isPending}
        className="w-36"
      >
        <option value="ADMIN">Admin</option>
        <option value="MEMBER">Member</option>
      </Select>
      {!isSelf && (
        <Button variant="danger" onClick={deleteMember} disabled={deleteUser.isPending}>
          Delete
        </Button>
      )}
      {resetting && <ResetPasswordModal member={member} onClose={() => setResetting(false)} />}
    </div>
  );
}

export function TeamPage() {
  const { data: users, isLoading } = useUsers();

  return (
    <div>
      <Topbar title="Team" subtitle="workspace-wide" />
      <p className="mb-4 max-w-2xl text-[14.5px] text-ink2">
        Everyone with an account here. Admins can configure statuses, manage epic membership, and delete epics.
        Members can work on any epic they've been added to.
      </p>

      {isLoading && <p className="text-[14.5px] text-ink2">Loading…</p>}

      <div className="rounded-lg border border-line bg-panel shadow-card">
        {users?.map((u) => (
          <TeamRow key={u.id} member={u} />
        ))}
      </div>
    </div>
  );
}
