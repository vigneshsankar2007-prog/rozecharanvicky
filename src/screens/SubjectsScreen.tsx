import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  GraduationCap, 
  Layers, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Subject, Task } from '../types';
import { api } from '../services/api';
import { PrimaryButton, SecondaryButton, ConfirmDeleteDialog, LoadingState } from '../components/common';

export function SubjectsScreen({
  subjects,
  tasks,
  loading,
  onRefresh,
  onClose,
}: {
  subjects: Subject[];
  tasks: Task[];
  loading: boolean;
  onRefresh: () => void;
  onClose?: () => void;
}) {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [academicWeight, setAcademicWeight] = useState(4);
  const [color, setColor] = useState('#4f46e5');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = [
    '#4f46e5', // Indigo
    '#0d9488', // Teal
    '#ea580c', // Orange
    '#7c3aed', // Purple
    '#e11d48', // Rose
    '#0284c7', // Sky
    '#16a34a', // Emerald
    '#d97706', // Amber
  ];

  const handleOpenCreate = () => {
    setName('');
    setCode('');
    setFacultyName('');
    setAcademicWeight(4);
    setColor('#4f46e5');
    setError(null);
    setIsCreating(true);
    setEditingSubject(null);
  };

  const handleOpenEdit = (sub: Subject) => {
    setName(sub.name);
    setCode(sub.code);
    setFacultyName(sub.facultyName);
    setAcademicWeight(sub.academicWeight);
    setColor(sub.color || '#4f46e5');
    setError(null);
    setEditingSubject(sub);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject Name is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingSubject) {
        await api.subjects.update(editingSubject.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          facultyName: facultyName.trim(),
          academicWeight: Number(academicWeight),
          color,
        });
      } else {
        await api.subjects.create({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          facultyName: facultyName.trim(),
          academicWeight: Number(academicWeight),
          color,
        });
      }
      onRefresh();
      setIsCreating(false);
      setEditingSubject(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.subjects.delete(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Course Subjects
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure academic weight (credits) and faculty details.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Subject List */}
      {loading ? (
        <LoadingState message="Loading course subjects..." />
      ) : (
        <div className="space-y-2.5">
          {subjects.map((sub) => {
            const subjectTasks = tasks.filter((t) => t.subjectId === sub.id);
            const pendingCount = subjectTasks.filter((t) => t.status !== 'Completed').length;
            const completedCount = subjectTasks.filter((t) => t.status === 'Completed').length;

            return (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: sub.color || '#4f46e5' }}
                  >
                    {sub.code ? sub.code.slice(0, 4) : sub.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {sub.name}
                      </h4>
                      {sub.code && (
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {sub.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {sub.facultyName && <span>Prof. {sub.facultyName}</span>}
                      {sub.facultyName && <span>·</span>}
                      <span>{sub.academicWeight} Credits</span>
                      <span>·</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {pendingCount} active deadline{pendingCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Course"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSubjectToDelete(sub)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editingSubject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingSubject ? 'Edit Subject' : 'Add New Course Subject'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingSubject(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 pt-3 text-xs">
              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CS201"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs uppercase font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Faculty Name
                  </label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="Dr. K. Ramanathan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Credit Weight ({academicWeight} Credits)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setAcademicWeight(w)}
                      className={`py-1.5 rounded-lg font-bold text-xs ${
                        academicWeight === w
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {w} cr
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Theme Color Badge
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <SecondaryButton
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSubject(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" loading={saving} className="flex-1">
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={() => {
          if (subjectToDelete) handleDelete(subjectToDelete.id);
        }}
        title="Delete Course Subject?"
        message={`Are you sure you want to remove "${subjectToDelete?.name}"? Associated tasks will remain in your database.`}
      />
    </div>
  );
}
