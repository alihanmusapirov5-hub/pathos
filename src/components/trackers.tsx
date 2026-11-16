import { useEffect, useState } from 'react';
import { Check, CheckSquare, Flame, Hash, Minus, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react';
import { useStore } from '../store';
import { addDays, formatDate, todayKey, weekdayShort } from '../lib/date';
import { categoryStyles, formatValue, isComplete, isScheduled, trackerRatio, trackerValue } from '../lib/logic';
import type { Tracker, TrackerType } from '../lib/types';
import { cn } from './ui';

export const typeMeta: Record<TrackerType, { label: string; icon: typeof Hash; hint: string }> = {
  boolean: { label: 'Checkbox', icon: CheckSquare, hint: 'Done / not done' },
  counter: { label: 'Counter', icon: Hash, hint: 'e.g. 0 / 8 glasses' },
  timer: { label: 'Duration', icon: Timer, hint: 'e.g. 0 / 120 min' },
};

/** Re-render every second while a timer is running. */
function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

function elapsed(since: number): string {
  const s = Math.floor((Date.now() - since) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/* ------------------------------ Value display ----------------------------- */

export function TrackerValue({ tracker, className }: { tracker: Tracker; className?: string }) {
  const v = trackerValue(tracker, todayKey());
  if (tracker.type === 'boolean') return null;
  return (
    <span className={cn('tabular-nums text-xs text-zinc-500', className)}>
      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatValue(tracker, v)}</span>
      {' / '}
      {formatValue(tracker, tracker.target)}
      {tracker.type === 'counter' && tracker.unit ? ` ${tracker.unit}` : ''}
    </span>
  );
}

/* -------------------------------- Controls -------------------------------- */

export function TrackerControls({ tracker, compact = false }: { tracker: Tracker; compact?: boolean }) {
  const { toggleBoolean, incrementTracker, startTimer, stopTimer, setTrackerValue } = useStore();
  const today = todayKey();
  const done = isComplete(tracker, today);
  const running = !!tracker.runningSince;
  useTicker(running);

  const btn =
    'inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-95 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.06]';

  if (tracker.type === 'boolean') {
    return (
      <button
        onClick={() => toggleBoolean(tracker.id)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition active:scale-95',
          done
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'border border-zinc-200 text-zinc-700 hover:border-emerald-400 hover:text-emerald-600 dark:border-white/10 dark:text-zinc-300',
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
        {done ? 'Done' : 'Check'}
      </button>
    );
  }

  if (tracker.type === 'counter') {
    return (
      <div className="flex items-center gap-1">
        <button className={cn(btn, 'w-8 px-0')} onClick={() => incrementTracker(tracker.id, -1)} aria-label="Decrease" disabled={trackerValue(tracker, today) === 0}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          className={cn(btn, 'border-transparent bg-indigo-600 text-white hover:bg-indigo-500 dark:border-transparent dark:text-white dark:hover:bg-indigo-500')}
          onClick={() => incrementTracker(tracker.id, 1)}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> 1
        </button>
        {!compact && (
          <button className={cn(btn, 'w-8 px-0')} onClick={() => setTrackerValue(tracker.id, 0)} aria-label="Reset today" title="Reset today">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // timer
  return (
    <div className="flex items-center gap-1">
      {running ? (
        <button
          className={cn(btn, 'border-transparent bg-amber-500 tabular-nums text-white hover:bg-amber-600 dark:border-transparent dark:text-white dark:hover:bg-amber-600')}
          onClick={() => stopTimer(tracker.id)}
        >
          <Pause className="h-3.5 w-3.5" /> {elapsed(tracker.runningSince!)}
        </button>
      ) : (
        <button className={btn} onClick={() => startTimer(tracker.id)} title="Start live timer">
          <Play className="h-3.5 w-3.5" /> {compact ? '' : 'Start'}
        </button>
      )}
      <button className={btn} onClick={() => incrementTracker(tracker.id, 15)}>
        +15m
      </button>
      {!compact && (
        <>
          <button className={btn} onClick={() => incrementTracker(tracker.id, 30)}>
            +30m
          </button>
          <button className={cn(btn, 'w-8 px-0')} onClick={() => setTrackerValue(tracker.id, 0)} aria-label="Reset today" title="Reset today">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

/* --------------------------------- Visuals -------------------------------- */

export function WeekDots({ tracker }: { tracker: Tracker }) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <div className="flex items-end gap-1.5">
      {days.map((d) => {
        const scheduled = isScheduled(tracker, d);
        const ratio = trackerRatio(tracker, d);
        const complete = ratio >= 1;
        return (
          <div key={d} className="flex flex-col items-center gap-1" title={`${formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}: ${formatValue(tracker, trackerValue(tracker, d))}`}>
            <div
              className={cn(
                'relative h-5 w-5 overflow-hidden rounded-full transition',
                !scheduled
                  ? 'border border-dashed border-zinc-300 dark:border-zinc-700'
                  : complete
                    ? 'bg-emerald-500'
                    : 'bg-zinc-100 dark:bg-white/[0.06]',
                d === today && 'ring-2 ring-indigo-500/40 ring-offset-1 ring-offset-white dark:ring-offset-[#0b0b0d]',
              )}
            >
              {scheduled && !complete && ratio > 0 && (
                <div className="absolute inset-x-0 bottom-0 bg-emerald-500/50" style={{ height: `${ratio * 100}%` }} />
              )}
              {complete && <Check className="absolute inset-0 m-auto h-3 w-3 text-white" strokeWidth={3} />}
            </div>
            <span className={cn('text-[10px] text-zinc-400', d === today && 'font-semibold text-indigo-500')}>{weekdayShort(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Heatmap({ tracker, weeks = 12 }: { tracker: Tracker; weeks?: number }) {
  const today = todayKey();
  // Align so the last column ends on today
  const total = weeks * 7;
  const days = Array.from({ length: total }, (_, i) => addDays(today, i - total + 1));
  const columns: string[][] = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));
  const level = (d: string) => {
    if (!isScheduled(tracker, d)) return 'bg-transparent border border-zinc-200/70 dark:border-white/[0.04]';
    const r = trackerRatio(tracker, d);
    if (r >= 1) return 'bg-emerald-500';
    if (r >= 0.66) return 'bg-emerald-500/60';
    if (r >= 0.33) return 'bg-emerald-500/35';
    if (r > 0) return 'bg-emerald-500/20';
    return 'bg-zinc-100 dark:bg-white/[0.05]';
  };
  return (
    <div className="flex gap-[3px]">
      {columns.map((col, i) => (
        <div key={i} className="flex flex-1 flex-col gap-[3px]">
          {col.map((d) => (
            <div
              key={d}
              title={`${formatDate(d)} — ${formatValue(tracker, trackerValue(tracker, d))}`}
              className={cn('aspect-square w-full max-w-[14px] rounded-[3px]', level(d), d === today && 'ring-1 ring-indigo-500')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------- Compact row (Today tab) ------------------------ */

export function TrackerRow({ tracker }: { tracker: Tracker }) {
  const today = todayKey();
  const done = isComplete(tracker, today);
  const ratio = trackerRatio(tracker, today);
  const Icon = typeMeta[tracker.type].icon;
  const cat = categoryStyles[tracker.category];
  return (
    <div className="group flex flex-col gap-2 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', done ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : cn(cat.soft, cat.text))}>
          {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('truncate text-sm font-medium', done && 'text-zinc-400 line-through decoration-zinc-400/50')}>{tracker.title}</p>
            {tracker.runningSince && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />}
          </div>
          {tracker.type !== 'boolean' ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                <div className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-emerald-500' : cat.bar)} style={{ width: `${ratio * 100}%` }} />
              </div>
              <TrackerValue tracker={tracker} className="text-[11px]" />
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">{tracker.category}</p>
          )}
        </div>
      </div>
      <div className="pl-11 sm:pl-0">
        <TrackerControls tracker={tracker} compact />
      </div>
    </div>
  );
}

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
        streak > 0 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-zinc-100 text-zinc-400 dark:bg-white/[0.05]',
      )}
      title={`${streak} day streak`}
    >
      <Flame className={cn('h-3.5 w-3.5', streak > 0 && 'fill-orange-500/30')} />
      {streak}
    </span>
  );
}
