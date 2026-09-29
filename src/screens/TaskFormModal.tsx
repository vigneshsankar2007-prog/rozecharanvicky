import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, AlertCircle, Save } from 'lucide-react';
import { Task, Subject, TaskType } from '../types';
import { PrimaryButton, SecondaryButton } from '../components/common';

export function TaskFormModal({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  subjects,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  taskToEdit?: Task | null;
  subjects: Subject[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('Assignment');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [estimatedEffortHours, setEstimatedEffortHours] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [academicWeight, setAcademicWeight] = useState(4);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setSubjectId(taskToEdit.subjectId);
      setTaskType(taskToEdit.taskType);
      
      const d = new Date(taskToEdit.deadline);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDeadlineDate(`${yyyy}-${mm}-${dd}`);

      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setDeadlineTime(`${hh}:${min}`);

      setEstimatedEffortHours(taskToEdit.estimatedEffortHours || 3);
      setDifficulty(taskToEdit.difficulty || 3);
      setAcademicWeight(taskToEdit.academicWeight || 4);
      setNotes(taskToEdit.notes || '');
    } else {
      // Default: 3 days in future
      const d = new Date(Date.now() + 3 * 86400000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDeadlineDate(`${yyyy}-${mm}-${dd}`);
      setDeadlineTime('23:59');

      setTitle('');
      setDescription('');
      setSubjectId(subjects[0]?.id || '');
      setTaskType('Assignment');
      setEstimatedEffortHours(3);
      setDifficulty(3);
      setAcademicWeight(4);
      setNotes('');
    }
    setError(null);
  }, [taskToEdit, isOpen, subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }
    if (!deadlineDate || !deadlineTime) {
      setError('A valid deadline date and time is required.');
      return;
    }

    const isoString = new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString();
    if (isNaN(new Date(isoString).getTime())) {
      setError('Invalid date format.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        subjectId: subjectId || (subjects[0]?.id || ''),
        taskType,
        deadline: isoString,
        estimatedEffortHours: Number(estimatedEffortHours),
        difficulty: Number(difficulty),
        academicWeight: Number(academicWeight),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {taskToEdit ? 'Edit Academic Task' : 'Create New Academic Task'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Priority engine calculates score automatically on save.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operating Systems Synchronization Lab"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Subject & Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject Course <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code || 'CS'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="Assignment">Assignment</option>
                <option value="Exam">Exam / Midterm</option>
                <option value="Project">Course Project</option>
                <option value="Lab">Lab Sheet / Code</option>
                <option value="Presentation">Presentation</option>
                <option value="Quiz">Quiz</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Deadline Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deadline Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Effort & Difficulty & Weight Sliders */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Estimated Effort: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{estimatedEffortHours} Hours</span>
                </span>
                <span className="text-[10px] text-slate-400">10% formula weight</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="12"
                step="0.5"
                value={estimatedEffortHours}
                onChange={(e) => setEstimatedEffortHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Cognitive Difficulty: <span className="text-amber-600 dark:text-amber-400 font-mono">{difficulty} / 5</span>
                </span>
                <span className="text-[10px] text-slate-400">20% formula weight</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      difficulty === lvl
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Academic Credit Weight: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{academicWeight} / 5</span>
                </span>
                <span className="text-[10px] text-slate-400">20% formula weight</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setAcademicWeight(w)}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      academicWeight === w
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {w} cr
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description & Requirements
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Implement Producer-Consumer with mutex locks and submit report..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Personal Study Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Check professor office hours on Wednesday"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="pt-2">
            <PrimaryButton type="submit" loading={loading} icon={Save}>
              {taskToEdit ? 'Update Task & Recompute Priority' : 'Save Task & Guard Deadline'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
