"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Plus, X, MapPin, Sparkles, Trash2, Edit2, MoreVertical, Calendar as CalendarIcon, Clock } from "lucide-react";
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export interface UserSchedule {
  id: string;
  userId: string;
  title: string;
  location?: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  type: "class" | "study" | "rest" | "healing";
  isAIGenerated: boolean;
  recurrence: {
    isRecurring: boolean;
    frequency?: "weekly" | "daily";
    daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  };
  ai_note?: string;
  status?: string;
  color_logic?: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const START_HOUR = 0; // 12 AM
const END_HOUR = 23; // 11 PM
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SchedulePanel() {
  const { user } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<UserSchedule | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [view, setView] = useState<"week" | "day">("week");
  const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay());
  const [currentTimePos, setCurrentTimePos] = useState(-1); // in pixels

  // Form State
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [type, setType] = useState<UserSchedule["type"]>("class");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isRecurring, setIsRecurring] = useState(true);

  // Calculate current time position
  useEffect(() => {
    const updateTimeLine = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h >= START_HOUR && h <= END_HOUR) {
        const topPx = ((h - START_HOUR) * 60) + m;
        setCurrentTimePos(topPx);
      } else {
        setCurrentTimePos(-1);
      }
    };
    
    updateTimeLine();
    const interval = setInterval(updateTimeLine, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(
      collection(db, "users", user.uid, "user_schedules"),
      orderBy("startTime", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserSchedule[];
      setSchedules(data);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch schedules real-time:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-scroll to 8 AM on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      // 8 AM is 8 * 60 = 480px from top
      scrollContainerRef.current.scrollTop = 460; // Slightly higher to see the 8 AM line clearly
    }
  }, []);

  const resetForm = () => {
    setTitle("");
    setLocation("");
    setStartTime("08:00");
    setEndTime("10:00");
    setType("class");
    setSelectedDays([]);
    setIsRecurring(true);
    setEditingEventId(null);
  };

  const handleOpenAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleOpenEditForm = (event: UserSchedule) => {
    setTitle(event.title);
    setLocation(event.location || "");
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setType(event.type);
    setSelectedDays(event.recurrence?.daysOfWeek || []);
    setIsRecurring(event.recurrence?.isRecurring ?? true);
    setEditingEventId(event.id);
    setSelectedEvent(null);
    setShowAddForm(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || selectedDays.length === 0) return;

    try {
      const scheduleData = {
        userId: user.uid,
        title,
        location,
        startTime,
        endTime,
        type,
        isAIGenerated: false,
        recurrence: {
          isRecurring: isRecurring,
          frequency: isRecurring ? "weekly" : undefined,
          daysOfWeek: selectedDays
        }
      };

      if (editingEventId) {
        // Update
        const docRef = doc(db, "users", user.uid, "user_schedules", editingEventId);
        await updateDoc(docRef, { ...scheduleData, updatedAt: serverTimestamp() });
        setSchedules(prev => prev.map(s => s.id === editingEventId ? { ...s, ...scheduleData } as UserSchedule : s));
      } else {
        // Add
        const docRef = await addDoc(collection(db, "users", user.uid, "user_schedules"), {
          ...scheduleData,
          createdAt: serverTimestamp()
        });
        setSchedules(prev => [...prev, { ...scheduleData, id: docRef.id } as UserSchedule].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      }
      
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      console.error("Error saving schedule:", err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "user_schedules", id));
      setSchedules(prev => prev.filter(s => s.id !== id));
      setSelectedEvent(null);
    } catch (err) {
      console.error("Error deleting schedule:", err);
    }
  };

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const getTypeStyle = (type: UserSchedule["type"]) => {
    switch (type) {
      case "class": return "bg-white/85 backdrop-blur-md text-black border border-white/50";
      case "study": return "bg-transparent text-[#A0A0A0] border border-[#A0A0A0]";
      case "healing": return "bg-transparent text-white border border-white/50 border-dashed";
      case "rest": return "bg-[#FF2D55]/10 text-[#FF2D55] border border-[#FF2D55]/30";
      default: return "bg-white/5 text-white/50 border border-white/10";
    }
  };

  // Helper to calculate top and height in pixels (1 hour = 60px)
  const calculatePosition = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const topPx = ((startH - START_HOUR) * 60) + startM;
    const durationMins = ((endH * 60) + endM) - ((startH * 60) + startM);
    const heightPx = Math.max(durationMins, 20); // min height 20px

    return { top: `${topPx}px`, height: `${heightPx}px` };
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
  };

  // Generate grid events based on current view
  const renderEvents = (dayIndex: number) => {
    const dayEvents = schedules.filter(s => s.recurrence?.daysOfWeek?.includes(dayIndex));
    // Must be sorted by startTime to find gaps
    const sortedDayEvents = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const elements: JSX.Element[] = [];

    sortedDayEvents.forEach((event, idx) => {
      const pos = calculatePosition(event.startTime, event.endTime);
      
      const [startH] = event.startTime.split(':').map(Number);
      if (startH >= START_HOUR && startH <= END_HOUR) {
        elements.push(
          <div 
            key={event.id}
            onClick={() => setSelectedEvent(event)}
            className={`absolute left-0.5 right-0.5 rounded p-1 overflow-hidden transition-all text-xs hover:z-20 cursor-pointer ${getTypeStyle(event.type)} ${event.status === 'pending' ? 'opacity-60 border-opacity-50' : ''} flex flex-col justify-between`}
            style={{ top: pos.top, height: pos.height, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <div>
              <div className="font-semibold leading-none truncate text-[10px] flex items-center gap-1">
                {event.title}
                {event.isAIGenerated && <Sparkles size={10} className="text-white/80" />}
              </div>
              <div className="text-[8px] opacity-70 mt-0.5">{event.startTime} - {event.endTime}</div>
              {event.location && (
                <div className="text-[8px] mt-0.5 flex items-center gap-0.5 truncate" style={{ opacity: 0.8 }}>
                  <MapPin size={8} /> {event.location}
                </div>
              )}
            </div>
          </div>
        );
      }

    });


    return elements;
  };

  return (
    <div className="w-full h-full relative overflow-hidden px-4 pb-4 pt-0 lg:p-5 lg:pl-0 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <AuroraBackground
        className="!bg-transparent flex-1 flex flex-col rounded-3xl overflow-hidden transition-all duration-500 w-full h-full"
        style={{
          background: "rgba(0, 0, 0, 0.6)", 
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Top Header */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.05] z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium tracking-tight font-sans">Timetable</h2>
            
            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-lg p-0.5 font-sans">
              <button 
                onClick={() => setView("day")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'day' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              >
                Day
              </button>
              <button 
                onClick={() => setView("week")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'week' ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
              >
                Week
              </button>
            </div>
          </div>
          
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors font-sans"
          >
            <Plus size={14} /> Add Block
          </button>
        </header>

        {/* Calendar Body */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* Days Header */}
          <div className="flex border-b border-white/[0.05] shrink-0 bg-white/[0.01]">
            <div className="w-12 md:w-16 shrink-0 border-r border-white/[0.05]" /> {/* Empty corner for time column */}
            
            {view === "week" ? (
              // Week View Header
              DAYS_OF_WEEK.map((day, i) => (
                <div key={day} className={`flex-1 text-center py-2 text-[10px] uppercase tracking-widest font-medium border-r border-white/[0.05] ${i === currentDayIndex ? 'text-white bg-white/5' : 'text-white/40'}`}>
                  {day}
                </div>
              ))
            ) : (
              // Day View Header
              <div className="flex-1 text-center py-2 text-[10px] uppercase tracking-widest font-medium text-white">
                {DAYS_OF_WEEK[currentDayIndex]}
              </div>
            )}
          </div>

          {/* Grid Scrollable Area */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 relative"
          >
            <div className="flex min-h-[1440px] pt-3"> {/* 24 hours * 60px + padding for top label */}
              
              {/* Time Column */}
              <div className="w-12 md:w-16 shrink-0 border-r border-white/[0.05] relative bg-black/20">
                {HOURS.map(hour => (
                  <div key={hour} className="h-[60px] border-b border-white/[0.02] relative">
                    <span className="absolute -top-2 left-0 right-2 text-right text-[9px] text-white/30 font-sans">
                      {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid Columns */}
              <div className="flex-1 flex relative">
                
                {/* Current Time Indicator Line (spans across all columns) */}
                {currentTimePos >= 0 && (
                  <div 
                    className="absolute left-0 right-0 border-t border-white/50 z-20 pointer-events-none"
                    style={{ top: `${currentTimePos}px` }}
                  >
                    {/* Small dot on the left line */}
                    <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-white/80" />
                  </div>
                )}

                {view === "week" ? (
                  // Week View Columns
                  DAYS_OF_WEEK.map((_, i) => (
                    <div key={i} className={`flex-1 border-r border-white/[0.05] relative ${i === currentDayIndex ? 'bg-white/[0.02]' : ''}`}>
                      {/* Horizontal Lines */}
                      {HOURS.map(h => (
                        <div key={h} className="h-[60px] border-b border-white/[0.02] w-full" />
                      ))}
                      {/* Events */}
                      {!loading && renderEvents(i)}
                    </div>
                  ))
                ) : (
                  // Day View Column
                  <div className="flex-1 relative">
                    {HOURS.map(h => (
                      <div key={h} className="h-[60px] border-b border-white/[0.02] w-full" />
                    ))}
                    {!loading && renderEvents(currentDayIndex)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Event Detail Popover/Modal */}
        {selectedEvent && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
            <div 
              className="bg-[#111] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
            >
              {/* Header Actions */}
              <div className="flex justify-end items-center px-2 py-2 border-b border-white/5 bg-white/[0.02]">
                <button onClick={() => handleOpenEditForm(selectedEvent)} className="p-2 text-white/50 hover:text-white transition-colors" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDeleteSchedule(selectedEvent.id)} className="p-2 text-white/50 hover:text-[#FF2D55] transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedEvent(null)} className="p-2 text-white/50 hover:text-white transition-colors ml-2">
                  <X size={20} />
                </button>
              </div>
              
              {/* Event Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-3.5 h-3.5 rounded-sm shrink-0 ${
                    selectedEvent.type === 'class' ? 'bg-white' : 
                    selectedEvent.type === 'study' ? 'border border-[#A0A0A0]' : 
                    selectedEvent.type === 'healing' ? 'border border-dashed border-white' :
                    'bg-[#FF2D55]'
                  }`} />
                  <div>
                    <h3 className="text-xl font-medium text-white mb-1 leading-tight">{selectedEvent.title}</h3>
                    <p className="text-sm text-white/60">
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm text-white/70 pl-0.5">
                    <MapPin size={16} className="shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-white/70 pl-0.5">
                  <CalendarIcon size={16} className="shrink-0" />
                  <span>{selectedEvent.recurrence?.isRecurring ? `Weekly on ` : `Once on `}{selectedEvent.recurrence?.daysOfWeek?.map(d => DAYS_OF_WEEK[d]).join(", ")}</span>
                </div>

                {selectedEvent.ai_note && (
                  <div className="flex items-start gap-3 text-sm text-white/90 pl-0.5 p-3 bg-white/5 rounded-lg border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-white/40" />
                    <Sparkles size={16} className="shrink-0 text-white/60 mt-0.5" />
                    <span className="italic leading-relaxed text-white/80">"{selectedEvent.ai_note}"</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Overlay */}
        {showAddForm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-5 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h3 className="text-white font-medium text-lg tracking-tight">
                  {editingEventId ? "Edit Block" : "New Time Block"}
                </h3>
                <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Activity Title (e.g. Data Structures)"
                    className="w-full bg-transparent border-b border-white/20 pb-2 text-lg text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                
                <div>
                  <div className="flex items-center gap-2 border-b border-white/20 pb-2">
                    <MapPin size={16} className="text-white/40" />
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Location (Optional)"
                      className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-white/40 uppercase mb-1.5 block tracking-wider">Start</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 custom-time-input font-sans"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-white/40 uppercase mb-1.5 block tracking-wider">End</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 custom-time-input font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase mb-2 block tracking-wider">Recurrence</label>
                  <select
                    value={isRecurring ? "weekly" : "once"}
                    onChange={e => setIsRecurring(e.target.value === "weekly")}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-sans"
                  >
                    <option value="once" className="bg-[#0A0A0A]">Does not repeat</option>
                    <option value="weekly" className="bg-[#0A0A0A]">Weekly</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] text-white/40 uppercase mb-2 block tracking-wider">Recurrence (Days of Week)</label>
                  <div className="flex gap-1 justify-between">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDaySelection(idx)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all font-sans ${
                          selectedDays.includes(idx) ? "bg-white text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase mb-1.5 block tracking-wider">Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as UserSchedule["type"])}
                    className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-sans"
                  >
                    <option value="class">Class / Lecture</option>
                    <option value="study">Deep Study</option>
                    <option value="healing">Healing (Dashed)</option>
                    <option value="rest">Break</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  disabled={selectedDays.length === 0 || !title}
                  className="w-full mt-4 bg-white text-black py-3 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {editingEventId ? "Save Changes" : "Save Timetable Block"}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Required global styles for custom input overrides if needed */}
        <style dangerouslySetInnerHTML={{__html: `
          .custom-time-input::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
          }
        `}} />
      </AuroraBackground>
    </div>
  );
}
