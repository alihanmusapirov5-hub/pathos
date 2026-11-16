import { addDays, addMonths, todayKey, uid } from './date';
import type { Category, Goal, Horizon } from './types';

export interface RoadmapTemplate {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  category: Category;
  horizon: Horizon;
  description: string;
  milestones: { title: string; tasks: string[] }[];
}

export const HORIZON_MONTHS: Record<Horizon, number> = { '3m': 3, '6m': 6, '1y': 12, '3y': 36, '5y': 60 };
export const HORIZON_LABEL: Record<Horizon, string> = {
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
  '3y': '3 years',
  '5y': '5 years',
};

export const TEMPLATES: RoadmapTemplate[] = [
  {
    id: 'university',
    name: 'University Admission & Exam Prep',
    tagline: 'Diagnostic → mastery → mock exams → applications',
    emoji: '🎓',
    category: 'Study',
    horizon: '1y',
    description: 'Get into a top-choice university with a strong exam score and polished application.',
    milestones: [
      {
        title: 'Diagnostic & study plan',
        tasks: ['Take a full-length diagnostic test', 'List weakest 3 topics from results', 'Build a weekly study schedule', 'Gather prep books and resources'],
      },
      {
        title: 'Core content mastery',
        tasks: ['Finish algebra & functions unit', 'Complete reading comprehension drills', 'Master 500 vocabulary words', 'Review all geometry formulas'],
      },
      {
        title: 'Mock exams & refinement',
        tasks: ['Take mock exam #1 under timed conditions', 'Analyze mistakes and update error log', 'Take mock exam #2', 'Take mock exam #3 and hit target score'],
      },
      {
        title: 'Applications & essays',
        tasks: ['Shortlist 8 universities', 'Draft personal statement', 'Request 2 recommendation letters', 'Submit all applications'],
      },
    ],
  },
  {
    id: 'startup',
    name: 'Launch a Startup MVP',
    tagline: 'Validate → build → launch → first 100 users',
    emoji: '🚀',
    category: 'Career',
    horizon: '6m',
    description: 'Ship a minimum viable product and acquire the first 100 active users.',
    milestones: [
      {
        title: 'Problem validation',
        tasks: ['Interview 15 potential customers', 'Write a one-page problem statement', 'Analyze 5 competitors', 'Define the core value proposition'],
      },
      {
        title: 'Design & build MVP',
        tasks: ['Sketch user flows & wireframes', 'Choose tech stack and set up repo', 'Build authentication & core feature', 'Run internal QA pass'],
      },
      {
        title: 'Launch',
        tasks: ['Create landing page with waitlist', 'Prepare launch post for Product Hunt', 'Onboard 20 beta users', 'Publicly launch v1.0'],
      },
      {
        title: 'Traction',
        tasks: ['Set up analytics & retention dashboard', 'Ship 3 improvements from feedback', 'Reach 100 active users'],
      },
    ],
  },
  {
    id: 'fitness',
    name: 'Athletic & Fitness Transformation',
    tagline: 'Baseline → foundation → progressive overload → peak',
    emoji: '💪',
    category: 'Health',
    horizon: '6m',
    description: 'Build strength, endurance and lasting habits — run a 10K and hit new personal records.',
    milestones: [
      {
        title: 'Baseline & setup',
        tasks: ['Record starting weight & measurements', 'Test 1-rep max on key lifts', 'Time a 5K run', 'Plan weekly meal prep'],
      },
      {
        title: 'Foundation phase (8 weeks)',
        tasks: ['Complete 24 strength sessions', 'Run 3x per week for 4 weeks', 'Hit protein goal 5 days a week', 'Sleep 7+ hours for 21 nights'],
      },
      {
        title: 'Progressive overload',
        tasks: ['Increase squat by 20%', 'Run a sub-30 minute 5K', 'Add mobility routine 3x per week'],
      },
      {
        title: 'Peak performance',
        tasks: ['Complete a 10K race', 'Re-test all 1-rep maxes', 'Take progress photos & reflect'],
      },
    ],
  },
];

export function goalFromTemplate(t: RoadmapTemplate): Goal {
  const start = todayKey();
  const deadline = addMonths(start, HORIZON_MONTHS[t.horizon]);
  const totalDays = Math.max(1, (new Date(deadline).getTime() - new Date(start).getTime()) / 86_400_000);
  return {
    id: uid(),
    title: t.name,
    description: t.description,
    category: t.category,
    horizon: t.horizon,
    deadline,
    createdAt: Date.now(),
    milestones: t.milestones.map((m, i) => ({
      id: uid(),
      title: m.title,
      dueDate: addDays(start, Math.round((totalDays * (i + 1)) / t.milestones.length)),
      tasks: m.tasks.map((title) => ({ id: uid(), title, done: false, completedAt: null })),
    })),
  };
}
