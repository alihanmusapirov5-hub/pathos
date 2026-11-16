import { useRef } from 'react';
import { Download, Moon, RotateCcw, Sun, Trash2, Upload } from 'lucide-react';
import { useStore } from '../store';
import type { AppState } from '../lib/types';
import { Button, Modal, Segmented } from './ui';

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setTheme, resetDemo, clearAll, importState } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pathos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState;
      if (parsed.version !== 1 || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.goals) || !Array.isArray(parsed.trackers)) throw new Error();
      importState(parsed);
      onClose();
    } catch {
      alert('That file is not a valid PathOS backup.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" description="All data is stored locally in this browser.">
      <div className="space-y-6">
        <div>
          <span className="label">Appearance</span>
          <Segmented
            value={state.theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: <><Sun className="h-3.5 w-3.5" /> Light</> },
              { value: 'dark', label: <><Moon className="h-3.5 w-3.5" /> Dark</> },
            ]}
          />
        </div>

        <div>
          <span className="label">Backup</span>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportData}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importData(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <div>
          <span className="label">Data</span>
          <div className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Reset demo data</p>
                <p className="text-xs text-zinc-500">Replace everything with the sample goal, trackers and tasks.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (confirm('Replace all current data with demo data?')) {
                    resetDemo();
                    onClose();
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-white/[0.06]" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Start fresh</p>
                <p className="text-xs text-zinc-500">Delete all goals, trackers and tasks.</p>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm('Permanently delete all data? This cannot be undone.')) {
                    clearAll();
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-400">
          PathOS · {state.goals.length} goals · {state.trackers.length} trackers · {state.tasks.length} tasks
        </p>
      </div>
    </Modal>
  );
}
