export type Priority = 'high' | 'medium' | 'low';
export type Category = 'Study' | 'Health' | 'Career' | 'Personal';
export type TrackerType = 'boolean' | 'counter' | 'timer';
export type Frequency = 'daily' | 'weekdays' | 'custom';
export type Horizon = '3m' | '6m' | '1y' | '3y' | '5y';
export type Theme = 'light' | 'dark';
export type TabId = 'today' | 'trackers' | 'roadmap';

export interface DailyTask {
  id: string;
  title: string;
  priority: Priority;
  done: boolean;
  /** YYYY-MM-DD the task is scheduled for */
  date: string;
  createdAt: number;
}

export interface Tracker {
  id: string;
  title: string;
  category: Category;
  type: TrackerType;
  /** 1 for boolean, count for counter, minutes for timer */
  target: number;
  unit: string;
  frequency: Frequency;
  /** 0 = Sunday ... 6 = Saturday, used when frequency === 'custom' */
  customDays: number[];
  /** date key -> value logged that day */
  logs: Record<string, number>;
  /** epoch ms when a live timer was started (timer trackers only) */
  runningSince?: number | null;
  createdAt: number;
}

export interface RoadmapTask {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate?: string;
  tasks: RoadmapTask[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: Category;
  horizon: Horizon;
  deadline: string;
  milestones: Milestone[];
  createdAt: number;
}

export interface AppState {
  version: 1;
  theme: Theme;
  tasks: DailyTask[];
  trackers: Tracker[];
  goals: Goal[];
}
