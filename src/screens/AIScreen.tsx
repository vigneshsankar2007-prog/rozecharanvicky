import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  CheckCircle2,
  Play,
  RotateCcw,
  Zap
} from 'lucide-react';
import { Task, AIRecommendation } from '../types';
import { api } from '../services/api';
import { LoadingState, ErrorState, PriorityBadge } from '../components/common';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function AIScreen({
  tasks,
  onStartFocus,
}: {
  tasks: Task[];
  onStartFocus: (task: Task) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am **DeadlineGuard AI**. I continuously analyze your course deadlines, difficulty levels, and academic workload.\n\nAsk me anything like:\n• *What should I study today?*\n• *Which assignment should I complete first?*\n• *I have 3 hours today. Create a study plan.*",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const recs = await api.ai.getRecommendations();
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    try {
      const res = await api.ai.chat(text);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      // Refresh recommendations if new insights generated
      loadRecommendations();
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an error analyzing your deadlines. Please make sure the backend is reachable and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    'What should I study today?',
    'Which assignment should I complete first?',
    'I have 3 hours today. Create a study plan.',
    'Why is my highest task critical?',
    'How can I finish my pending tasks without burnout?',
  ];

  return (
    <div className="space-y-4 pb-20 flex flex-col h-full">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              DeadlineGuard AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Never Miss a Deadline. Academic workload advisor.
            </p>
          </div>
        </div>
      </div>

      {/* Proactive AI Workload Recommendations (Section 19) */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Active Workload Insights
          </h3>

          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div 
                key={rec.id}
                className="p-3.5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    {rec.title}
                  </h4>
                  <PriorityBadge level={rec.priorityLevel} />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rec.recommendation}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-purple-100 dark:border-purple-900/30">
                  <span>Reason: {rec.rationale}</span>
                  {rec.taskId && (
                    <button
                      onClick={() => {
                        const matched = tasks.find((t) => t.id === rec.taskId);
                        if (matched) onStartFocus(matched);
                      }}
                      className="text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Play className="w-3 h-3 fill-current" /> Start Focus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 overflow-y-auto space-y-3.5 min-h-[320px] max-h-[460px] shadow-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 rounded-tl-xs'
              }`}
            >
              {/* Formatted body */}
              <div className="whitespace-pre-line space-y-1">
                {m.text.split('\n').map((line, idx) => {
                  if (line.startsWith('• ')) {
                    return (
                      <div key={idx} className="flex items-start gap-1 pl-1">
                        <span className="opacity-70 font-bold">›</span>
                        <span>{line.replace('• ', '')}</span>
                      </div>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>

              <div
                className={`text-[10px] mt-1 text-right ${
                  m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl rounded-tl-xs p-3 border border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={sending}
            className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 whitespace-nowrap border border-slate-200/80 dark:border-slate-700 transition-all font-medium text-[11px] disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask DeadlineGuard AI about your courses & deadlines..."
          disabled={sending}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-xs"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xs active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
