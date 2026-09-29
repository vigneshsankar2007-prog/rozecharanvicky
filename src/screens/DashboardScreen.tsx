import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Flame, 
  ArrowRight, 
  BrainCircuit, 
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { DashboardData, Task, Subject } from '../types';
import { StatCard, PriorityBadge, DeadlineCountdown, LoadingState, ErrorState } from '../components/common';
import { TaskCard } from '../components/TaskCard';

export function DashboardScreen({
  data,
  loading,
  error,
  onRefresh,
  onOpenCreateTask,
  onOpenTaskDetail,
  onExplainPriority,
  onStartFocus,
  onAskAI,
  onCompleteTask,
  onReopenTask,
  onNavigateToTab,
}: {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenCreateTask: () => void;
  onOpenTaskDetail: (task: Task) => void;
  onExplainPriority: (task: Task) => void;
  onStartFocus: (task: Task) => void;
  onAskAI: (task?: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onReopenTask: (taskId: string) => void;
  onNavigateToTab: (tab: any) => void;
}) {
  if (loading && !data) {
    return <LoadingState message="Loading your deadline matrix..." />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  if (!data) return null;

  // Determine dynamic time-based greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17) timeGreeting = 'Good evening';

  const userFirstName = data.user.name.split(' ')[0] || 'Student';

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Greeting Section */}
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Student Dashboard
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {timeGreeting}, {userFirstName} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Let's secure your deadlines with intelligent priority.
          </p>
        </div>

        <button
          onClick={onOpenCreateTask}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm active:scale-95 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* 2. Overdue Alert Banner (Section 34 Priority Order #1) */}
      {data.overview.tasksOverdue > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-600 text-white flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Immediate Action Needed: {data.overview.tasksOverdue} Overdue Task{data.overview.tasksOverdue === 1 ? '' : 's'}
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
              These deadlines have passed. Submit today to minimize late grade penalties.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('tasks')}
            className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-0.5 self-center flex-shrink-0"
          >
            Review <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. AI Insight Card (Section 8 & 19) */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white border border-indigo-800/50 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
            AI Guard Recommendation
          </div>
          <button
            onClick={() => onAskAI()}
            className="text-[11px] font-semibold text-indigo-200 hover:text-white flex items-center gap-1 transition-colors"
          >
            Ask AI Assistant <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <p className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed pr-2">
          "{data.aiInsight}"
        </p>

        {data.topPriorities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-indigo-800/40 flex items-center justify-between text-xs">
            <span className="text-indigo-200/80">
              Highest urgency: <span className="font-semibold text-white">{data.topPriorities[0].title}</span>
            </span>
            <button
              onClick={() => onStartFocus(data.topPriorities[0])}
              className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-[11px] transition-colors"
            >
              Start 25m Focus
            </button>
          </div>
        )}
      </div>

      {/* 4. Today's Overview Grid (Section 8) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Today's Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatCard
            title="Due Today"
            value={data.overview.tasksDueToday}
            subtitle={data.overview.tasksDueToday > 0 ? 'Urgent attention' : 'All clear today'}
            icon={Clock}
            accentColor="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-500/10"
            onClick={() => onNavigateToTab('tasks')}
          />
          <StatCard
            title="Overdue"
            value={data.overview.tasksOverdue}
            subtitle={data.overview.tasksOverdue > 0 ? 'Needs submission' : '0 overdue'}
            icon={AlertTriangle}
            accentColor="text-rose-600 dark:text-rose-400"
            bgColor="bg-rose-500/10"
            onClick={() => onNavigateToTab('tasks')}
          />
          <StatCard
            title="High Priority"
            value={data.overview.tasksHighPriority}
            subtitle="Critical & High"
            icon={Flame}
            accentColor="text-indigo-600 dark:text-indigo-400"
            bgColor="bg-indigo-500/10"
            onClick={() => onNavigateToTab('tasks')}
          />
          <StatCard
            title="Completed"
            value={data.overview.tasksCompleted}
            subtitle={`${data.productivity.completionPercentage}% of total`}
            icon={CheckCircle2}
            accentColor="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-500/10"
            onClick={() => onNavigateToTab('tasks')}
          />
        </div>
      </div>

      {/* 5. Productivity Summary (Section 8) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Productivity Metric</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Consistent academic progress</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{data.productivity.currentStreakDays} Day Streak!</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {data.productivity.completionPercentage}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Completion</div>
          </div>
          <div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {data.productivity.studyHours}h
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Study Hours</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {data.productivity.tasksCompletedCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Done Tasks</div>
          </div>
        </div>
      </div>

      {/* 6. Top Priorities Section (Section 8 & 34) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Top Priorities
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranked by urgency (40%), difficulty, weight, and workload
            </p>
          </div>

          <button
            onClick={() => onNavigateToTab('tasks')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            All Tasks ({data.overview.tasksPending}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data.topPriorities.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Zero pending deadlines!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You are completely caught up. Add a new assignment or study ahead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.topPriorities.map((task) => {
              const subj = data.subjects.find((s) => s.id === task.subjectId);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  subject={subj}
                  onComplete={onCompleteTask}
                  onReopen={onReopenTask}
                  onClick={onOpenTaskDetail}
                  onExplainPriority={onExplainPriority}
                  onStartFocus={onStartFocus}
                  onAskAI={onAskAI}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Study Session Banner */}
      <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
            Ready for a Focus Block?
          </h4>
          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
            Pomodoro 25/5 or 50/10 intervals logged to your academic transcript.
          </p>
        </div>
        <button
          onClick={() => onNavigateToTab('planner')}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-xs hover:bg-indigo-50 transition-all flex-shrink-0"
        >
          Study Planner
        </button>
      </div>
    </div>
  );
}
