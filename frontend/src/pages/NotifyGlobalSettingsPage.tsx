import { useEffect, useState } from 'react';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { useNotifyGlobalSettings, useSaveNotifyGlobalSettings } from '../hooks/useNotifyGlobalSettings';
import { useToast } from '../context/ToastContext';
import { isApiError } from '../context/AuthContext';

export function NotifyGlobalSettingsPage() {
  const { data: settings } = useNotifyGlobalSettings();
  const saveSettings = useSaveNotifyGlobalSettings();
  const toast = useToast();

  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (settings) setEnabled(settings.enabled);
  }, [settings]);

  async function handleSave() {
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
          <Button variant="primary" onClick={handleSave} disabled={saveSettings.isPending}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
