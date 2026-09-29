import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  TrendingUp, 
  Layers, 
  BookOpen, 
  RefreshCw 
} from 'lucide-react';
import { AnalyticsData } from '../types';
import { api } from '../services/api';
import { StatCard, LoadingState, ErrorState, PriorityBadge } from '../components/common';

export function AnalyticsScreen({
  onClose,
}: {
  onClose?: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analytics.get();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return <LoadingState message="Aggregating academic analytics..." />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchAnalytics} />;
  }

  if (!data) return null;

  const maxWeeklyHours = Math.max(...data.weeklyStudyHours, 4);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Productivity Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time workload metrics and study telemetry.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Grid (Section 21) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <StatCard
          title="Completed"
          value={data.metrics.tasksCompleted}
          subtitle={`${data.metrics.completionRate}% completion rate`}
          icon={CheckCircle2}
          accentColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatCard
          title="Study Hours"
          value={`${data.metrics.studyHours}h`}
          subtitle="Focus session duration"
          icon={Clock}
          accentColor="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-500/10"
        />
        <StatCard
          title="Active Streak"
          value={`${data.metrics.productivityStreakDays} Days`}
          subtitle="Consecutive study days"
          icon={Flame}
          accentColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      {/* Weekly Study Hours Bar Chart (Section 21) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Weekly Study Hours
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Daily focus blocks logged</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {data.metrics.studyHours}h Total
          </span>
        </div>

        {/* Bar Visualizer */}
        <div className="pt-4 pb-1">
          <div className="flex items-end justify-between h-36 gap-2 px-1">
            {data.weeklyDays.map((day, idx) => {
              const hours = data.weeklyStudyHours[idx] || 0;
              const heightPct = Math.round((hours / maxWeeklyHours) * 100);
              const isToday = idx === 6; // Sunday/Today

              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {hours}h
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-full max-h-24 flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isToday
                          ? 'bg-indigo-600 dark:bg-indigo-500'
                          : 'bg-indigo-400/80 dark:bg-indigo-800/80 hover:bg-indigo-500'
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject-wise Workload (Section 21) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Subject-wise Workload Distribution
        </h3>

        <div className="space-y-3">
          {data.subjectWorkload.map((sw) => {
            const total = sw.pendingTasks + sw.completedTasks;
            const completionPct = total > 0 ? Math.round((sw.completedTasks / total) * 100) : 0;

            return (
              <div key={sw.subjectId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: sw.color }} 
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sw.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{sw.code}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {sw.pendingTasks} pending · {completionPct}% done
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${completionPct}%` }}
                  />
                  <div 
                    className="h-full opacity-60 transition-all duration-300"
                    style={{ 
                      backgroundColor: sw.color, 
                      width: `${100 - completionPct}%` 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Distribution Breakdown */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Pending Priority Distribution
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
            <span className="text-rose-600 dark:text-rose-400 font-bold block text-lg font-mono">
              {data.priorityDistribution.Critical}
            </span>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Critical</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <span className="text-amber-600 dark:text-amber-400 font-bold block text-lg font-mono">
              {data.priorityDistribution.High}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">High</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold block text-lg font-mono">
              {data.priorityDistribution.Medium}
            </span>
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Medium</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold block text-lg font-mono">
              {data.priorityDistribution.Low}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}
