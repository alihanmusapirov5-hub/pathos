import { useEffect, useState } from 'react';
import { Activity, CalendarCheck, Map, Moon, Settings, Sun } from 'lucide-react';
import { useStore } from './store';
import { todayKey } from './lib/date';
import { computeFocus, isComplete, isScheduled } from './lib/logic';
import type { TabId } from './lib/types';
import { IconButton, cn } from './components/ui';
import SettingsModal from './components/SettingsModal';
import TodayView from './views/TodayView';
import TrackerMaker from './views/TrackerMaker';
import RoadmapView from './views/RoadmapView';

const TABS: { id: TabId; label: string; short: string; icon: typeof Map }[] = [
  { id: 'today', label: 'Today', short: 'Today', icon: CalendarCheck },
  { id: 'trackers', label: 'Tracker Maker', short: 'Trackers', icon: Activity },
  { id: 'roadmap', label: 'Future Roadmap', short: 'Roadmap', icon: Map },
];

function readTab(): TabId {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'today') as TabId;
}

export default function App() {
  const { state, toggleTheme } = useStore();
  const [tab, setTab] = useState<TabId>(readTab);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (t: TabId) => {
    window.location.hash = t;
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const today = todayKey();
  const badges: Record<TabId, number> = {
    today: state.tasks.filter((t) => !t.done && t.date <= today).length + computeFocus(state.goals).filter((f) => !f.task.done).length,
    trackers: state.trackers.filter((t) => isScheduled(t, today) && !isComplete(t, today)).length,
    roadmap: 0,
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0b0b0d]/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <button onClick={() => navigate('today')} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-500/30">
              <svg viewBox="0 0 32 32" className="h-4 w-4">
                <path d="M8 23 L16 9 L24 23" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">PathOS</span>
          </button>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(t.id)}
                className={cn(
                  'relative inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition',
                  tab === t.id
                    ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-white/[0.08] dark:text-white dark:ring-white/10'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200',
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {badges[t.id] > 0 && (
                  <span className="rounded-full bg-zinc-200 px-1.5 text-[10px] font-semibold tabular-nums text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    {badges[t.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <IconButton label={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {state.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>
            <IconButton label="Settings" onClick={() => setSettings(true)}>
              <Settings className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === 'today' && <TodayView onNavigate={navigate} />}
        {tab === 'trackers' && <TrackerMaker />}
        {tab === 'roadmap' && <RoadmapView />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0b0b0d]/90 sm:hidden">
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              className={cn('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition', tab === t.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500')}
            >
              <span className="relative">
                <t.icon className="h-5 w-5" />
                {badges[t.id] > 0 && (
                  <span className="absolute -right-2.5 -top-1 min-w-[16px] rounded-full bg-indigo-600 px-1 text-[9px] font-bold leading-4 text-white">{badges[t.id]}</span>
                )}
              </span>
              {t.short}
              {tab === t.id && <span className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-indigo-500" />}
            </button>
          ))}
        </div>
      </nav>

      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
