import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEpic } from '../hooks/useEpics';
import { useAddEpicMember, useEpicMembers, useLeaveEpic, useRemoveEpicMember } from '../hooks/useEpicMembers';
import { useUsers } from '../hooks/useUsers';
import { useAuth, isApiError } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Topbar } from '../components/layout/Topbar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Icon } from '../components/ui/Icon';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function EpicMembersPage() {
  const { epicId } = useParams<{ epicId: string }>();
  const { data: epic } = useEpic(epicId);
  const { data: members } = useEpicMembers(epicId);
  const { data: allUsers } = useUsers();
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const addMember = useAddEpicMember(epicId);
  const removeMember = useRemoveEpicMember(epicId);
  const leaveEpic = useLeaveEpic(epicId);

  const [selectedUserId, setSelectedUserId] = useState('');

  if (!epicId) return null;

  const memberIds = new Set(members?.map((m) => m.userId));
  const candidates = allUsers?.filter((u) => !memberIds.has(u.id)) ?? [];

  async function handleAdd() {
    if (!selectedUserId) return;
    try {
      await addMember.mutateAsync(selectedUserId);
      setSelectedUserId('');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not add member', 'error');
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from this epic? They'll lose access to it.`)) return;
    try {
      await removeMember.mutateAsync(userId);
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not remove member', 'error');
    }
  }

  async function handleLeave() {
    if (!confirm('Leave this epic? You can always join it again later.')) return;
    try {
      await leaveEpic.mutateAsync();
      toast.show('Left epic', 'success');
      navigate('/epics');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not leave epic', 'error');
    }
  }

  return (
    <div>
      <Topbar title="Members" subtitle={epic ? `${epic.ticketId} · ${epic.name}` : undefined} />
      <p className="mb-4 max-w-2xl text-[14.5px] text-ink2">
        All members can see this epic in the list and join it themselves. Admins can also add or remove
        members directly.
      </p>

      <div className="max-w-[560px] rounded-lg border border-line bg-panel shadow-card">
        {members?.map((m) => (
          <div key={m.userId} className="flex items-center gap-3.5 border-b border-line px-4 py-3.5 last:border-b-0">
            <Avatar name={m.name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-semibold text-ink">{m.name}</div>
              <div className="truncate text-[13.5px] text-ink2">
                {m.email} · added {formatDate(m.addedAt)}
              </div>
            </div>
            {m.userId === user?.id && (
              <button onClick={handleLeave} className="rounded-sm px-2 py-1 text-[13.5px] text-ink2 hover:bg-danger-soft hover:text-danger">
                Leave
              </button>
            )}
            {isAdmin && m.userId !== user?.id && (
              <button onClick={() => handleRemove(m.userId, m.name)} className="rounded-sm px-2 py-1 text-[13.5px] text-ink2 hover:bg-danger-soft hover:text-danger">
                Remove
              </button>
            )}
          </div>
        ))}

        {members && members.length === 0 && <p className="p-4 text-[14.5px] text-ink2">No members yet.</p>}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <SearchableSelect
              value={selectedUserId}
              onChange={setSelectedUserId}
              options={candidates.map((u) => ({ id: u.id, label: `${u.name} (${u.email})` }))}
              placeholder="Select a person to add…"
              className="w-64"
            />
            <Button variant="primary" onClick={handleAdd} disabled={!selectedUserId || addMember.isPending} className="inline-flex items-center gap-1.5">
              <Icon name="plus" size={14} />
              Add member
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
