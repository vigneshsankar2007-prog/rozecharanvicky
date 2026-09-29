import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { PrimaryButton, SecondaryButton } from '../components/common';
import { User } from '../types';

export function AuthScreen({
  onAuthSuccess,
}: {
  onAuthSuccess: (user: User) => void;
}) {
  const [isSplash, setIsSplash] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('vs2513@srmist.edu.in');
  const [password, setPassword] = useState('student123');
  const [confirmPassword, setConfirmPassword] = useState('student123');

  // Splash Screen loading animation (Section 5)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Full Name cannot be empty.');
        if (!email.trim() || !email.includes('@')) throw new Error('A valid email address is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (password !== confirmPassword) throw new Error('Password confirmation does not match.');

        const res = await api.auth.register(name, email, password, confirmPassword);
        onAuthSuccess(res.user);
      } else {
        if (!email.trim()) throw new Error('Please enter your email.');
        if (!password) throw new Error('Please enter your password.');

        const res = await api.auth.login(email, password);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Splash Screen
  if (isSplash) {
    return (
      <div className="min-h-[600px] h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white select-none">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg animate-pulse">
              DG
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shadow">
            <Sparkles className="w-3 h-3 text-slate-900" />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          DeadlineGuard AI
        </h1>
        <p className="text-xs font-medium text-indigo-200 tracking-widest uppercase mb-8">
          Never Miss a Deadline.
        </p>

        <div className="flex items-center gap-2 text-xs text-indigo-300/80 font-mono">
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          <span>Verifying student session...</span>
        </div>
      </div>
    );
  }

  // 2. Login / Register Screen
  return (
    <div className="min-h-[600px] h-full flex flex-col justify-center px-6 py-10 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-sm w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md mx-auto mb-3">
            DG
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Student Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login' 
              ? 'Sign in to access your intelligent deadline matrix' 
              : 'Join DeadlineGuard AI and never miss a college deadline'}
          </p>
        </div>

        {/* Demo Credential Banner */}
        <div className="p-3 mb-5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Academic Demo Account</span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
              Email: <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">vs2513@srmist.edu.in</code> · Password: <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">student123</code>
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vignesh Sundar"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <PrimaryButton
              type="submit"
              loading={loading}
            >
              {mode === 'login' ? 'Login' : 'Create Account'}
            </PrimaryButton>
          </div>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {mode === 'login' 
              ? "Don't have an account? Create Account" 
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
