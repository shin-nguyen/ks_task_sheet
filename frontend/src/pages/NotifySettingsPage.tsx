import { useEffect, useState } from 'react';
import { useEpics } from '../hooks/useEpics';
import { useNotifyConfig, useReresolveRoom, useSaveNotifyConfig } from '../hooks/useNotifyConfig';
import { useNotifyGlobalSettings, useSaveNotifyGlobalSettings } from '../hooks/useNotifyGlobalSettings';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';
import type { NotifyConfig, NotifyConfigInput } from '../types';

function toTimeInputValue(hhmmss: string): string {
  return hhmmss.slice(0, 5);
}

function fromTimeInputValue(hhmm: string): string {
  return `${hhmm}:00`;
}

function formStateFrom(config: NotifyConfig): NotifyConfigInput {
  return {
    roomName: config.roomName,
    meetingReminderEnabled: config.meetingReminderEnabled,
    dailyReportEnabled: config.dailyReportEnabled,
    dailyReportTime: config.dailyReportTime || '09:00:00',
    mergeNotifyEnabled: config.mergeNotifyEnabled,
    gitRepoUrl: config.gitRepoUrl,
    gitBranch: config.gitBranch,
    gitPollIntervalMinutes: config.gitPollIntervalMinutes || 15,
  };
}

function EpicNotifyConfigCard({ epicId }: { epicId: string }) {
  const { data: config } = useNotifyConfig(epicId);
  const saveConfig = useSaveNotifyConfig(epicId);
  const reresolveRoom = useReresolveRoom(epicId);
  const toast = useToast();

  const [form, setForm] = useState<NotifyConfigInput | null>(null);

  useEffect(() => {
    if (config) setForm(formStateFrom(config));
  }, [config]);

  if (!form) return null;

  function update<K extends keyof NotifyConfigInput>(key: K, value: NotifyConfigInput[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function handleSave() {
    if (!form) return;
    try {
      await saveConfig.mutateAsync(form);
      toast.show('Notify configuration saved', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not save notify configuration', 'error');
    }
  }

  async function handleReresolve() {
    try {
      await reresolveRoom.mutateAsync();
      toast.show('Room re-resolved', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not re-resolve room', 'error');
    }
  }

  return (
    <div className="mt-4 max-w-2xl rounded-lg border border-line bg-panel p-5 shadow-card">
      <div className="mb-5">
        <label className="mb-1 block text-[13px] font-medium text-ink2">Rocket.Chat room name</label>
        <div className="flex items-center gap-2">
          <Input
            value={form.roomName}
            onChange={(e) => update('roomName', e.target.value)}
            placeholder="e.g. team-updates"
            className="flex-1"
          />
          <Button onClick={handleReresolve} disabled={!config?.configured || reresolveRoom.isPending}>
            Re-resolve room
          </Button>
        </div>
        {config?.configured && (
          <p className="mt-1.5 text-[13px] text-ink2">
            {config.roomId ? (
              <span className="inline-flex items-center gap-1 text-done">
                <Icon name="check" size={13} />
                Resolved{config.roomResolvedAt ? ` on ${new Date(config.roomResolvedAt).toLocaleString()}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-danger">
                <Icon name="warning" size={13} />
                Not resolved yet
              </span>
            )}
          </p>
        )}
        <p className="mt-1 text-[13px] text-ink3">Required to enable any notification type below.</p>
      </div>

      <div className="flex flex-col divide-y divide-line2 border-t border-line">
        <div className="flex items-center justify-between gap-4 py-4">
          <div>
            <div className="text-[14.5px] font-medium text-ink">Meeting reminders</div>
            <p className="text-[13px] text-ink2">Post a reminder 15 minutes before each scheduled meeting.</p>
          </div>
          <Toggle checked={form.meetingReminderEnabled} onChange={(v) => update('meetingReminderEnabled', v)} />
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14.5px] font-medium text-ink">Daily report</div>
              <p className="text-[13px] text-ink2">Post a BE/UI task status summary every weekday.</p>
            </div>
            <Toggle checked={form.dailyReportEnabled} onChange={(v) => update('dailyReportEnabled', v)} />
          </div>
          {form.dailyReportEnabled && (
            <div className="mt-3">
              <label className="mb-1 block text-[13px] font-medium text-ink2">Send time (UTC)</label>
              <Input
                type="time"
                value={toTimeInputValue(form.dailyReportTime)}
                onChange={(e) => update('dailyReportTime', fromTimeInputValue(e.target.value))}
                className="w-40"
              />
            </div>
          )}
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14.5px] font-medium text-ink">Git merge notify</div>
              <p className="text-[13px] text-ink2">Post a message whenever new commits land on a branch.</p>
            </div>
            <Toggle checked={form.mergeNotifyEnabled} onChange={(v) => update('mergeNotifyEnabled', v)} />
          </div>
          {form.mergeNotifyEnabled && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-ink2">Repo URL</label>
                <Input
                  placeholder="https://…"
                  value={form.gitRepoUrl ?? ''}
                  onChange={(e) => update('gitRepoUrl', e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[13px] font-medium text-ink2">Branch</label>
                  <Input value={form.gitBranch ?? ''} onChange={(e) => update('gitBranch', e.target.value)} className="w-full" />
                </div>
                <div className="w-40">
                  <label className="mb-1 block text-[13px] font-medium text-ink2">Poll interval (min)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.gitPollIntervalMinutes}
                    onChange={(e) => update('gitPollIntervalMinutes', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              {config?.gitCloneStatus && (
                <p className={`text-[13px] ${config.gitCloneStatus === 'ERROR' ? 'text-danger' : 'text-ink2'}`}>
                  Status: {config.gitCloneStatus}
                  {config.gitLastError ? ` — ${config.gitLastError}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={saveConfig.isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function NotifySettingsPage() {
  const { data: epics } = useEpics();
  const { data: settings } = useNotifyGlobalSettings();
  const saveSettings = useSaveNotifyGlobalSettings();
  const toast = useToast();

  const [enabled, setEnabled] = useState(true);
  const [selectedEpicId, setSelectedEpicId] = useState('');

  useEffect(() => {
    if (settings) setEnabled(settings.enabled);
  }, [settings]);

  async function handleSaveGlobal() {
    try {
      await saveSettings.mutateAsync(enabled);
      toast.show('Notification settings saved', 'success');
    } catch (err) {
      toast.show(isApiError(err) ? err.message : 'Could not save notification settings', 'error');
    }
  }

  return (
    <div>
      <Topbar title="Notifications" subtitle="workspace-wide" />

      <div className="max-w-2xl rounded-lg border border-line bg-panel p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[14.5px] font-medium text-ink">Enable notifications</div>
            <p className="max-w-md text-[13px] text-ink2">
              Master switch for all epic notify configs — meeting reminders, daily reports, and git merge notifications. Turning this
              off silences every epic's Rocket.Chat messages without changing their individual settings.
            </p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="primary" onClick={handleSaveGlobal} disabled={saveSettings.isPending}>
            Save
          </Button>
        </div>
      </div>

      <div className="mt-8 max-w-2xl">
        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink3">Per-epic notify config</h3>
        <Select value={selectedEpicId} onChange={(e) => setSelectedEpicId(e.target.value)} className="w-full">
          <option value="">Select an epic…</option>
          {epics?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.ticketId} · {e.name}
            </option>
          ))}
        </Select>

        {selectedEpicId && <EpicNotifyConfigCard key={selectedEpicId} epicId={selectedEpicId} />}
      </div>
    </div>
  );
}
