"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, BrainCircuit, MessageCircle, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EmotionalLog {
  time: string;
  stressScore: number;
  energyLevel: number;
  sentimentColor: string;
  context: string;
  timestamp: any;
}

interface WeeklyData {
  day: string;
  stressScore: number;
  balance: number;
  peakContext: string;
}

interface Schedule {
  type: string;
  durationHours: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Derive a meaningful mood label from a stress score (0-1)
const getMoodLabel = (score: number): string => {
  if (score <= 0.2) return "Calm";
  if (score <= 0.4) return "At ease";
  if (score <= 0.55) return "Mildly tense";
  if (score <= 0.7) return "Stressed";
  if (score <= 0.85) return "Overwhelmed";
  return "In distress";
};

const getMoodEmoji = (score: number): string => {
  if (score <= 0.2) return "○";
  if (score <= 0.4) return "◐";
  if (score <= 0.55) return "◑";
  if (score <= 0.7) return "●";
  if (score <= 0.85) return "◉";
  return "◎";
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// A. Balance Ring — capped at 100%
const BalanceRing = ({ ratio }: { ratio: number }) => {
  const safeRatio = Math.min(1, Math.max(0, ratio));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - safeRatio * circumference;
  const label = safeRatio > 0.6 ? "Balanced" : safeRatio > 0.3 ? "Needs care" : "Low";

  return (
    <div className="flex flex-col items-center gap-3 p-6 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl">
      <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono self-start">Your Balance</h3>
      <div className="relative flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={2} fill="none" />
          <motion.circle
            cx="64" cy="64" r={radius}
            stroke="#FFFFFF" strokeWidth={2} fill="none"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "circOut" }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.2))' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl text-white font-light tracking-tighter leading-none">
            {(safeRatio * 100).toFixed(0)}<span className="text-sm text-white/20 ml-0.5">%</span>
          </span>
        </div>
      </div>
      <span className="text-[10px] text-white/30 uppercase tracking-[0.25em] font-mono">{label}</span>
    </div>
  );
};

// B. Mood Summary — derived from actual stressScore, not raw text
const MoodSummary = ({ logs }: { logs: EmotionalLog[] }) => {
  if (logs.length === 0) {
    return (
      <div className="p-6 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl">
        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-4">Today's Mood</h3>
        <p className="text-xs text-white/20 font-mono">Chat with Mindy to start tracking.</p>
      </div>
    );
  }

  const avgStress = logs.reduce((a, b) => a + b.stressScore, 0) / logs.length;
  const latest = logs[logs.length - 1];
  const trend = logs.length >= 2
    ? logs[logs.length - 1].stressScore - logs[0].stressScore
    : 0;

  return (
    <div className="p-6 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl">
      <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-4">Today's Mood</h3>
      <div className="space-y-4">
        {/* Current mood */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg text-white/60">{getMoodEmoji(latest.stressScore)}</span>
            <span className="text-sm text-white/80 font-mono">{getMoodLabel(latest.stressScore)}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-white/30">
            {trend > 0.1 ? <TrendingUp size={12} className="text-white/40" /> 
             : trend < -0.1 ? <TrendingDown size={12} className="text-white/40" /> 
             : <Minus size={12} className="text-white/20" />}
            <span>{trend > 0.1 ? "Rising" : trend < -0.1 ? "Easing" : "Steady"}</span>
          </div>
        </div>

        {/* Average */}
        <div className="flex justify-between items-center text-[10px] font-mono text-white/20 pt-3 border-t border-white/5">
          <span>AVG STRESS TODAY</span>
          <span className="text-white/50">{(avgStress * 100).toFixed(0)}%</span>
        </div>

        {/* Check-ins count */}
        <div className="flex justify-between items-center text-[10px] font-mono text-white/20">
          <span>CHECK-INS</span>
          <span className="text-white/50">{logs.length}</span>
        </div>
      </div>
    </div>
  );
};

// C. Empty State — with CTA to talk to Mindy
const EmptyState = ({ message, showCTA = true }: { message: string; showCTA?: boolean }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 border border-white/5 bg-white/[0.01] rounded-xl">
    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
      <BrainCircuit size={18} className="text-white/20" />
    </div>
    <p className="text-[11px] font-mono text-white/25 uppercase tracking-[0.15em] text-center max-w-[280px] leading-relaxed">
      {message}
    </p>
    {showCTA && (
      <Link
        href="/dashboard"
        className="mt-2 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-mono text-white/50 hover:text-white/80 uppercase tracking-widest transition-all"
      >
        <MessageCircle size={12} /> Talk to Mindy
      </Link>
    )}
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyData[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    // Wait for Firebase Auth to resolve before deciding
    if (authLoading) return;
    // Auth resolved but no user — stop loading, show empty state
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Daily Emotional Logs
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const logsRef = collection(db, "emotional_logs");
        const dailyQuery = query(
          logsRef,
          where("userId", "==", user.uid),
          where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
          orderBy("timestamp", "asc")
        );

        const dailySnapshot = await getDocs(dailyQuery);
        const dailyLogs = dailySnapshot.docs.map(doc => ({
          ...doc.data(),
          time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        })) as EmotionalLog[];
        setEmotionalLogs(dailyLogs);

        // 2. Fetch Weekly Aggregate (Last 7 days)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const weeklyQuery = query(
          logsRef,
          where("userId", "==", user.uid),
          where("timestamp", ">=", Timestamp.fromDate(startOfWeek)),
          orderBy("timestamp", "asc")
        );

        const weeklySnapshot = await getDocs(weeklyQuery);
        const rawWeeklyLogs = weeklySnapshot.docs.map(doc => doc.data());

        const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyAgg: Record<string, { stress: number[], contexts: string[] }> = {};

        rawWeeklyLogs.forEach(log => {
          const date = log.timestamp?.toDate();
          if (!date) return;
          const dayName = daysArr[date.getDay()];
          if (!weeklyAgg[dayName]) weeklyAgg[dayName] = { stress: [], contexts: [] };
          weeklyAgg[dayName].stress.push(log.stressScore);
          if (log.context) weeklyAgg[dayName].contexts.push(log.context);
        });

        const formattedWeekly = daysArr.map(day => {
          const data = weeklyAgg[day];
          if (!data || data.stress.length === 0) return { day, stressScore: 0, balance: 1, peakContext: '' };
          const avgStress = data.stress.reduce((a, b) => a + b, 0) / data.stress.length;
          return {
            day,
            stressScore: avgStress,
            balance: 1 - avgStress,
            peakContext: data.contexts[0] || ''
          };
        });
        setWeeklyLogs(formattedWeekly);

        // 3. Fetch Schedules for Balance Index
        const schedRef = collection(db, "users", user.uid, "user_schedules");
        const schedSnapshot = await getDocs(query(schedRef));
        const rawSchedules = schedSnapshot.docs.map(doc => doc.data()) as any[];

        const calculateHours = (start: string, end: string) => {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          return (eh + em / 60) - (sh + sm / 60);
        };

        const formattedSchedules = rawSchedules.map(s => ({
          ...s,
          durationHours: calculateHours(s.startTime || "0:0", s.endTime || "0:0")
        }));
        setSchedules(formattedSchedules as Schedule[]);

      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  // ─── COMPUTED VALUES ──────────────────────────────────────────────────────────

  const { totalAcademic, totalRestoration } = useMemo(() => {
    let acad = 0, rest = 0;
    schedules.forEach(s => {
      const hours = s.durationHours || 0;
      if (['academic', 'class', 'study'].includes(s.type)) acad += hours;
      if (['restoration', 'rest', 'healing'].includes(s.type)) rest += hours;
    });
    return { totalAcademic: acad, totalRestoration: rest };
  }, [schedules]);

  const balanceRatio = useMemo(() => {
    const total = totalAcademic + totalRestoration;
    if (total === 0) {
      // Fallback: estimate from stress data
      const valid = emotionalLogs.filter(l => l.stressScore > 0);
      if (valid.length === 0) return 0;
      const avgStress = valid.reduce((a, b) => a + b.stressScore, 0) / valid.length;
      return Math.min(1, Math.max(0, 1 - avgStress));
    }
    return Math.min(1, totalRestoration / total); // CAPPED at 100%
  }, [totalAcademic, totalRestoration, emotionalLogs]);

  const peakStress = useMemo(() => {
    if (emotionalLogs.length === 0) return null;
    return [...emotionalLogs].sort((a, b) => b.stressScore - a.stressScore)[0];
  }, [emotionalLogs]);

  const weeklyOverview = useMemo(() => {
    const validLogs = weeklyLogs.filter(l => l.stressScore > 0);
    if (validLogs.length === 0) return { avgStress: 0, busiestDay: null };
    const avgStress = validLogs.reduce((acc, curr) => acc + curr.stressScore, 0) / validLogs.length;
    const busiestDay = [...validLogs].sort((a, b) => b.stressScore - a.stressScore)[0];
    return { avgStress, busiestDay };
  }, [weeklyLogs]);

  // ─── LOADING STATE ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Loading your data...</p>
        </div>
      </div>
    );
  }

  // ─── CHART DATA ───────────────────────────────────────────────────────────────

  const chartData = timeframe === 'daily' ? emotionalLogs : weeklyLogs;
  const chartKey = timeframe === 'daily' ? 'time' : 'day';
  const hasChartData = chartData.length > 0 && chartData.some((d: any) => d.stressScore > 0);

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-[100dvh] w-full bg-[#050505] text-white font-sans overflow-y-auto overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8">

        {/* ── HEADER (compact) ── */}
        <header className="space-y-2 pt-2">
          <Link href="/dashboard" className="text-white/25 hover:text-white/60 transition-colors flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] group">
            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">
            Your Mind <span className="text-white/20">Analytics</span>
          </h1>
        </header>

        {/* ── TOP ROW: Balance + Mood ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <BalanceRing ratio={balanceRatio} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-2">
            <MoodSummary logs={emotionalLogs} />
          </motion.div>
        </div>

        {/* ── STRESS CHART ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="p-6 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">Stress Waves</h3>
              <p className="text-[10px] text-white/15 font-mono mt-1">
                {timeframe === 'daily' ? 'How your stress moved through today' : 'Your stress pattern this week'}
              </p>
            </div>
            <div className="flex bg-white/5 p-0.5 rounded-full border border-white/10">
              <button
                onClick={() => setTimeframe('daily')}
                className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest transition-all ${timeframe === 'daily' ? 'bg-white text-black' : 'text-white/30 hover:text-white/60'}`}
              >Daily</button>
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest transition-all ${timeframe === 'weekly' ? 'bg-white text-black' : 'text-white/30 hover:text-white/60'}`}
              >Weekly</button>
            </div>
          </div>

          <div className="h-[240px] w-full">
            {!hasChartData ? (
              <EmptyState message="No emotional data yet for this period. Chat with Mindy and your stress patterns will appear here." />
            ) : timeframe === 'daily' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData as any[]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey={chartKey}
                    stroke="rgba(255,255,255,0.05)"
                    tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-black/90 border border-white/15 px-3 py-2 rounded-lg backdrop-blur-xl">
                            <p className="text-[9px] font-mono text-white/40 uppercase">{d.time}</p>
                            <p className="text-xs text-white mt-1">{getMoodLabel(d.stressScore)} — {(d.stressScore * 100).toFixed(0)}%</p>
                            {d.context && <p className="text-[9px] font-mono text-white/30 mt-1 italic">{d.context}</p>}
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="stressScore" stroke="#FFFFFF" strokeWidth={1} fillOpacity={1} fill="url(#stressGrad)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData as any[]} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey={chartKey}
                    stroke="rgba(255,255,255,0.05)"
                    tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-black/90 border border-white/15 px-3 py-2 rounded-lg backdrop-blur-xl">
                            <p className="text-[9px] font-mono text-white/40 uppercase">{d.day}</p>
                            <p className="text-xs text-white mt-1">{getMoodLabel(d.stressScore)} — {(d.stressScore * 100).toFixed(0)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="stressScore" fill="rgba(255,255,255,0.25)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* ── MINDY'S REFLECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="p-6 border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-0.5 h-full bg-white/15" />
          <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-4 flex items-center gap-2">
            <BrainCircuit size={12} className="text-white/40" /> Mindy's Reflection
          </h3>
          <p className="text-base font-light leading-[1.8] text-white/60">
            {emotionalLogs.length === 0 && weeklyLogs.filter(l => l.stressScore > 0).length === 0 ? (
              "I'm here whenever you're ready. Start a conversation with me and I'll begin tracking how you're feeling throughout the day."
            ) : timeframe === 'daily' ? (
              peakStress
                ? `Your stress peaked around ${peakStress.time} — "${peakStress.context}". ${
                    peakStress.stressScore > 0.6
                      ? "That's a notable spike. Be gentle with yourself right now."
                      : "Nothing too extreme, but worth checking in with yourself."
                  }`
                : "Your day seems emotionally stable so far. Keep it up."
            ) : (
              `This week your average stress was ${(weeklyOverview.avgStress * 100).toFixed(0)}%. ${
                weeklyOverview.busiestDay
                  ? `${weeklyOverview.busiestDay.day} was the toughest day.`
                  : ''
              } ${
                weeklyOverview.avgStress > 0.6
                  ? "Consider giving yourself more recovery time."
                  : "Your balance is looking reasonable."
              }`
            )}
          </p>
        </motion.div>

      </div>
    </main>
  );
}
