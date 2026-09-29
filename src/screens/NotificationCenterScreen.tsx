import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  X,
  Filter
} from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/common';

export function NotificationCenterScreen({
  notifications,
  loading,
  onRefresh,
  onClose,
}: {
  notifications: NotificationItem[];
  loading: boolean;
  onRefresh: () => void;
  onClose?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      onRefresh();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.notifications.delete(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'deadline':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'study':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            Notifications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {unreadCount} unread reminder{unreadCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}

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

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold max-w-[200px]">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
            filter === 'unread'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : filteredNotifs.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={
            filter === 'unread'
              ? 'You have caught up with all reminders and deadline alerts.'
              : 'No alerts currently scheduled.'
          }
          icon={Bell}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`p-3.5 rounded-2xl border transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                n.read
                  ? 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                  : 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-xs font-bold ${n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {n.message}
                </p>

                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span>{new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        Mark read
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(n.id);
                      }}
                      className="p-1 hover:text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
