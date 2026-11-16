import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight, ArrowRightToLine, CalendarClock, CheckCircle2, Flag, ListTodo, Plus, Sparkles, Target, Trash2, Activity,
} from 'lucide-react';
import { useStore } from '../store';
import { addDays, formatDate, greeting, todayKey } from '../lib/date';
import { categoryStyles, computeFocus, computeStreak, isComplete, isScheduled, priorityStyles, trackerRatio } from '../lib/logic';
import type { DailyTask, Priority, TabId } from '../lib/types';
import { Badge, Button, CardHeader, Checkbox, EmptyState, IconButton, ProgressBar, ProgressRing, cn } from '../components/ui';
import { TrackerRow } from '../components/trackers';

export default function TodayView({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const { state, toggleRoadmapTask } = useStore();
  const today = todayKey();

  const focus = useMemo(() => computeFocus(state.goals), [state.goals]);
  const todaysTasks = state.tasks.filter((t) => t.date === today || (t.date < today && !t.done));
  const todaysTrackers = state.trackers.filter((t) => isScheduled(t, today));
  const tomorrowCount = state.tasks.filter((t) => t.date === addDays(today, 1)).length;

  // Daily progress: tasks + focus items + trackers (partial credit for counters/timers)
  const units = [
    ...todaysTasks.map((t) => (t.done ? 1 : 0)),
    ...focus.map((f) => (f.task.done ? 1 : 0)),
    ...todaysTrackers.map((t) => trackerRatio(t, today)),
  ];
  const pct = units.length ? Math.round((units.reduce((a, b) => a + b, 0) / units.length) * 100) : 0;
  const doneCount = todaysTasks.filter((t) => t.done).length + focus.filter((f) => f.task.done).length + todaysTrackers.filter((t) => isComplete(t, today)).length;
  const totalCount = todaysTasks.length + focus.length + todaysTrackers.length;

  const message =
    pct === 100 ? 'Everything done. Outstanding day. 🎉' : pct >= 70 ? 'Almost there — finish strong.' : pct >= 30 ? 'Good momentum. Keep going.' : 'Pick one thing and start.';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + progress */}
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{greeting()} 👋</h1>
            <p className="mt-1 text-sm text-zinc-500">{message}</p>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={pct} size={68} stroke={6}>
              <span className="text-sm font-semibold tabular-nums">{pct}%</span>
            </ProgressRing>
            <div className="text-sm">
              <p className="font-medium tabular-nums">
                {doneCount} <span className="text-zinc-400">/ {totalCount}</span>
              </p>
              <p className="text-xs text-zinc-500">items complete</p>
            </div>
          </div>
        </div>
        <ProgressBar value={pct} height="h-1" className="rounded-none" barClass="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 rounded-none" />
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* Daily Focus */}
          <section className="card">
            <CardHeader
              icon={<Target className="h-4 w-4" />}
              title="Daily Focus"
              subtitle="Auto-picked from your active roadmap milestones"
              action={
                <Button size="sm" variant="ghost" onClick={() => onNavigate('roadmap')}>
                  Roadmap <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <div className="p-2 sm:p-3">
              {focus.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-5 w-5" />}
                  title="No active milestones"
                  description="Create a goal with milestones and tasks — your top 3 next actions will appear here automatically."
                  action={
                    <Button size="sm" variant="primary" onClick={() => onNavigate('roadmap')}>
                      <Plus className="h-3.5 w-3.5" /> Plan a goal
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-1">
                  {focus.map(({ goal, milestone, task }, i) => {
                    const cat = categoryStyles[goal.category];
                    return (
                      <li
                        key={task.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2.5 transition hover:border-zinc-200 hover:bg-zinc-50/80 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.03]',
                        )}
                      >
                        <span className="mt-0.5 w-4 text-center text-xs font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                        <Checkbox size="lg" checked={task.done} onChange={() => toggleRoadmapTask(goal.id, milestone.id, task.id)} label={task.title} />
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-medium transition', task.done && 'text-zinc-400 line-through decoration-zinc-400/50')}>{task.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
                              {goal.title}
                            </span>
                            <span className="text-zinc-300 dark:text-zinc-700">/</span>
                            <span className="inline-flex items-center gap-1">
                              <Flag className="h-3 w-3" /> {milestone.title}
                            </span>
                          </div>
                        </div>
                        <Badge className={priorityStyles.high.badge}>Focus</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <TaskList tasks={todaysTasks} tomorrowCount={tomorrowCount} />
        </div>

        {/* Trackers widget */}
        <section className="card h-fit lg:col-span-2">
          <CardHeader
            icon={<Activity className="h-4 w-4" />}
            title="Today's Trackers"
            subtitle={`${todaysTrackers.filter((t) => isComplete(t, today)).length} of ${todaysTrackers.length} complete`}
            action={
              <Button size="sm" variant="ghost" onClick={() => onNavigate('trackers')}>
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <div className="p-2 sm:p-3">
            {todaysTrackers.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="Nothing scheduled today"
                description="Build habits and metrics in the Tracker Maker."
                action={
                  <Button size="sm" variant="primary" onClick={() => onNavigate('trackers')}>
                    <Plus className="h-3.5 w-3.5" /> New tracker
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
                {todaysTrackers.map((t) => (
                  <TrackerRow key={t.id} tracker={t} />
                ))}
              </div>
            )}
            {todaysTrackers.length > 0 && (
              <div className="mx-2 mt-2 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-white/[0.03]">
                <span>Best active streak</span>
                <span className="font-semibold text-orange-500">🔥 {Math.max(0, ...todaysTrackers.map(computeStreak))} days</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------- Task list ------------------------------- */

function TaskList({ tasks, tomorrowCount }: { tasks: DailyTask[]; tomorrowCount: number }) {
  const { addTask, toggleTask, deleteTask, updateTask, moveUnfinishedToTomorrow, clearCompleted } = useStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const today = todayKey();

  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || priorityStyles[a.priority].rank - priorityStyles[b.priority].rank || a.createdAt - b.createdAt,
  );
  const unfinished = tasks.filter((t) => !t.done).length;
  const completed = tasks.length - unfinished;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), priority);
    setTitle('');
  };

  const cyclePriority = (t: DailyTask) => {
    const order: Priority[] = ['high', 'medium', 'low'];
    updateTask(t.id, { priority: order[(order.indexOf(t.priority) + 1) % 3] });
  };

  return (
    <section className="card">
      <CardHeader
        icon={<ListTodo className="h-4 w-4" />}
        title="Tasks"
        subtitle={`${completed} done · ${unfinished} remaining${tomorrowCount ? ` · ${tomorrowCount} queued for tomorrow` : ''}`}
        action={
          completed > 0 && (
            <Button size="sm" variant="ghost" onClick={clearCompleted} title="Remove completed tasks">
              <CheckCircle2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Clear done</span>
            </Button>
          )
        }
      />

      <form onSubmit={submit} className="mx-4 mt-3 flex flex-col gap-2 sm:mx-5 sm:flex-row">
        <div className="relative flex-1">
          <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input className="input pl-9" placeholder="Add a task for today…" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-white/10">
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition',
                  priority === p ? 'bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
                )}
                title={`${priorityStyles[p].label} priority`}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', priorityStyles[p].dot)} />
                {priorityStyles[p].label}
              </button>
            ))}
          </div>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Add
          </Button>
        </div>
      </form>

      <div className="p-2 sm:p-3">
        {sorted.length === 0 ? (
          <EmptyState icon={<ListTodo className="h-5 w-5" />} title="No tasks yet" description="Add what you want to get done today." />
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((t) => (
              <li key={t.id} className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03]">
                <Checkbox checked={t.done} onChange={() => toggleTask(t.id)} label={t.title} />
                <span className={cn('min-w-0 flex-1 truncate text-sm transition', t.done && 'text-zinc-400 line-through decoration-zinc-400/50')}>{t.title}</span>
                {t.date < today && !t.done && (
                  <Badge className="bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400">
                    <CalendarClock className="h-3 w-3" /> Overdue
                  </Badge>
                )}
                <button onClick={() => cyclePriority(t)} title="Click to change priority">
                  <Badge className={cn(priorityStyles[t.priority].badge, 'cursor-pointer transition hover:opacity-80', t.done && 'opacity-50')}>
                    {priorityStyles[t.priority].label}
                  </Badge>
                </button>
                <IconButton label="Delete task" onClick={() => deleteTask(t.id)} className="h-7 w-7 opacity-100 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3 dark:border-white/[0.05] sm:px-5">
        <p className="text-xs text-zinc-500">{unfinished ? `${unfinished} unfinished` : 'All clear ✨'}</p>
        <Button size="sm" onClick={moveUnfinishedToTomorrow} disabled={unfinished === 0}>
          <ArrowRightToLine className="h-3.5 w-3.5" /> Move unfinished to tomorrow
        </Button>
      </div>
    </section>
  );
}
