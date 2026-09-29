import React from 'react';
import { 
  Home, 
  CheckSquare, 
  Calendar, 
  Sparkles, 
  User, 
  Bell, 
  Timer, 
  BookOpen, 
  Smartphone, 
  Maximize2,
  Moon,
  Sun
} from 'lucide-react';

export type TabType = 'home' | 'tasks' | 'planner' | 'ai' | 'profile';

export function BottomNavigationBar({
  currentTab,
  onTabChange,
  notificationCount = 0,
}: {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  notificationCount?: number;
}) {
  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'planner', label: 'Planner', icon: Calendar },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="relative z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 py-1.5 transition-colors">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div 
                className={`relative px-3 py-1 rounded-full transition-all ${
                  isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.id === 'ai' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Android 3-button or pill gesture bar indicator */}
      <div className="w-28 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-1 mb-0.5 opacity-60" />
    </nav>
  );
}

export function AppTopBar({
  title = 'DeadlineGuard AI',
  subtitle,
  onOpenNotifications,
  onOpenFocusMode,
  onOpenSubjects,
  unreadNotifications = 0,
  isPhoneFrame,
  onToggleFrame,
  isDark,
  onToggleDark,
}: {
  title?: string;
  subtitle?: string;
  onOpenNotifications?: () => void;
  onOpenFocusMode?: () => void;
  onOpenSubjects?: () => void;
  unreadNotifications?: number;
  isPhoneFrame?: boolean;
  onToggleFrame?: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        {/* Brand / Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            DG
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                AI
              </span>
            </div>
            {subtitle ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {subtitle}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Never Miss a Deadline.
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1.5">
          {onOpenFocusMode && (
            <button
              onClick={onOpenFocusMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title="Start Focus Timer"
            >
              <Timer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {onOpenSubjects && (
            <button
              onClick={onOpenSubjects}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Course Subjects"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          )}

          {/* Theme Switcher */}
          {onToggleDark && (
            <button
              onClick={onToggleDark}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile phone frame toggle */}
          {onToggleFrame && (
            <button
              onClick={onToggleFrame}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isPhoneFrame ? 'Expand to Fluid Screen' : 'View in Android Phone Frame'}
            >
              {isPhoneFrame ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-indigo-600" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Android Phone Status Bar Simulation (Time, WiFi, 5G, Battery)
export function AndroidStatusBar() {
  const [timeStr, setTimeStr] = React.useState('9:41');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 px-6 pt-1 flex items-center justify-between text-[11px] font-semibold tracking-tight text-slate-700 dark:text-slate-200 select-none bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/40">
      <span>{timeStr}</span>
      {/* Front camera notch */}
      <div className="w-3.5 h-3.5 rounded-full bg-slate-900 dark:bg-slate-950 border border-slate-700 mx-auto" />
      <div className="flex items-center gap-1.5 text-[10px]">
        <span>5G</span>
        <div className="w-2.5 h-2.5 border border-current rounded-xs flex items-center justify-center p-0.5">
          <div className="w-full h-full bg-current rounded-xs" />
        </div>
        <span>88%</span>
      </div>
    </div>
  );
}
