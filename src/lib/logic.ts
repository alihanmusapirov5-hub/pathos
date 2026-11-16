import { addDays, fromKey, todayKey } from './date';
import type { Category, Goal, Milestone, Priority, RoadmapTask, Tracker } from './types';

/* ---------------------------- Roadmap progress ---------------------------- */

export function milestoneProgress(m: Milestone): number {
  if (m.tasks.length === 0) return 0;
  return Math.round((m.tasks.filter((t) => t.done).length / m.tasks.length) * 100);
}

export function goalProgress(g: Goal): number {
  const all = g.milestones.flatMap((m) => m.tasks);
  if (all.length === 0) return 0;
  return Math.round((all.filter((t) => t.done).length / all.length) * 100);
}

/** First milestone that is not complete (sequential milestones). */
export function activeMilestone(g: Goal): Milestone | undefined {
  return g.milestones.find((m) => m.tasks.length === 0 || m.tasks.some((t) => !t.done));
}

export interface FocusItem {
  goal: Goal;
  milestone: Milestone;
  task: RoadmapTask;
}

/**
 * Daily Focus: up to 3 roadmap tasks.
 * Tasks completed today stay visible; remaining slots are filled round-robin
 * from the next open tasks of each goal's active milestone (soonest deadline first).
 */
export function computeFocus(goals: Goal[], max = 3): FocusItem[] {
  const today = todayKey();
  const sorted = [...goals].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const doneToday: FocusItem[] = [];
  for (const goal of sorted)
    for (const milestone of goal.milestones)
      for (const task of milestone.tasks)
        if (task.done && task.completedAt === today) doneToday.push({ goal, milestone, task });

  const result = doneToday.slice(0, max);
  const queues = sorted
    .map((goal) => {
      const milestone = activeMilestone(goal);
      if (!milestone) return [];
      return milestone.tasks.filter((t) => !t.done).map((task) => ({ goal, milestone, task }));
    })
    .filter((q) => q.length > 0);

  let i = 0;
  while (result.length < max && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length];
    const next = q.shift();
    if (next) result.push(next);
    i++;
  }
  return result;
}

/* ------------------------------ Tracker logic ----------------------------- */

export function isScheduled(t: Tracker, key: string): boolean {
  const dow = fromKey(key).getDay();
  if (t.frequency === 'daily') return true;
  if (t.frequency === 'weekdays') return dow >= 1 && dow <= 5;
  return t.customDays.includes(dow);
}

export function trackerValue(t: Tracker, key: string): number {
  return t.logs[key] ?? 0;
}

export function trackerRatio(t: Tracker, key: string): number {
  return Math.min(1, trackerValue(t, key) / Math.max(1, t.target));
}

export function isComplete(t: Tracker, key: string): boolean {
  return trackerValue(t, key) >= t.target;
}

/** Consecutive scheduled days completed. Today counts if done; otherwise streak runs through yesterday. */
export function computeStreak(t: Tracker): number {
  let key = todayKey();
  let streak = 0;
  if (isScheduled(t, key)) {
    if (isComplete(t, key)) streak++;
  }
  for (let i = 0; i < 730; i++) {
    key = addDays(key, -1);
    if (!isScheduled(t, key)) continue;
    if (isComplete(t, key)) streak++;
    else break;
  }
  return streak;
}

export function bestStreak(t: Tracker): number {
  let best = 0;
  let cur = 0;
  let key = addDays(todayKey(), -365);
  const end = todayKey();
  while (key <= end) {
    if (isScheduled(t, key)) {
      if (isComplete(t, key)) {
        cur++;
        best = Math.max(best, cur);
      } else if (key !== end) cur = 0;
    }
    key = addDays(key, 1);
  }
  return best;
}

export function formatValue(t: Tracker, v: number): string {
  if (t.type === 'timer') {
    if (v >= 60 && t.target >= 60) {
      const h = Math.floor(v / 60);
      const m = v % 60;
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${v}m`;
  }
  return String(v);
}

/* --------------------------------- Styling -------------------------------- */

export const CATEGORIES: Category[] = ['Study', 'Health', 'Career', 'Personal'];

export const categoryStyles: Record<Category, { dot: string; badge: string; bar: string; soft: string; text: string }> = {
  Study: {
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-indigo-500/20',
    bar: 'bg-indigo-500',
    soft: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  Health: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  Career: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    bar: 'bg-amber-500',
    soft: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  Personal: {
    dot: 'bg-pink-500',
    badge: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-pink-500/20',
    bar: 'bg-pink-500',
    soft: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
  },
};

export const priorityStyles: Record<Priority, { label: string; badge: string; dot: string; rank: number }> = {
  high: { label: 'High', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20', dot: 'bg-red-500', rank: 0 },
  medium: { label: 'Medium', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20', dot: 'bg-amber-500', rank: 1 },
  low: { label: 'Low', badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-zinc-500/20', dot: 'bg-zinc-400', rank: 2 },
};
