import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Sparkles, 
  Smartphone, 
  Maximize2, 
  BookOpen, 
  Timer, 
  BarChart3,
  Moon, 
  Sun,
  AlertCircle,
  Plus
} from 'lucide-react';
import { 
  User, 
  Task, 
  Subject, 
  DashboardData, 
  PlannerData, 
  NotificationItem,
  TaskPriority 
} from './types';
import { api, storage } from './services/api';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { TasksScreen } from './screens/TasksScreen';
import { PlannerScreen } from './screens/PlannerScreen';
import { AIScreen } from './screens/AIScreen';
import { FocusScreen } from './screens/FocusScreen';
import { SubjectsScreen } from './screens/SubjectsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { NotificationCenterScreen } from './screens/NotificationCenterScreen';
import { ProfileSettingsScreen } from './screens/ProfileSettingsScreen';
import { TaskFormModal } from './screens/TaskFormModal';
import { PriorityExplanationSheet } from './components/common';
import { 
  BottomNavigationBar, 
  AppTopBar, 
  AndroidStatusBar, 
  TabType 
} from './components/Navigation';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Mobile phone frame view vs fluid view
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Auth state
  const [user, setUser] = useState<User | null>(storage.getUser());
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Secondary overlay screens
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'subjects' | 'focus' | 'analytics' | 'notifications'>('none');

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Priority explanation bottom sheet
  const [explainingTask, setExplainingTask] = useState<Task | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  // Data states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [plannerData, setPlannerData] = useState<PlannerData | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply dark mode to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Auth expiration listener
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };
    window.addEventListener('deadlineguard:auth_expired', handleAuthExpired);
    return () => window.removeEventListener('deadlineguard:auth_expired', handleAuthExpired);
  }, []);

  // Check auth session on startup
  useEffect(() => {
    const verifySession = async () => {
      const token = storage.getToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const me = await api.auth.getMe();
        setUser(me);
        storage.setUser(me);
      } catch (err) {
        storage.clearAll();
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    verifySession();
  }, []);

  // Fetch all core application data
  const loadAllData = useCallback(async () => {
    if (!storage.getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const [dash, tList, sList, planner, notifs] = await Promise.all([
        api.dashboard.get().catch(() => null),
        api.tasks.getAll().catch(() => []),
        api.subjects.getAll().catch(() => []),
        api.planner.get().catch(() => null),
        api.notifications.getAll().catch(() => []),
      ]);

      if (dash) setDashboardData(dash);
      setTasks(tList);
      setSubjects(sList);
      if (planner) setPlannerData(planner);
      setNotifications(notifs);
    } catch (err: any) {
      setError(err.message || 'Error loading application data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Actions
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentTab('home');
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setDashboardData(null);
    setTasks([]);
    setSubjects([]);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (taskToEdit) {
      await api.tasks.update(taskToEdit.id, taskData);
    } else {
      await api.tasks.create(taskData);
    }
    setTaskToEdit(null);
    loadAllData();
  };

  const handleDeleteTask = async (taskId: string) => {
    await api.tasks.delete(taskId);
    loadAllData();
  };

  const handleCompleteTask = async (taskId: string) => {
    await api.tasks.complete(taskId);
    loadAllData();
  };

  const handleReopenTask = async (taskId: string) => {
    await api.tasks.reopen(taskId);
    loadAllData();
  };

  const handleResetSeedData = async () => {
    await api.seed.reset();
    await loadAllData();
  };

  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
    setActiveOverlay('focus');
  };

  const handleAskAI = (task?: Task) => {
    setCurrentTab('ai');
    setActiveOverlay('none');
  };

  // If not authenticated, show AuthScreen (Splash + Login/Register)
  if (!user && !checkingAuth) {
    return (
      <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'} flex items-center justify-center p-3 sm:p-6 transition-colors`}>
        <div className={`w-full ${isPhoneFrame ? 'max-w-[420px] rounded-3xl overflow-hidden android-phone-shadow border-4 border-slate-800' : 'max-w-md rounded-2xl shadow-xl'}`}>
          {isPhoneFrame && <AndroidStatusBar />}
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors ${isDark ? 'dark bg-slate-950 text-white' : 'bg-slate-100/90 text-slate-900'} p-0 sm:p-4 select-none`}>
      {/* Top Floating Control Bar on Desktop/Tablet view */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-5xl mb-3 px-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">DeadlineGuard AI</span>
          <span>·</span>
          <span>SRMIST Engineering Edition</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveOverlay(activeOverlay === 'analytics' ? 'none' : 'analytics')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
              activeOverlay === 'analytics' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveOverlay(activeOverlay === 'subjects' ? 'none' : 'subjects')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
              activeOverlay === 'subjects' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Course Subjects</span>
          </button>

          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            {isPhoneFrame ? <Maximize2 className="w-3.5 h-3.5 text-indigo-600" /> : <Smartphone className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{isPhoneFrame ? 'Fluid Mode' : 'Phone Frame'}</span>
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Container: Android Phone Frame or Responsive Fluid View */}
      <div 
        className={`w-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all ${
          isPhoneFrame 
            ? 'max-w-[420px] h-[890px] max-h-[96vh] rounded-[42px] overflow-hidden android-phone-shadow relative' 
            : 'max-w-4xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl relative'
        }`}
      >
        {/* Android Phone Status Bar (Simulated Pixel 8 Pro top notch & indicators) */}
        {isPhoneFrame && <AndroidStatusBar />}

        {/* Material 3 App Top Bar */}
        <AppTopBar
          title="DeadlineGuard AI"
          subtitle={
            currentTab === 'home' ? 'Never Miss a Deadline.' :
            currentTab === 'tasks' ? 'Academic Task Matrix' :
            currentTab === 'planner' ? 'Study Schedule' :
            currentTab === 'ai' ? 'Academic Workload Advisor' : 'Account & Preferences'
          }
          unreadNotifications={unreadNotificationsCount}
          onOpenNotifications={() => setActiveOverlay('notifications')}
          onOpenFocusMode={() => {
            setFocusTask(tasks.find((t) => t.status !== 'Completed') || null);
            setActiveOverlay('focus');
          }}
          onOpenSubjects={() => setActiveOverlay('subjects')}
          isPhoneFrame={isPhoneFrame}
          onToggleFrame={() => setIsPhoneFrame(!isPhoneFrame)}
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
        />

        {/* Scrollable Main Screen Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-3 relative bg-slate-50/50 dark:bg-slate-950/40">
          {/* Secondary Overlays View */}
          {activeOverlay === 'subjects' && (
            <SubjectsScreen
              subjects={subjects}
              tasks={tasks}
              loading={loading}
              onRefresh={loadAllData}
              onClose={() => setActiveOverlay('none')}
            />
          )}

          {activeOverlay === 'focus' && (
            <FocusScreen
              tasks={tasks}
              subjects={subjects}
              selectedTaskFromProps={focusTask}
              onSessionSaved={() => {
                loadAllData();
              }}
              onClose={() => setActiveOverlay('none')}
            />
          )}

          {activeOverlay === 'analytics' && (
            <AnalyticsScreen
              onClose={() => setActiveOverlay('none')}
            />
          )}

          {activeOverlay === 'notifications' && (
            <NotificationCenterScreen
              notifications={notifications}
              loading={loading}
              onRefresh={loadAllData}
              onClose={() => setActiveOverlay('none')}
            />
          )}

          {/* Primary Tab Screens */}
          {activeOverlay === 'none' && (
            <>
              {currentTab === 'home' && (
                <DashboardScreen
                  data={dashboardData}
                  loading={loading}
                  error={error}
                  onRefresh={loadAllData}
                  onOpenCreateTask={() => {
                    setTaskToEdit(null);
                    setIsTaskModalOpen(true);
                  }}
                  onOpenTaskDetail={(t) => setExplainingTask(t)}
                  onExplainPriority={(t) => setExplainingTask(t)}
                  onStartFocus={handleStartFocus}
                  onAskAI={handleAskAI}
                  onCompleteTask={handleCompleteTask}
                  onReopenTask={handleReopenTask}
                  onNavigateToTab={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksScreen
                  tasks={tasks}
                  subjects={subjects}
                  loading={loading}
                  error={error}
                  onRefresh={loadAllData}
                  onOpenCreateTask={() => {
                    setTaskToEdit(null);
                    setIsTaskModalOpen(true);
                  }}
                  onOpenEditTask={(t) => {
                    setTaskToEdit(t);
                    setIsTaskModalOpen(true);
                  }}
                  onDeleteTask={handleDeleteTask}
                  onCompleteTask={handleCompleteTask}
                  onReopenTask={handleReopenTask}
                  onExplainPriority={(t) => setExplainingTask(t)}
                  onStartFocus={handleStartFocus}
                  onAskAI={handleAskAI}
                />
              )}

              {currentTab === 'planner' && (
                <PlannerScreen
                  plannerData={plannerData}
                  subjects={subjects}
                  loading={loading}
                  error={error}
                  onRefresh={loadAllData}
                  onStartFocus={handleStartFocus}
                  onExplainPriority={(t) => setExplainingTask(t)}
                  onAskAI={handleAskAI}
                />
              )}

              {currentTab === 'ai' && (
                <AIScreen
                  tasks={tasks}
                  onStartFocus={handleStartFocus}
                />
              )}

              {currentTab === 'profile' && (
                <ProfileSettingsScreen
                  user={user}
                  isDark={isDark}
                  onToggleDark={() => setIsDark(!isDark)}
                  onLogout={handleLogout}
                  onResetSeedData={handleResetSeedData}
                  onUpdateUser={(u) => setUser(u)}
                />
              )}
            </>
          )}
        </main>

        {/* Material 3 Bottom Navigation Bar */}
        <BottomNavigationBar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setActiveOverlay('none');
            setCurrentTab(tab);
          }}
          notificationCount={unreadNotificationsCount}
        />
      </div>

      {/* Create / Edit Task Modal Form */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        subjects={subjects}
      />

      {/* Priority Explanation Bottom Sheet (Section 13) */}
      <PriorityExplanationSheet
        isOpen={Boolean(explainingTask)}
        onClose={() => setExplainingTask(null)}
        taskTitle={explainingTask?.title || ''}
        priority={explainingTask?.priority}
      />
    </div>
  );
}
