import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { addDays, todayKey, uid } from './lib/date';
import { createDemoState } from './lib/demo';
import { goalFromTemplate, type RoadmapTemplate } from './lib/templates';
import type { AppState, DailyTask, Goal, Milestone, Priority, Theme, Tracker } from './lib/types';

const STORAGE_KEY = 'pathos:v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return createDemoState(prefersDark ? 'dark' : 'light');
}

function useStoreValue() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  /* ------------------------------- Settings ------------------------------- */
  const setTheme = (theme: Theme) => update((s) => ({ ...s, theme }));
  const toggleTheme = () => update((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  const resetDemo = () => update((s) => createDemoState(s.theme));
  const clearAll = () => update((s) => ({ version: 1, theme: s.theme, tasks: [], trackers: [], goals: [] }));
  const importState = (next: AppState) => setState(next);

  /* ------------------------------ Daily tasks ----------------------------- */
  const addTask = (title: string, priority: Priority, date = todayKey()) =>
    update((s) => ({
      ...s,
      tasks: [...s.tasks, { id: uid(), title, priority, done: false, date, createdAt: Date.now() }],
    }));
  const updateTask = (id: string, patch: Partial<DailyTask>) =>
    update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const toggleTask = (id: string) =>
    update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  const deleteTask = (id: string) => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  const moveUnfinishedToTomorrow = () => {
    const today = todayKey();
    const tomorrow = addDays(today, 1);
    update((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (!t.done && t.date <= today ? { ...t, date: tomorrow } : t)),
    }));
  };
  const clearCompleted = () => {
    const today = todayKey();
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => !(t.done && t.date <= today)) }));
  };

  /* -------------------------------- Trackers ------------------------------ */
  const addTracker = (t: Omit<Tracker, 'id' | 'logs' | 'createdAt'>) =>
    update((s) => ({ ...s, trackers: [...s.trackers, { ...t, id: uid(), logs: {}, createdAt: Date.now() }] }));
  const updateTracker = (id: string, patch: Partial<Tracker>) =>
    update((s) => ({ ...s, trackers: s.trackers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const deleteTracker = (id: string) => update((s) => ({ ...s, trackers: s.trackers.filter((t) => t.id !== id) }));
  const setTrackerValue = (id: string, value: number, date = todayKey()) =>
    update((s) => ({
      ...s,
      trackers: s.trackers.map((t) =>
        t.id === id ? { ...t, logs: { ...t.logs, [date]: Math.max(0, Math.round(value)) } } : t,
      ),
    }));
  const incrementTracker = (id: string, delta: number, date = todayKey()) =>
    update((s) => ({
      ...s,
      trackers: s.trackers.map((t) =>
        t.id === id ? { ...t, logs: { ...t.logs, [date]: Math.max(0, (t.logs[date] ?? 0) + delta) } } : t,
      ),
    }));
  const toggleBoolean = (id: string, date = todayKey()) =>
    update((s) => ({
      ...s,
      trackers: s.trackers.map((t) =>
        t.id === id ? { ...t, logs: { ...t.logs, [date]: (t.logs[date] ?? 0) >= t.target ? 0 : t.target } } : t,
      ),
    }));
  const startTimer = (id: string) => updateTracker(id, { runningSince: Date.now() });
  const stopTimer = (id: string) =>
    update((s) => ({
      ...s,
      trackers: s.trackers.map((t) => {
        if (t.id !== id || !t.runningSince) return t;
        const mins = Math.max(1, Math.round((Date.now() - t.runningSince) / 60000));
        const key = todayKey();
        return { ...t, runningSince: null, logs: { ...t.logs, [key]: (t.logs[key] ?? 0) + mins } };
      }),
    }));

  /* -------------------------------- Roadmap ------------------------------- */
  const mapGoal = (goalId: string, fn: (g: Goal) => Goal) =>
    update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === goalId ? fn(g) : g)) }));
  const mapMilestone = (goalId: string, msId: string, fn: (m: Milestone) => Milestone) =>
    mapGoal(goalId, (g) => ({ ...g, milestones: g.milestones.map((m) => (m.id === msId ? fn(m) : m)) }));

  const addGoal = (g: Omit<Goal, 'id' | 'createdAt' | 'milestones'>) =>
    update((s) => ({ ...s, goals: [{ ...g, id: uid(), createdAt: Date.now(), milestones: [] }, ...s.goals] }));
  const addGoalFromTemplate = (t: RoadmapTemplate) =>
    update((s) => ({ ...s, goals: [goalFromTemplate(t), ...s.goals] }));
  const updateGoal = (id: string, patch: Partial<Goal>) => mapGoal(id, (g) => ({ ...g, ...patch }));
  const deleteGoal = (id: string) => update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));

  const addMilestone = (goalId: string, title: string, dueDate?: string) =>
    mapGoal(goalId, (g) => ({ ...g, milestones: [...g.milestones, { id: uid(), title, dueDate, tasks: [] }] }));
  const updateMilestone = (goalId: string, msId: string, patch: Partial<Milestone>) =>
    mapMilestone(goalId, msId, (m) => ({ ...m, ...patch }));
  const deleteMilestone = (goalId: string, msId: string) =>
    mapGoal(goalId, (g) => ({ ...g, milestones: g.milestones.filter((m) => m.id !== msId) }));
  const moveMilestone = (goalId: string, msId: string, dir: -1 | 1) =>
    mapGoal(goalId, (g) => {
      const idx = g.milestones.findIndex((m) => m.id === msId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= g.milestones.length) return g;
      const ms = [...g.milestones];
      [ms[idx], ms[target]] = [ms[target], ms[idx]];
      return { ...g, milestones: ms };
    });

  const addRoadmapTask = (goalId: string, msId: string, title: string) =>
    mapMilestone(goalId, msId, (m) => ({ ...m, tasks: [...m.tasks, { id: uid(), title, done: false, completedAt: null }] }));
  const toggleRoadmapTask = (goalId: string, msId: string, taskId: string) =>
    mapMilestone(goalId, msId, (m) => ({
      ...m,
      tasks: m.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? todayKey() : null } : t,
      ),
    }));
  const renameRoadmapTask = (goalId: string, msId: string, taskId: string, title: string) =>
    mapMilestone(goalId, msId, (m) => ({ ...m, tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)) }));
  const deleteRoadmapTask = (goalId: string, msId: string, taskId: string) =>
    mapMilestone(goalId, msId, (m) => ({ ...m, tasks: m.tasks.filter((t) => t.id !== taskId) }));

  return {
    state,
    setTheme, toggleTheme, resetDemo, clearAll, importState,
    addTask, updateTask, toggleTask, deleteTask, moveUnfinishedToTomorrow, clearCompleted,
    addTracker, updateTracker, deleteTracker, setTrackerValue, incrementTracker, toggleBoolean, startTimer, stopTimer,
    addGoal, addGoalFromTemplate, updateGoal, deleteGoal,
    addMilestone, updateMilestone, deleteMilestone, moveMilestone,
    addRoadmapTask, toggleRoadmapTask, renameRoadmapTask, deleteRoadmapTask,
  };
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreValue();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
