"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { ArrowLeft, BrainCircuit, Activity, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EmotionalLog {
  time: string;
  stressScore: number;
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

// ─── COMPONENTS ────────────────────────────────────────────────────────────────

// B. Neural Balance Index (Hero Component)
const NeuralBalanceIndex = ({ ratio }: { ratio: number }) => {
  const strokeWidth = 2;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ratio * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-8 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl h-full min-h-[400px]">
      <h3 className="absolute top-6 left-8 text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">Your Balance</h3>
      
      <div className="relative flex items-center justify-center my-8">
        <svg className="w-52 h-52 transform -rotate-90">
          <circle
            cx="104" cy="104" r={radius}
            stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none"
          />
          <motion.circle
            cx="104" cy="104" r={radius}
            stroke="#FFFFFF" strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2.5, ease: "circOut" }}
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-heading text-6xl text-white font-light tracking-tighter leading-none">
            {(ratio * 100).toFixed(0)}<span className="text-2xl text-white/20 ml-1">%</span>
          </span>
          <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-mono mt-3">Refreshed</span>
        </div>
      </div>

      <div className="w-full space-y-4 mt-4">
        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-white/30">
          <span>Healing Energy</span>
          <span className="text-white/60">{ratio > 0.6 ? 'Healthy' : 'Draining'}</span>
        </div>
        <div className="h-[1px] w-full bg-white/10 relative overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute inset-y-0 left-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};

// C. Neural Glow Heatmap (Optimized & Stable)
const NeuralHeatmap = React.memo(({ data }: { data: number[][] }) => {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  return (
    <div className="p-8 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">Weekly Reflection</h3>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-[9px] font-mono text-white/20 uppercase tracking-widest">
             <div className="w-1.5 h-1.5 bg-white opacity-10 rounded-full" /> Calm
           </div>
           <div className="flex items-center gap-2 text-[9px] font-mono text-white/80 uppercase tracking-widest">
             <div className="w-1.5 h-1.5 bg-white shadow-[0_0_5px_white] rounded-full" /> High Stress
           </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        {days.map((day, dIdx) => (
          <div key={day} className="flex items-center gap-4">
            <span className="text-[10px] text-white/20 font-mono w-8 tracking-widest">{day}</span>
            <div className="flex-1 flex gap-[3px]">
              {data[dIdx]?.map((stress, hIdx) => {
                const isHighStress = stress > 0.65;
                
                return (
                  <motion.div
                    key={hIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.005 * (dIdx * 24 + hIdx) }}
                    className={`flex-1 h-6 rounded-[1px] transition-all duration-500 ${
                      isHighStress 
                      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)] opacity-100' 
                      : 'bg-white/10 opacity-30 hover:opacity-50'
                    }`}
                    style={{
                      opacity: isHighStress ? 1 : Math.max(0.1, stress * 0.5)
                    }}
                  />
                );
              }) || Array.from({ length: 24 }).map((_, hIdx) => <div key={hIdx} className="flex-1 h-6 bg-white/5 rounded-[1px]" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// D. Semantic Sentiment Tags
const SemanticTags = ({ tags }: { tags: string[] }) => {
  return (
    <div className="p-8 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl h-full">
      <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-6">How You Feel</h3>
      <div className="flex flex-col gap-3">
        {tags.length > 0 ? tags.slice(0, 3).map((tag, idx) => (
          <motion.div
            key={tag}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + idx * 0.1 }}
            className="flex items-center justify-between group cursor-default"
          >
            <span className="text-xs text-white/60 font-mono uppercase tracking-widest group-hover:text-white transition-colors">
              {tag}
            </span>
            <div className="h-[1px] flex-1 mx-4 bg-white/5 group-hover:bg-white/20 transition-colors" />
            <span className="text-[10px] text-white/30 font-mono">0{3 - idx}</span>
          </motion.div>
        )) : (
          <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest">No triggers logged</p>
        )}
      </div>
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function NeuralAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<WeeklyData[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Emotional Logs (Daily)
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
          time: doc.data().timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
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
        
        // Aggregate weekly data by day
        const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyAgg: Record<string, { stress: number[], count: number, contexts: string[] }> = {};
        
        rawWeeklyLogs.forEach(log => {
          const date = log.timestamp.toDate();
          const dayName = daysArr[date.getDay()];
          if (!weeklyAgg[dayName]) weeklyAgg[dayName] = { stress: [], count: 0, contexts: [] };
          weeklyAgg[dayName].stress.push(log.stressScore);
          weeklyAgg[dayName].count++;
          weeklyAgg[dayName].contexts.push(log.context);
        });

        const formattedWeekly = daysArr.map(day => {
          const data = weeklyAgg[day];
          if (!data) return { day, stressScore: 0, balance: 1, peakContext: 'N/A' };
          
          const avgStress = data.stress.reduce((a, b) => a + b, 0) / data.count;
          return {
            day,
            stressScore: avgStress,
            balance: 1 - avgStress, 
            peakContext: data.contexts[0] || 'Routine'
          };
        });
        setWeeklyLogs(formattedWeekly);

        // 3. Generate Heatmap from Weekly Logs
        const newHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
        rawWeeklyLogs.forEach(log => {
          const date = log.timestamp.toDate();
          const dIdx = (date.getDay() + 6) % 7; // MON=0
          const hIdx = date.getHours();
          newHeatmap[dIdx][hIdx] = log.stressScore;
        });
        setHeatmapData(newHeatmap);

        // 4. Fetch Schedules for Balance Index
        const schedRef = collection(db, "user_schedules");
        const schedQuery = query(schedRef, where("userId", "==", user.uid));
        const schedSnapshot = await getDocs(schedQuery);
        setSchedules(schedSnapshot.docs.map(doc => doc.data()) as Schedule[]);

        // 5. Extract Unique Tags
        const allTags = Array.from(new Set(rawWeeklyLogs.map(l => l.context).filter(Boolean)));
        setTags(allTags as string[]);

      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const { totalAcademic, totalRestoration } = useMemo(() => {
    let acad = 0;
    let rest = 0;
    schedules.forEach(s => {
      if (s.type === 'academic') acad += s.durationHours || 0;
      if (s.type === 'restoration') rest += s.durationHours || 0;
    });
    return { totalAcademic: acad, totalRestoration: rest };
  }, [schedules]);

  const balanceRatio = useMemo(() => {
    const total = totalAcademic + totalRestoration;
    return total > 0 ? totalRestoration / total : 0;
  }, [totalAcademic, totalRestoration]);

  const peakStress = useMemo(() => {
    if (emotionalLogs.length === 0) return null;
    return [...emotionalLogs].sort((a, b) => b.stressScore - a.stressScore)[0];
  }, [emotionalLogs]);

  const weeklyOverview = useMemo(() => {
    if (weeklyLogs.length === 0) return { avgStress: 0, busiestDay: { day: 'N/A', stressScore: 0 } };
    const validLogs = weeklyLogs.filter(l => l.stressScore > 0);
    if (validLogs.length === 0) return { avgStress: 0, busiestDay: { day: 'N/A', stressScore: 0 } };
    
    const avgStress = validLogs.reduce((acc, curr) => acc + curr.stressScore, 0) / validLogs.length;
    const busiestDay = [...validLogs].sort((a, b) => b.stressScore - a.stressScore)[0];
    return { avgStress, busiestDay };
  }, [weeklyLogs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">Syncing Neural Data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black font-sans pb-40 overflow-y-auto overflow-x-hidden">
      {/* Subtle Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.02] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 relative z-10 flex flex-col gap-10">
        
        {/* HEADER */}
        <header className="flex justify-between items-start pt-4">
          <div className="space-y-4">
            <Link href="/dashboard" className="text-white/30 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] group">
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-5xl md:text-7xl font-heading font-light tracking-tighter uppercase leading-none">
              Your Mind <span className="text-white/20 italic">Analytics</span>
            </h1>
          </div>

        </header>

        {/* MAIN GRID LAYOUT: 70/30 SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-10">
          
          {/* LEFT COLUMN (70%): TIMELINE & DISTRIBUTION */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            
            {/* A. Pulse Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">Stress Waves</h3>
                  <p className="text-[11px] text-white/20 font-mono">
                    {timeframe === 'daily' ? 'Your emotional flow through the day' : 'Your stress levels across the week'}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                    <button 
                      onClick={() => setTimeframe('daily')}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest transition-all ${timeframe === 'daily' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => setTimeframe('weekly')}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-widest transition-all ${timeframe === 'weekly' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >
                      Weekly
                    </button>
                  </div>
                  
                  <div className="flex gap-6 text-[9px] uppercase tracking-[0.3em] font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-[2px] bg-white"/> <span className="text-white/80">Stress Level</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={(timeframe === 'daily' ? emotionalLogs : weeklyLogs) as any[]} 
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey={timeframe === 'daily' ? "time" : "day"} 
                      stroke="rgba(255,255,255,0.05)" 
                      tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace' }} 
                      tickLine={false}
                      axisLine={false}
                      dy={15}
                    />
                    <YAxis hide domain={[0, 1]} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const val = payload[0].value as number;
                          const isPeak = timeframe === 'daily' ? val > 0.8 : val > 0.7;
                          if (!isPeak) return null; 
                          
                          return (
                            <div className="bg-black border border-white/20 p-3 rounded-sm backdrop-blur-xl">
                              <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">
                                {timeframe === 'daily' ? payload[0].payload.time : payload[0].payload.day}
                              </p>
                              <p className="text-xs font-heading text-white tracking-tighter">
                                {timeframe === 'daily' ? 'STRESS PEAK' : 'PEAK LOAD'}: <span className="text-white">{(val * 100).toFixed(0)}%</span>
                              </p>
                              <p className="text-[9px] font-mono text-white/60 mt-1 uppercase italic">
                                {timeframe === 'daily' ? `Reason: ${payload[0].payload.context}` : `Busiest: ${payload[0].payload.peakContext}`}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="stressScore" 
                      stroke="#FFFFFF" 
                      strokeWidth={1}
                      fillOpacity={1} 
                      fill="url(#chartGradient)" 
                      animationDuration={3000}
                    />
                    {(timeframe === 'daily' ? emotionalLogs : weeklyLogs).map((entry: any, index) => {
                      const val = entry.stressScore;
                      const isPeak = timeframe === 'daily' ? val > 0.8 : val > 0.7;
                      return isPeak && (
                        <ReferenceDot 
                          key={index} 
                          x={timeframe === 'daily' ? entry.time : entry.day} 
                          y={val} 
                          r={3} 
                          fill="#FFFFFF" 
                          stroke="#000" 
                          strokeWidth={2}

                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* B. Heatmap */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <NeuralHeatmap data={heatmapData} />
            </motion.div>
          </div>

          {/* RIGHT COLUMN (30%): HERO & ANALYSIS */}
          <div className="lg:col-span-3 flex flex-col gap-10">
            
            {/* C. Hero Balance Index */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <NeuralBalanceIndex ratio={balanceRatio} />
            </motion.div>

            {/* D. Distilled Tags */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
              <SemanticTags tags={tags} />
            </motion.div>

            {/* E. Mindy's Diagnosis */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 1.5 }}
              className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden group h-full"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-white/20 group-hover:bg-white/40 transition-colors" />
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono mb-6 flex items-center gap-2">
                <BrainCircuit size={12} className="text-white/60" /> Mindy's Reflections
              </h3>
              <p className="text-lg md:text-xl font-light leading-[1.8] text-white/80 font-sans">
                {(!peakStress && timeframe === 'daily') || (weeklyLogs.length === 0 && timeframe === 'weekly') ? (
                  "I'm currently waiting for more data to flow in. Start your day and I'll begin mapping your mind patterns."
                ) : timeframe === 'daily' ? (
                  <>
                    "I noticed some <span className="text-white font-medium italic">stress spikes</span> during <span className="border-b border-white/20">{peakStress?.context}</span>. 
                    <br/><br/>
                    Maybe try a bit of <span className="text-white underline decoration-white/20 underline-offset-4">Acoustic Healing</span> right after class to find your calm again?"
                  </>
                ) : (
                  <>
                    "Your weekly average stress is at <span className="text-white font-medium italic">{(weeklyOverview.avgStress * 100).toFixed(0)}%</span>. 
                    <br/><br/>
                    <span className="border-b border-white/20">{weeklyOverview.busiestDay.day}</span> was your most demanding day. Consider shifting some tasks to the weekend to preserve your balance."
                  </>
                )}
              </p>
              <div className="mt-8 flex justify-end">
                 <Zap size={16} className="text-white/10" />
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </main>
  );
}
