import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Clock, 
  Play, 
  CheckCircle2, 
  BookOpen, 
  Flame, 
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Check
} from 'lucide-react';
import { PlannerData, Task, Subject } from '../types';
import { api } from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { LoadingState, ErrorState, PrimaryButton, SecondaryButton } from '../components/common';

export function PlannerScreen({
  plannerData,
  subjects,
  loading,
  error,
  onRefresh,
  onStartFocus,
  onExplainPriority,
  onAskAI,
}: {
  plannerData: PlannerData | null;
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onStartFocus: (task: Task) => void;
  onExplainPriority: (task: Task) => void;
  onAskAI: (task?: Task) => void;
}) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'thisWeek'>('today');
  const [availableHours, setAvailableHours] = useState(4);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);

  const handleGenerateAIStudyPlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await api.ai.generateStudyPlan(availableHours, activeTab);
      setGeneratedPlan(res);
    } catch (err: any) {
      console.error('Error generating AI study plan:', err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading && !plannerData) {
    return <LoadingState message="Organizing your study planner..." />;
  }

  if (error && !plannerData) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  if (!plannerData) return null;

  const currentTasks = 
    activeTab === 'today' ? plannerData.today :
    activeTab === 'tomorrow' ? plannerData.tomorrow : plannerData.thisWeek;

  return (
    <div className="space-y-5 pb-20">
      {/* Title */}
      <div className="pt-2">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Study Planner
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Schedule tasks by urgency, cognitive difficulty, and study blocks.
        </p>
      </div>

      {/* AI Study Planner Card (Section 17) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border border-indigo-800/40 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Gemini AI Study Architect</h3>
              <p className="text-[11px] text-indigo-200/80">Generates optimal time allocations based on your actual deadlines</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-300">Available study time:</span>
          <div className="flex items-center gap-1">
            {[2, 3, 4, 6].map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => setAvailableHours(hrs)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  availableHours === hrs
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {hrs}h
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateAIStudyPlan}
            disabled={generatingPlan}
            className="ml-auto px-3 py-1.5 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            {generatingPlan ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Generate Study Plan</span>
          </button>
        </div>

        {/* AI Generated Plan Output */}
        {generatedPlan && (
          <div className="mt-3 pt-3 border-t border-indigo-800/50 space-y-3 animate-in fade-in duration-200">
            <p className="text-xs text-indigo-200 leading-relaxed italic">
              "{generatedPlan.summary}"
            </p>

            {/* Time Blocks */}
            <div className="space-y-2">
              {generatedPlan.blocks?.map((block: any, idx: number) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-semibold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                      {block.timeRange}
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-xs">{block.taskTitle}</h4>
                      <p className="text-[11px] text-slate-300 line-clamp-1">{block.focusObjective}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const matched = currentTasks.find((t) => t.title.toLowerCase() === block.taskTitle.toLowerCase()) || currentTasks[0];
                      if (matched) onStartFocus(matched);
                    }}
                    className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white flex-shrink-0"
                    title="Start Focus Mode"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>

            {/* Study tips */}
            {generatedPlan.studyTips && (
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/30 text-[11px] text-purple-200 space-y-1">
                <span className="font-semibold flex items-center gap-1 text-purple-300">
                  <Lightbulb className="w-3.5 h-3.5" /> High-Performance Advice:
                </span>
                {generatedPlan.studyTips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-purple-400">·</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs: Today, Tomorrow, This Week */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
        {(['today', 'tomorrow', 'thisWeek'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center rounded-lg transition-all capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'today' ? "Today's Schedule" : tab === 'tomorrow' ? 'Tomorrow' : 'This Week'}
          </button>
        ))}
      </div>

      {/* Scheduled Timeline & Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {activeTab === 'today' ? 'Deadlines Due Today' : activeTab === 'tomorrow' ? 'Deadlines Due Tomorrow' : 'Upcoming Deadlines This Week'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {currentTasks.length} task{currentTasks.length === 1 ? '' : 's'}
          </span>
        </div>

        {currentTasks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No deadlines due in this period.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Check the other tabs or schedule an advance study block.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTasks.map((task) => {
              const subj = subjects.find((s) => s.id === task.subjectId);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  subject={subj}
                  onClick={() => onExplainPriority(task)}
                  onExplainPriority={onExplainPriority}
                  onStartFocus={onStartFocus}
                  onAskAI={onAskAI}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Suggested Fixed Routine Time Blocks (Section 16) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-600" />
          Recommended Academic Time Blocks
        </h4>

        <div className="space-y-2">
          {plannerData.scheduledBlocks?.map((sb, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md">
                  {sb.timeRange}
                </span>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{sb.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{sb.subjectName} · {sb.type}</div>
                </div>
              </div>

              {sb.completed ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Done
                </span>
              ) : (
                <button
                  onClick={() => {
                    const matched = currentTasks.find((t) => t.id === sb.taskId) || currentTasks[0];
                    if (matched) onStartFocus(matched);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" /> Focus
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
