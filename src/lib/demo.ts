import { addDays, addMonths, fromKey, todayKey, uid } from './date';
import type { AppState, Tracker } from './types';

/** Deterministic pseudo-random so demo history looks organic but stable. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function history(tracker: Omit<Tracker, 'logs'>, days: number, hitRate: number, seed: number, streakDays: number): Record<string, number> {
  const rand = seeded(seed);
  const logs: Record<string, number> = {};
  const today = todayKey();
  for (let i = days; i >= 1; i--) {
    const key = addDays(today, -i);
    const dow = fromKey(key).getDay();
    if (tracker.frequency === 'weekdays' && (dow === 0 || dow === 6)) continue;
    const forceHit = i <= streakDays;
    const hit = forceHit || rand() < hitRate;
    logs[key] = hit ? tracker.target : Math.floor(rand() * tracker.target * 0.7);
  }
  return logs;
}

export function createDemoState(theme: AppState['theme'] = 'dark'): AppState {
  const today = todayKey();
  const now = Date.now();

  const water: Omit<Tracker, 'logs'> = {
    id: uid(), title: 'Drink water', category: 'Health', type: 'counter', target: 8, unit: 'glasses',
    frequency: 'daily', customDays: [], createdAt: now,
  };
  const deepWork: Omit<Tracker, 'logs'> = {
    id: uid(), title: 'Deep work', category: 'Career', type: 'timer', target: 120, unit: 'min',
    frequency: 'weekdays', customDays: [], createdAt: now, runningSince: null,
  };
  const reading: Omit<Tracker, 'logs'> = {
    id: uid(), title: 'Read 20 pages', category: 'Study', type: 'boolean', target: 1, unit: '',
    frequency: 'daily', customDays: [], createdAt: now,
  };

  const waterLogs = history(water, 35, 0.7, 7, 4);
  waterLogs[today] = 3;
  const deepLogs = history(deepWork, 35, 0.6, 13, 3);
  deepLogs[today] = 45;
  const readLogs = history(reading, 35, 0.75, 21, 6);

  return {
    version: 1,
    theme,
    goals: [
      {
        id: uid(),
        title: 'Become a Full-Stack Developer',
        description: 'Land a junior full-stack role by building real projects and a strong portfolio.',
        category: 'Career',
        horizon: '1y',
        deadline: addMonths(today, 12),
        createdAt: now,
        milestones: [
          {
            id: uid(),
            title: 'Master frontend fundamentals',
            dueDate: addMonths(today, 3),
            tasks: [
              { id: uid(), title: 'Finish modern JavaScript course', done: true, completedAt: addDays(today, -9) },
              { id: uid(), title: 'Build 3 responsive landing pages', done: true, completedAt: addDays(today, -4) },
              { id: uid(), title: 'Learn React hooks & state patterns', done: false, completedAt: null },
              { id: uid(), title: 'Ship a TypeScript todo app', done: false, completedAt: null },
              { id: uid(), title: 'Write a blog post on what I learned', done: false, completedAt: null },
            ],
          },
          {
            id: uid(),
            title: 'Backend & portfolio launch',
            dueDate: addMonths(today, 8),
            tasks: [
              { id: uid(), title: 'Build a REST API with Node & PostgreSQL', done: false, completedAt: null },
              { id: uid(), title: 'Deploy a full-stack app to production', done: false, completedAt: null },
              { id: uid(), title: 'Publish portfolio website', done: false, completedAt: null },
              { id: uid(), title: 'Apply to 20 junior roles', done: false, completedAt: null },
            ],
          },
        ],
      },
    ],
    trackers: [
      { ...water, logs: waterLogs },
      { ...deepWork, logs: deepLogs },
      { ...reading, logs: readLogs },
    ],
    tasks: [
      { id: uid(), title: 'Review pull request feedback', priority: 'high', done: true, date: today, createdAt: now - 4000 },
      { id: uid(), title: 'Plan the week in calendar', priority: 'high', done: false, date: today, createdAt: now - 3000 },
      { id: uid(), title: 'Grocery run — vegetables & protein', priority: 'medium', done: false, date: today, createdAt: now - 2000 },
      { id: uid(), title: 'Reply to Sarah about weekend trip', priority: 'low', done: false, date: today, createdAt: now - 1000 },
    ],
  };
}
