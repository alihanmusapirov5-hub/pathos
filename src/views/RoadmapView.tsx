import { useEffect, useState, type FormEvent } from 'react';
import {
  CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Circle, Flag, MoreHorizontal, Pencil, Plus, Sparkles, Target, Trash2, Wand2, X,
} from 'lucide-react';
import { useStore } from '../store';
import { addMonths, formatDate, relativeDeadline, todayKey } from '../lib/date';
import { CATEGORIES, activeMilestone, categoryStyles, goalProgress, milestoneProgress } from '../lib/logic';
import { HORIZON_LABEL, HORIZON_MONTHS, TEMPLATES } from '../lib/templates';
import type { Category, Goal, Horizon, Milestone } from '../lib/types';
import { Badge, Button, Checkbox, EmptyState, IconButton, Modal, ProgressBar, ProgressRing, cn } from '../components/ui';

export default function RoadmapView() {
  const { state } = useStore();
  const [goalForm, setGoalForm] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const goals = [...state.goals].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const allTasks = state.goals.flatMap((g) => g.milestones.flatMap((m) => m.tasks));
  const overall = allTasks.length ? Math.round((allTasks.filter((t) => t.done).length / allTasks.length) * 100) : 0;
  const milestonesDone = state.goals.flatMap((g) => g.milestones).filter((m) => m.tasks.length && milestoneProgress(m) === 100).length;
  const milestonesTotal = state.goals.flatMap((g) => g.milestones).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Future Roadmap</h1>
          <p className="mt-1 text-sm text-zinc-500">Break long-term goals into milestones and actionable tasks. Progress rolls up automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTemplatesOpen(true)}>
            <Wand2 className="h-4 w-4 text-violet-500" /> Generate sample roadmap
          </Button>
          <Button variant="primary" onClick={() => setGoalForm({ open: true, goal: null })}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <p className="text-[11px] font-medium text-zinc-500">Goals</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{state.goals.length}</p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[11px] font-medium text-zinc-500">Milestones done</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {milestonesDone}/{milestonesTotal}
          </p>
        </div>
        <div className="card px-4 py-3">
          <p className="text-[11px] font-medium text-zinc-500">Overall progress</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{overall}%</p>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="No goals yet"
            description="Define where you want to be in 1–5 years, or start from a template to explore the system."
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTemplatesOpen(true)}>
                  <Wand2 className="h-3.5 w-3.5" /> Use template
                </Button>
                <Button size="sm" variant="primary" onClick={() => setGoalForm({ open: true, goal: null })}>
                  <Plus className="h-3.5 w-3.5" /> New goal
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g, i) => (
            <GoalCard key={g.id} goal={g} defaultOpen={i === 0} onEdit={() => setGoalForm({ open: true, goal: g })} />
          ))}
        </div>
      )}

      <GoalForm open={goalForm.open} goal={goalForm.goal} onClose={() => setGoalForm({ open: false, goal: null })} />
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}

/* -------------------------------- Goal card ------------------------------- */

function GoalCard({ goal, defaultOpen, onEdit }: { goal: Goal; defaultOpen: boolean; onEdit: () => void }) {
  const { deleteGoal, addMilestone } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  const [menu, setMenu] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const progress = goalProgress(goal);
  const cat = categoryStyles[goal.category];
  const active = activeMilestone(goal);
  const taskCount = goal.milestones.reduce((n, m) => n + m.tasks.length, 0);
  const doneCount = goal.milestones.reduce((n, m) => n + m.tasks.filter((t) => t.done).length, 0);
  const overdue = goal.deadline < todayKey() && progress < 100;

  const submitMs = (e: FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim()) return;
    addMilestone(goal.id, msTitle.trim());
    setMsTitle('');
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <ProgressRing value={progress} size={52} stroke={5}>
          <span className="text-xs font-semibold tabular-nums">{progress}%</span>
        </ProgressRing>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={cat.badge}>{goal.category}</Badge>
            <Badge className="bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-400">{HORIZON_LABEL[goal.horizon]}</Badge>
            {progress === 100 && <Badge className="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400">Achieved</Badge>}
          </div>
          <h2 className="mt-1.5 text-base font-semibold leading-snug">{goal.title}</h2>
          {goal.description && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{goal.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-red-500')}>
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(goal.deadline)} · {relativeDeadline(goal.deadline)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {doneCount}/{taskCount} tasks
            </span>
            {active && (
              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Flag className="h-3.5 w-3.5" /> Now: {active.title}
              </span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-0.5">
          <div className="relative">
            <IconButton label="Goal options" onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal className="h-4 w-4" />
            </IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg animate-scale-in dark:border-white/10 dark:bg-[#1a1a1e]">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
                    onClick={() => {
                      setMenu(false);
                      onEdit();
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit goal
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => {
                      setMenu(false);
                      if (confirm(`Delete goal "${goal.title}" with all milestones?`)) deleteGoal(goal.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
          <IconButton label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen((o) => !o)}>
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
          </IconButton>
        </div>
      </div>
      <ProgressBar value={progress} height="h-[3px]" className="rounded-none" barClass={cn('rounded-none', cat.bar)} />

      {open && (
        <div className="animate-fade-in border-t border-zinc-100 bg-zinc-50/50 p-3 dark:border-white/[0.05] dark:bg-white/[0.01] sm:p-5">
          <div className="relative space-y-3">
            {goal.milestones.length > 1 && <div className="absolute bottom-6 left-[19px] top-6 w-px bg-zinc-200 dark:bg-white/[0.08]" />}
            {goal.milestones.map((m, i) => (
              <MilestoneBlock
                key={m.id}
                goal={goal}
                milestone={m}
                index={i}
                isActive={active?.id === m.id}
                isFirst={i === 0}
                isLast={i === goal.milestones.length - 1}
              />
            ))}
          </div>
          <form onSubmit={submitMs} className="mt-3 flex gap-2 pl-0 sm:pl-12">
            <input className="input" placeholder="Add a milestone…" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
            <Button type="submit" disabled={!msTitle.trim()}>
              <Plus className="h-4 w-4" /> Milestone
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ Milestone block ---------------------------- */

function MilestoneBlock({
  goal, milestone, index, isActive, isFirst, isLast,
}: { goal: Goal; milestone: Milestone; index: number; isActive: boolean; isFirst: boolean; isLast: boolean }) {
  const { toggleRoadmapTask, deleteRoadmapTask, addRoadmapTask, deleteMilestone, moveMilestone, updateMilestone, renameRoadmapTask } = useStore();
  const [taskTitle, setTaskTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(milestone.title);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState('');
  const p = milestoneProgress(milestone);
  const complete = milestone.tasks.length > 0 && p === 100;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    addRoadmapTask(goal.id, milestone.id, taskTitle.trim());
    setTaskTitle('');
  };

  const saveTitle = () => {
    if (titleDraft.trim()) updateMilestone(goal.id, milestone.id, { title: titleDraft.trim() });
    else setTitleDraft(milestone.title);
    setEditingTitle(false);
  };

  return (
    <div className="relative flex gap-3">
      <div
        className={cn(
          'relative z-[1] mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition',
          complete
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : isActive
              ? 'border-indigo-500 bg-white text-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.12)] dark:bg-[#0b0b0d] dark:text-indigo-400'
              : 'border-zinc-200 bg-white text-zinc-400 dark:border-white/10 dark:bg-[#0b0b0d]',
        )}
      >
        {complete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
      </div>

      <div className={cn('card min-w-0 flex-1 p-3 sm:p-4', isActive && 'border-indigo-500/30 dark:border-indigo-500/25')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {editingTitle ? (
                <input
                  autoFocus
                  className="input h-8 py-1"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                />
              ) : (
                <h3 className="cursor-text text-sm font-semibold" onDoubleClick={() => setEditingTitle(true)} title="Double-click to rename">
                  {milestone.title}
                </h3>
              )}
              {isActive && <Badge className="bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-300">In progress</Badge>}
              {complete && <Badge className="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400">Complete</Badge>}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar value={p} className="max-w-[220px]" barClass={complete ? 'bg-emerald-500' : 'bg-indigo-500'} />
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {p}% · {milestone.tasks.filter((t) => t.done).length}/{milestone.tasks.length}
              </span>
              <label className="ml-auto hidden shrink-0 items-center gap-1 text-[11px] text-zinc-500 sm:inline-flex">
                <CalendarDays className="h-3 w-3" />
                <input
                  type="date"
                  className="bg-transparent text-[11px] text-zinc-500 outline-none [color-scheme:inherit]"
                  value={milestone.dueDate ?? ''}
                  onChange={(e) => updateMilestone(goal.id, milestone.id, { dueDate: e.target.value || undefined })}
                />
              </label>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <IconButton label="Move up" className="h-7 w-7" disabled={isFirst} onClick={() => moveMilestone(goal.id, milestone.id, -1)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Move down" className="h-7 w-7" disabled={isLast} onClick={() => moveMilestone(goal.id, milestone.id, 1)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Rename milestone" className="h-7 w-7" onClick={() => setEditingTitle(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              label="Delete milestone"
              className="h-7 w-7 hover:text-red-500"
              onClick={() => confirm(`Delete milestone "${milestone.title}"?`) && deleteMilestone(goal.id, milestone.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>

        <ul className="mt-3 space-y-0.5">
          {milestone.tasks.map((t) => (
            <li key={t.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition hover:bg-zinc-50 dark:hover:bg-white/[0.03]">
              <Checkbox checked={t.done} onChange={() => toggleRoadmapTask(goal.id, milestone.id, t.id)} label={t.title} />
              {editingTask === t.id ? (
                <input
                  autoFocus
                  className="input h-7 py-0.5 text-sm"
                  value={taskDraft}
                  onChange={(e) => setTaskDraft(e.target.value)}
                  onBlur={() => {
                    if (taskDraft.trim()) renameRoadmapTask(goal.id, milestone.id, t.id, taskDraft.trim());
                    setEditingTask(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingTask(null);
                  }}
                />
              ) : (
                <span
                  className={cn('min-w-0 flex-1 cursor-text text-sm transition', t.done && 'text-zinc-400 line-through decoration-zinc-400/50')}
                  onDoubleClick={() => {
                    setEditingTask(t.id);
                    setTaskDraft(t.title);
                  }}
                >
                  {t.title}
                </span>
              )}
              <IconButton
                label="Delete task"
                className="h-6 w-6 opacity-100 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => deleteRoadmapTask(goal.id, milestone.id, t.id)}
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="mt-1 flex items-center gap-2.5 px-1.5">
          <Circle className="h-[18px] w-[18px] shrink-0 text-zinc-300 dark:text-zinc-700" strokeDasharray="3 3" />
          <input
            className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-zinc-400"
            placeholder="Add a task…"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          {taskTitle.trim() && (
            <Button size="sm" type="submit" variant="primary">
              Add
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

/* --------------------------------- Goal form ------------------------------- */

function GoalForm({ open, goal, onClose }: { open: boolean; goal: Goal | null; onClose: () => void }) {
  const { addGoal, updateGoal } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Career');
  const [horizon, setHorizon] = useState<Horizon>('1y');
  const [deadline, setDeadline] = useState(addMonths(todayKey(), 12));

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setDescription(goal?.description ?? '');
    setCategory(goal?.category ?? 'Career');
    setHorizon(goal?.horizon ?? '1y');
    setDeadline(goal?.deadline ?? addMonths(todayKey(), 12));
  }, [open, goal]);

  const pickHorizon = (h: Horizon) => {
    setHorizon(h);
    setDeadline(addMonths(todayKey(), HORIZON_MONTHS[h]));
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;
    const data = { title: title.trim(), description: description.trim(), category, horizon, deadline };
    if (goal) updateGoal(goal.id, data);
    else addGoal(data);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New long-term goal'}
      description="Where do you want to be? Milestones and tasks come next."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => submit()} disabled={!title.trim()}>
            {goal ? 'Save' : 'Create goal'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="g-title">Goal</label>
          <input id="g-title" autoFocus className="input" placeholder="e.g. Run a marathon" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="g-desc">Why it matters (optional)</label>
          <textarea id="g-desc" rows={2} className="input resize-none" placeholder="Describe the outcome you want…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <span className="label">Category</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition',
                  category === c ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', categoryStyles[c].dot)} /> {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Time horizon</span>
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => pickHorizon(h)}
                className={cn(
                  'rounded-lg border py-2 text-xs font-medium transition',
                  horizon === h ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400',
                )}
              >
                {h.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="g-deadline">Target deadline</label>
          <input id="g-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <p className="mt-1 text-[11px] text-zinc-500">{relativeDeadline(deadline)}</p>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

/* ------------------------------ Templates modal ---------------------------- */

function TemplatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addGoalFromTemplate } = useStore();
  const [generating, setGenerating] = useState<string | null>(null);

  const generate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setGenerating(id);
    // Brief "thinking" delay for the AI-style feel
    setTimeout(() => {
      addGoalFromTemplate(t);
      setGenerating(null);
      onClose();
    }, 900);
  };

  return (
    <Modal open={open} onClose={onClose} wide title="Generate sample roadmap" description="Pick a template — PathOS builds the full goal, milestones and tasks with a realistic timeline.">
      <div className="grid gap-3">
        {TEMPLATES.map((t) => {
          const cat = categoryStyles[t.category];
          const tasks = t.milestones.reduce((n, m) => n + m.tasks.length, 0);
          const busy = generating === t.id;
          return (
            <button
              key={t.id}
              disabled={!!generating}
              onClick={() => generate(t.id)}
              className={cn(
                'group relative flex items-start gap-4 overflow-hidden rounded-xl border border-zinc-200 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-500/[0.03] disabled:opacity-60 dark:border-white/10 dark:hover:border-indigo-400/50',
                busy && '!opacity-100 border-indigo-500',
              )}
            >
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl', cat.soft)}>{t.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{t.name}</h3>
                  <Badge className={cat.badge}>{t.category}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{t.tagline}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.milestones.map((m, i) => (
                    <span key={m.title} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-white/[0.05] dark:text-zinc-400">
                      {i + 1}. {m.title}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  {t.milestones.length} milestones · {tasks} tasks · {HORIZON_LABEL[t.horizon]}
                </p>
              </div>
              <div className="flex shrink-0 items-center self-center">
                {busy ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500">
                    <Sparkles className="h-4 w-4 animate-spin" /> Generating…
                  </span>
                ) : (
                  <Wand2 className="h-4 w-4 text-zinc-300 transition group-hover:text-indigo-500 dark:text-zinc-600" />
                )}
              </div>
              {busy && <div className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
