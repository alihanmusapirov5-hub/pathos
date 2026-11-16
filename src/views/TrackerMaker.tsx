import { useEffect, useState, type FormEvent } from 'react';
import { Activity, MoreHorizontal, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { useStore } from '../store';
import { todayKey } from '../lib/date';
import { CATEGORIES, bestStreak, categoryStyles, computeStreak, isComplete, isScheduled, trackerRatio } from '../lib/logic';
import type { Category, Frequency, Tracker, TrackerType } from '../lib/types';
import { Badge, Button, EmptyState, IconButton, Modal, ProgressBar, Segmented, cn } from '../components/ui';
import { Heatmap, StreakBadge, TrackerControls, TrackerValue, WeekDots, typeMeta } from '../components/trackers';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type Filter = 'All' | Category;

export default function TrackerMaker() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('All');
  const [editing, setEditing] = useState<Tracker | null>(null);
  const [open, setOpen] = useState(false);
  const today = todayKey();

  const list = state.trackers.filter((t) => filter === 'All' || t.category === filter);
  const scheduled = state.trackers.filter((t) => isScheduled(t, today));
  const doneToday = scheduled.filter((t) => isComplete(t, today)).length;
  const topStreak = Math.max(0, ...state.trackers.map(computeStreak));

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tracker Maker</h1>
          <p className="mt-1 text-sm text-zinc-500">Design custom habits and metrics. Build streaks one day at a time.</p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4" /> New tracker
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active trackers" value={state.trackers.length} />
        <Stat label="Done today" value={`${doneToday}/${scheduled.length}`} />
        <Stat label="Top streak" value={`🔥 ${topStreak}`} />
      </div>

      {/* Filter */}
      <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(['All', ...CATEGORIES] as Filter[]).map((c) => {
          const count = c === 'All' ? state.trackers.length : state.trackers.filter((t) => t.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                filter === c
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20',
              )}
            >
              {c !== 'All' && <span className={cn('h-1.5 w-1.5 rounded-full', categoryStyles[c].dot)} />}
              {c}
              <span className="opacity-50">{count}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title={filter === 'All' ? 'No trackers yet' : `No ${filter} trackers`}
            description="Create a checkbox habit, a counter, or a timed session."
            action={
              <Button variant="primary" size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> Create tracker
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <TrackerCard
              key={t.id}
              tracker={t}
              onEdit={() => {
                setEditing(t);
                setOpen(true);
              }}
            />
          ))}
          <button
            onClick={openNew}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 transition hover:border-indigo-400 hover:bg-indigo-500/[0.03] hover:text-indigo-600 dark:border-white/10 dark:hover:border-indigo-400/50 dark:hover:text-indigo-400"
          >
            <Plus className="h-5 w-5" /> New tracker
          </button>
        </div>
      )}

      <TrackerForm open={open} onClose={() => setOpen(false)} initial={editing} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* ------------------------------- Tracker card ------------------------------ */

function TrackerCard({ tracker, onEdit }: { tracker: Tracker; onEdit: () => void }) {
  const { deleteTracker } = useStore();
  const [menu, setMenu] = useState(false);
  const today = todayKey();
  const scheduled = isScheduled(tracker, today);
  const done = isComplete(tracker, today);
  const ratio = trackerRatio(tracker, today);
  const streak = computeStreak(tracker);
  const best = bestStreak(tracker);
  const cat = categoryStyles[tracker.category];
  const Icon = typeMeta[tracker.type].icon;

  const freqLabel =
    tracker.frequency === 'daily' ? 'Every day' : tracker.frequency === 'weekdays' ? 'Weekdays' : tracker.customDays.map((d) => DAY_LABELS[d].slice(0, 2)).join(' · ');

  return (
    <div className={cn('card group relative flex flex-col p-4 transition hover:border-zinc-300 dark:hover:border-white/[0.12]', done && 'border-emerald-500/30 dark:border-emerald-500/20')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cat.soft, cat.text)}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{tracker.title}</h3>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Badge className={cat.badge}>{tracker.category}</Badge>
              <span className="truncate">{freqLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StreakBadge streak={streak} />
          <div className="relative">
            <IconButton label="Tracker options" onClick={() => setMenu((m) => !m)} className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg animate-scale-in dark:border-white/10 dark:bg-[#1a1a1e]">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
                    onClick={() => {
                      setMenu(false);
                      onEdit();
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => {
                      if (confirm(`Delete "${tracker.title}" and all its history?`)) deleteTracker(tracker.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-zinc-500">{scheduled ? 'Today' : 'Not scheduled today'}</span>
          {tracker.type === 'boolean' ? (
            <span className={cn('font-medium', done ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400')}>{done ? 'Completed' : 'Pending'}</span>
          ) : (
            <TrackerValue tracker={tracker} />
          )}
        </div>
        <ProgressBar value={ratio * 100} barClass={done ? 'bg-emerald-500' : cat.bar} />
      </div>

      {/* 7-day dots */}
      <div className="mt-4 flex items-center justify-between">
        <WeekDots tracker={tracker} />
      </div>

      {/* Heatmap */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="section-title">Last 12 weeks</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <Trophy className="h-3 w-3" /> Best {best}d
          </span>
        </div>
        <Heatmap tracker={tracker} />
      </div>

      <div className="mt-4 flex items-center justify-end border-t border-zinc-100 pt-3 dark:border-white/[0.05]">
        <TrackerControls tracker={tracker} />
      </div>
    </div>
  );
}

/* ------------------------------- Tracker form ------------------------------ */

const defaults = {
  title: '',
  category: 'Health' as Category,
  type: 'boolean' as TrackerType,
  target: 1,
  unit: '',
  frequency: 'daily' as Frequency,
  customDays: [1, 3, 5] as number[],
};

const presets: { title: string; category: Category; type: TrackerType; target: number; unit: string }[] = [
  { title: 'Meditate', category: 'Personal', type: 'timer', target: 10, unit: 'min' },
  { title: 'Push-ups', category: 'Health', type: 'counter', target: 50, unit: 'reps' },
  { title: 'Study session', category: 'Study', type: 'timer', target: 90, unit: 'min' },
  { title: 'No social media', category: 'Personal', type: 'boolean', target: 1, unit: '' },
  { title: 'Apply to jobs', category: 'Career', type: 'counter', target: 3, unit: 'applications' },
];

function TrackerForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Tracker | null }) {
  const { addTracker, updateTracker } = useStore();
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? { title: initial.title, category: initial.category, type: initial.type, target: initial.target, unit: initial.unit, frequency: initial.frequency, customDays: initial.customDays.length ? initial.customDays : defaults.customDays }
        : defaults,
    );
  }, [open, initial]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const setType = (type: TrackerType) =>
    setForm((f) => ({
      ...f,
      type,
      target: type === 'boolean' ? 1 : type === 'counter' ? (f.type === 'counter' ? f.target : 8) : f.type === 'timer' ? f.target : 60,
      unit: type === 'boolean' ? '' : type === 'timer' ? 'min' : f.type === 'counter' ? f.unit : 'times',
    }));

  const valid = form.title.trim() && form.target > 0 && (form.frequency !== 'custom' || form.customDays.length > 0);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) return;
    const payload = { ...form, title: form.title.trim(), customDays: form.frequency === 'custom' ? [...form.customDays].sort() : [] };
    if (initial) updateTracker(initial.id, payload);
    else addTracker({ ...payload, runningSince: null });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit tracker' : 'Create custom tracker'}
      description="Choose what to measure and how often."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => submit()} disabled={!valid}>
            {initial ? 'Save changes' : 'Create tracker'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {!initial && (
          <div>
            <span className="label">Quick presets</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.title}
                  onClick={() => setForm((f) => ({ ...f, ...p }))}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-white/10 dark:text-zinc-400 dark:hover:text-indigo-400"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="tr-title">Title</label>
          <input id="tr-title" autoFocus className="input" placeholder="e.g. Drink water" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => set('category', c)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition',
                  form.category === c ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', categoryStyles[c].dot)} /> {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Tracker type</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(typeMeta) as TrackerType[]).map((t) => {
              const M = typeMeta[t];
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition',
                    form.type === t ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400',
                  )}
                >
                  <M.icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{M.label}</span>
                  <span className="text-[10px] opacity-70">{M.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {form.type !== 'boolean' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tr-target">{form.type === 'timer' ? 'Daily target (minutes)' : 'Daily target'}</label>
              <input id="tr-target" type="number" min={1} className="input" value={form.target} onChange={(e) => set('target', Math.max(0, Number(e.target.value)))} />
            </div>
            <div>
              <label className="label" htmlFor="tr-unit">Unit</label>
              <input id="tr-unit" className="input" placeholder="glasses" value={form.unit} disabled={form.type === 'timer'} onChange={(e) => set('unit', e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <span className="label">Frequency</span>
          <Segmented
            value={form.frequency}
            onChange={(v) => set('frequency', v)}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekdays', label: 'Weekdays' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {form.frequency === 'custom' && (
            <div className="mt-2 flex gap-1.5">
              {DAY_LABELS.map((d, i) => {
                const on = form.customDays.includes(i);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => set('customDays', on ? form.customDays.filter((x) => x !== i) : [...form.customDays, i])}
                    className={cn(
                      'h-9 flex-1 rounded-lg border text-xs font-medium transition',
                      on ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10',
                    )}
                  >
                    {d.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
