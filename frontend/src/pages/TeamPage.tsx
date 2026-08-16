import { Topbar } from '../components/layout/Topbar';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { useUpdateUserRole, useUsers } from '../hooks/useUsers';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import type { UserRole, UserSummary } from '../types';

function TeamRow({ member }: { member: UserSummary }) {
  const { user: currentUser } = useAuth();
  const updateRole = useUpdateUserRole();
  const toast = useToast();

  async function changeRole(role: UserRole) {
    if (role === member.role) return;
    try {
      await updateRole.mutateAsync({ id: member.id, role });
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not update role', 'error');
    }
  }

  return (
    <div className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
      <Avatar name={member.name} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-ink">
          {member.name}
          {member.id === currentUser?.id && <span className="ml-2 text-[13px] font-normal text-ink2">(you)</span>}
        </div>
        <div className="truncate text-[13.5px] text-ink2">{member.email}</div>
      </div>
      <Select
        value={member.role}
        onChange={(e) => changeRole(e.target.value as UserRole)}
        disabled={updateRole.isPending}
        className="w-36"
      >
        <option value="ADMIN">Admin</option>
        <option value="MEMBER">Member</option>
      </Select>
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

      <div className="rounded-[10px] border border-line bg-panel">
        {users?.map((u) => (
          <TeamRow key={u.id} member={u} />
        ))}
      </div>
    </div>
  );
}
