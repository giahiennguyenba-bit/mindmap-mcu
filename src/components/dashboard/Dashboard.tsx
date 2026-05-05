"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  LineChart,
  Settings,
  LogOut,
  SendHorizonal,
  MoreVertical,
  Mic,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
} from "lucide-react";
import OrganicSphereWrapper from "@/components/3d/OrganicSphereWrapper";
import SchedulePanel from "./SchedulePanel";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";

/* ═══════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════ */
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

interface MindyMetadata {
  stressScore?: number;
  energyLevel?: number;
  sentimentColor?: string;
}

export function parseMindyResponse(rawResponse: string): { message: string; metadata: MindyMetadata } {
  // Regex tìm khối nằm giữa $$$ ... $$$
  const regex = /\$\$\$([\s\S]*?)\$\$\$/;
  const match = rawResponse.match(regex);
  
  let metadata: MindyMetadata = {};
  let message = rawResponse;

  if (match && match[1]) {
    try {
      metadata = JSON.parse(match[1].trim());
      // Xóa khối JSON khỏi message để hiển thị sạch sẽ
      message = rawResponse.replace(regex, '').trim();
    } catch (err) {
      console.error("Failed to parse Mindy JSON:", err);
    }
  }

  return { message, metadata };
}

/* ═══════════════════════════════════════════
   Clock Component
   ═══════════════════════════════════════════ */
function DigitalClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[12px] text-white/40 tracking-wider">
      {time}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sidebar
   ═══════════════════════════════════════════ */
const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Calendar,        label: "Schedule",  id: "schedule" },
  { icon: LineChart,       label: "Analytics", id: "analytics" },
  { icon: Settings,        label: "Settings",  id: "settings" },
] as const;

function Sidebar({ 
  active, 
  setActive, 
  isVoiceMuted, 
  toggleMute 
}: { 
  active: string; 
  setActive: (id: string) => void; 
  isVoiceMuted: boolean; 
  toggleMute: () => void; 
}) {
  const { signOut } = useAuth();

  return (
    <nav
      className="hidden lg:flex flex-col items-center justify-between py-8 w-[70px] shrink-0 z-40"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRight: "0.5px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Main navigation"
    >
      {/* Top icons */}
      <div className="flex flex-col items-center gap-4 w-full">
        {SIDEBAR_ITEMS.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            aria-label={label}
            className={`group relative flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-all duration-300
              ${active === id ? "bg-white/10" : "hover:bg-white/[0.06]"}`}
          >
            {/* Vertical Indicator */}
            <div
              className={`absolute -left-4 w-[2px] h-6 bg-white transition-opacity duration-300 ${
                active === id ? "opacity-100" : "opacity-0"
              }`}
            />
            <Icon
              size={20}
              strokeWidth={1.5}
              className={`transition-colors duration-300 ${
                active === id ? "text-white" : "text-[#A0A0A0] group-hover:text-white"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        <button
          onClick={toggleMute}
          aria-label={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer hover:bg-white/[0.06] transition-all duration-300"
        >
          {isVoiceMuted ? (
            <VolumeX size={20} strokeWidth={1.5} className="text-[#A0A0A0] group-hover:text-white transition-colors duration-300" />
          ) : (
            <Volume2 size={20} strokeWidth={1.5} className="text-[#A0A0A0] group-hover:text-white transition-colors duration-300" />
          )}
        </button>

        {/* Logout */}
        <button
          onClick={signOut}
          aria-label="Log out"
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer hover:bg-white/[0.06] transition-all duration-300"
        >
          <LogOut
            size={20}
            strokeWidth={1.5}
            className="text-[#A0A0A0] group-hover:text-white transition-colors duration-300"
          />
        </button>
      </div>
    </nav>
  );
}

function MobileDock({ 
  active, 
  setActive, 
  isVoiceMuted, 
  toggleMute 
}: { 
  active: string; 
  setActive: (id: string) => void; 
  isVoiceMuted: boolean; 
  toggleMute: () => void; 
}) {
  return (
    <div 
      className="flex lg:hidden items-center justify-around px-2 py-3 bg-black/60 backdrop-blur-3xl border-t border-white/[0.07] fixed bottom-0 left-0 right-0 z-[60]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      {SIDEBAR_ITEMS.map(({ icon: Icon, label, id }) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          aria-label={label}
          className={`flex flex-col items-center gap-1.5 p-2 transition-all duration-300 ${
            active === id ? "text-white scale-110" : "text-white/40 hover:text-white/60"
          }`}
        >
          <Icon size={20} strokeWidth={1.5} />
          <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
          {active === id && (
            <motion.div 
              layoutId="mobile-dock-indicator"
              className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
            />
          )}
        </button>
      ))}
      <button
        onClick={toggleMute}
        aria-label="Toggle Voice"
        className="flex flex-col items-center gap-1.5 p-2 text-white/40 hover:text-white transition-colors"
      >
        {isVoiceMuted ? (
          <VolumeX size={20} strokeWidth={1.5} className="text-[#FF2D55]" />
        ) : (
          <Volume2 size={20} strokeWidth={1.5} />
        )}
        <span className="text-[9px] font-medium tracking-wide uppercase">{isVoiceMuted ? 'Muted' : 'Voice'}</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Chat Panel (Glassmorphic Floating Card)
   ═══════════════════════════════════════════ */
const WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    role: "ai",
    content: "Welcome. Synchronizing neural pathways and cognitive data. Your session is now active.",
    timestamp: new Date(),
  },
  {
    id: "welcome-2",
    role: "ai",
    content: "I'm Mindy, your AI companion. How are you feeling today?",
    timestamp: new Date(),
  },
];

interface ChatPanelProps {
  onTypingChange: (isTyping: boolean) => void;
  onMindyStateUpdate: (state: MindyMetadata) => void;
  onSpeakingChange: (speaking: boolean) => void;
  isVoiceMuted: boolean;
  isCallMode: boolean;
  startCall: () => void;
  endCall: () => void;
  onFocusChange?: (isFocused: boolean) => void;
}

function ChatPanel({ 
  onTypingChange, 
  onMindyStateUpdate, 
  onSpeakingChange, 
  isVoiceMuted,
  isCallMode,
  startCall,
  endCall,
  onFocusChange
}: ChatPanelProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Fetch initial profile/mood from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.lastSphereState) {
            onMindyStateUpdate(data.lastSphereState);
          }
          // Optionally load last few messages
          const q = query(
            collection(db, "users", user.uid, "messages"),
            orderBy("timestamp", "asc"),
            limit(50)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const history = querySnapshot.docs.map(d => ({
              id: d.id,
              ...d.data(),
              timestamp: d.data().timestamp?.toDate() || new Date()
            })) as ChatMessage[];
            setMessages(history);
          }
        }
      } catch (err) {
        console.error("Error fetching profile/history:", err);
      }
    };

    fetchProfile();
  }, [user]);

  // Initialize Speech Recognition
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';
      recognition.current.onresult = (e: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setInput(currentText);
          onTypingChange(currentText.length > 0);
        }

        // isCallMode is closed over here, we should use a ref if needed, or rebind.
        // For simplicity, we can read the latest value via a ref
      };
      recognition.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [onTypingChange]);

  // Keep a ref of sendMessage to use inside onresult without recreating the recognition object
  const sendMessageRef = useRef<any>(null);
  const isCallModeRef = useRef(isCallMode);
  
  useEffect(() => {
    isCallModeRef.current = isCallMode;
  }, [isCallMode]);

  useEffect(() => {
    if (recognition.current) {
      // Re-bind onresult to capture latest refs
      recognition.current.onresult = (e: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setInput(currentText);
          onTypingChange(currentText.length > 0);
        }

        if (isCallModeRef.current && finalTranscript.trim()) {
           recognition.current?.stop(); // Dừng nghe để tránh Mindy nghe chính mình
           sendMessageRef.current?.(finalTranscript);
           setInput("");
        }
      };
    }
  }, [onTypingChange]);

  // Handle Call Mode toggles
  useEffect(() => {
    if (isCallMode) {
      if (recognition.current) {
        recognition.current.continuous = true;
        recognition.current.start();
        setIsRecording(true);
      }
    } else {
      if (recognition.current) {
        recognition.current.stop();
        recognition.current.continuous = false;
        setIsRecording(false);
      }
      window.speechSynthesis.cancel();
    }
  }, [isCallMode]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    onTypingChange(val.length > 0);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
    // Auto-scroll on focus
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 300);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    onTypingChange(false);

    // Save User message to Firestore
    if (user) {
      await addDoc(collection(db, "users", user.uid, "messages"), {
        role: "user",
        content: trimmed,
        timestamp: serverTimestamp()
      }).catch(err => console.error("Error saving user message:", err));
    }

    // AI "thinking" indicator
    const thinkingId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: "ai",
      content: "...",
      timestamp: new Date(),
    }]);

    try {
      // Map history sang format của Gemini (loại bỏ các tin nhắn rác hoặc thinking indicator)
      // CHÚ Ý: Gemini bắt buộc history phải bắt đầu bằng 'user', nên ta bỏ qua welcome messages
      const history = messages
        .filter(m => m.id !== thinkingId && m.id !== "welcome-1" && m.id !== "welcome-2")
        .map(m => ({
          role: m.role === "ai" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

      // Fetch today's schedule
      let calendarData = [];
      const currentDayIndex = new Date().getDay();
      
      if (user) {
        const q = query(
          collection(db, "users", user.uid, "user_schedules"),
          orderBy("startTime", "asc")
        );
        const snapshot = await getDocs(q);
        calendarData = snapshot.docs
          .map(d => d.data() as any)
          .filter(s => s.recurrence?.daysOfWeek?.includes(currentDayIndex));
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: trimmed, 
          history,
          userName: user?.displayName,
          calendarData,
          currentDay: DAYS_OF_WEEK[currentDayIndex],
          todayIndex: currentDayIndex
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Parse response để bóc tách JSON và clean text
      let rawText = data.text;
      if (!rawText && data.functionCalls?.length > 0) {
        rawText = "Initializing neural optimization... I'm adding a Healing Zone to your schedule now. $$$ {\"stressScore\": 0.2, \"energyLevel\": 0.8} $$$";
      }
      
      const { message: cleanMessage, metadata } = parseMindyResponse(rawText);

      // Phản hồi đã có, dừng "suy nghĩ"
      setMessages(prev => prev.map(m => m.id === thinkingId ? {
        ...m,
        content: cleanMessage
      } : m));

      // Gửi metadata lên Dashboard để cập nhật Sphere
      onMindyStateUpdate(metadata);

      // Save AI message to Firestore
      if (user) {
        await addDoc(collection(db, "users", user.uid, "messages"), {
          role: "ai",
          content: cleanMessage,
          timestamp: serverTimestamp()
        }).catch(err => console.error("Error saving AI message:", err));
        
        // Update user's last mood/state
        await setDoc(doc(db, "users", user.uid), {
          lastSphereState: {
            stressLevel: metadata?.stressScore ?? 0.3,
            energyLevel: metadata?.energyLevel ?? 0.5,
            moodColor: metadata?.sentimentColor ?? "#ffffff"
          },
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(err => console.error("Error updating user state:", err));

        // Create an entry in global emotional_logs for Analytics tracking
        if (metadata?.stressScore !== undefined) {
          await addDoc(collection(db, "emotional_logs"), {
            userId: user.uid,
            stressScore: metadata.stressScore,
            context: trimmed, 
            timestamp: serverTimestamp()
          }).catch(err => console.error("Error saving emotional log:", err));
          console.log("Successfully logged emotional state for analytics:", metadata.stressScore);
        }

        // Handle Function Calls (e.g. add_healing_block)
        if (data.functionCalls && data.functionCalls.length > 0) {
          for (const call of data.functionCalls) {
            if (call.name === "add_healing_block") {
              const args = call.args;
              if (args) {
                console.log("Mindy is executing add_healing_block with args:", args);
                try {
                  const day = typeof args.dayOfWeek === 'number' ? args.dayOfWeek : parseInt(args.dayOfWeek);
                  if (isNaN(day)) throw new Error("Invalid dayOfWeek");

                  await addDoc(collection(db, "users", user.uid, "user_schedules"), {
                    title: args.title || "Healing Zone",
                    location: args.location || "",
                    startTime: args.startTime,
                    endTime: args.endTime,
                    type: "healing",
                    recurrence: {
                      isRecurring: false,
                      daysOfWeek: [day]
                    },
                    isAIGenerated: true,
                    ai_note: args.ai_note || "Suggested by Mindy for your well-being.",
                    status: "pending",
                    color_logic: "transparent",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });
                  console.log("Mindy successfully inserted a Healing Zone for day:", day);
                } catch (err) {
                  console.error("Failed to execute Mindy's tool call:", err);
                }
              }
            }
          }
        }
      }

      // Mindy Voice Output
      if (!isVoiceMuted && cleanMessage) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(cleanMessage);
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        
        // Detect if content is likely Vietnamese
        const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanMessage);
        
        let selectedVoice = null;
        if (isVietnamese) {
          selectedVoice = voices.find(v => v.lang.includes("vi") || v.name.includes("Tiếng Việt"));
        } else {
          selectedVoice = voices.find(v => 
            v.lang.startsWith("en-") && 
            (v.name.includes("Female") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Zira"))
          );
        }
        
        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.onstart = () => onSpeakingChange(true);
        utterance.onend = () => {
          onSpeakingChange(false);
          // Restart recognition if in Call Mode
          if (isCallModeRef.current) {
            try {
              recognition.current?.start();
              setIsRecording(true);
            } catch (e) {
              console.warn("Recognition already started or error:", e);
            }
          }
        };
        utterance.onerror = () => onSpeakingChange(false);
        
        window.speechSynthesis.speak(utterance);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Chat API Error:", err);
      setMessages(prev => prev.map(m => m.id === thinkingId ? {
        ...m,
        content: "Mindy đang bận cập nhật hệ thần kinh, vui lòng kiểm tra lại API Key hoặc kết nối mạng."
      } : m));
    }
  }, [input, messages, onTypingChange, onMindyStateUpdate, user]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognition.current?.stop();
      setIsRecording(false);
    } else {
      setInput("");
      recognition.current?.start();
      setIsRecording(true);
    }
  };


  return (
    <div className="w-full h-full relative overflow-hidden px-4 pb-4 pt-0 lg:p-5 lg:pl-0">
      {/* ── Glassmorphic Floating Container ── */}
      <AuroraBackground
        className="!bg-transparent flex-1 flex flex-col rounded-3xl overflow-hidden transition-all duration-500 w-full h-full"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: isFocused ? "1px solid rgba(255, 255, 255, 0.20)" : "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Chat Header */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-black/10 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || "Avatar"} 
                className="w-8 h-8 rounded-full border border-white/20"
              />
            )}
            <div>
              <h2 className="text-sm font-semibold text-white/90 tracking-wide">
                {user?.displayName ? `Welcome Back, ${user.displayName.split(' ')[0]}` : 'Welcome Back'}
                <span className="text-white/30 font-normal ml-2 hidden md:inline">— Neural Interface</span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DigitalClock />
            <button
              onClick={isCallMode ? endCall : startCall}
              aria-label={isCallMode ? "End Call" : "Start Live Call"}
              className={`transition-colors cursor-pointer p-2 rounded-full ${isCallMode ? 'bg-[#FF2D55] text-white' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.06]'}`}
            >
              <Phone size={18} strokeWidth={1.5} />
            </button>
            <button
              aria-label="More options"
              className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-2 hover:bg-white/[0.06] rounded-full"
            >
              <MoreVertical size={18} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4
            scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  msg.role === "ai"
                    ? "bg-white/[0.06] text-white/70"
                    : "bg-white/[0.10] text-white/90"
                }`}
                style={{
                  backdropFilter: "blur(8px)",
                  border: msg.role === "ai"
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {msg.role === "ai" && (
                  <span className="block font-mono text-[10px] text-[#C0C0C0] font-light uppercase tracking-widest mb-1">
                    mindy
                  </span>
                )}
                <p className={`text-sm leading-relaxed font-sans ${
                  msg.role === "user" ? "text-right" : ""
                }`}>
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input & Dock Wrapper (Sticky/Fixed logic) */}
        <div className="shrink-0 bg-black/40 backdrop-blur-2xl border-t border-white/[0.07] sticky bottom-0 z-20"
             style={{
               paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)"
             }}
        >
          {/* Input Bar */}
          <div className="px-4 py-3">
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-300"
              style={{
                background: isFocused ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
              }}
            >
              {/* Mic Button */}
              <button
                onClick={toggleRecording}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-300
                  ${isRecording
                    ? "text-[#FF2D55] bg-[#FF2D55]/10"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
              >
                <Mic size={16} strokeWidth={1.5} />
                {/* Recording pulse ring */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border border-[#FF2D55]/40"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>
              </button>

              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={isRecording ? "Mindy is listening..." : "Type your command..."}
                className={`flex-1 bg-transparent border-none text-sm font-sans focus:outline-none focus:ring-0
                  ${isRecording ? "text-[#FF2D55] placeholder:text-[#FF2D55]/60 font-medium" : "text-white/90 placeholder:text-white/20"}`}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                aria-label="Send message"
                className={`flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-300
                  ${input.trim()
                    ? "text-white/70 hover:text-white hover:bg-white/[0.08]"
                    : "text-white/15 cursor-not-allowed"
                  }`}
              >
                <SendHorizonal size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </AuroraBackground>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Core Panel (Left Half — Sphere)
   ═══════════════════════════════════════════ */
interface CorePanelProps {
  isTyping: boolean;
  isSpeaking: boolean;
  stressLevel: number;
  energyLevel: number;
  moodColor: string;
  audioLevels: () => number[];
  isListening: boolean;
}

function CorePanel({ isTyping, isSpeaking, stressLevel, energyLevel, moodColor, audioLevels, isListening }: CorePanelProps) {
  return (
    <section className="relative flex items-center justify-center overflow-hidden w-full h-full">
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "clamp(300px, 50vw, 600px)",
          height: "clamp(300px, 50vw, 600px)",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* Sphere */}
      <div
        className="relative z-10 transition-transform duration-500 ease-out"
        style={{
          width: "clamp(240px, 30vw, 420px)",
          height: "clamp(240px, 30vw, 420px)",
          transform: isTyping ? "scale(1.02)" : "scale(1)",
        }}
      >
        <OrganicSphereWrapper
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevels={audioLevels}
          colorMode="neutral"
          manualMode={true}
          stressLevel={stressLevel}
          energyLevel={energyLevel}
          moodColor={moodColor}
        />
      </div>

      {/* Core Label */}
      <div className="absolute bottom-4 lg:bottom-12 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="font-mono text-[10px] md:text-xs text-white/30 uppercase tracking-[0.35em]">
          Project MindMap
        </h1>
        <p className="font-heading text-lg md:text-xl text-white/50 font-bold tracking-widest uppercase mt-1">
          MCU
        </p>
      </div>

      {/* Status Indicator - hidden on mobile */}
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-white/25 uppercase tracking-widest space-y-1 hidden lg:block">
        <div className="flex items-center gap-1.5">
          <span>Status:</span>
          <span className="text-white/50">Neural Link Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Core Temp:</span>
          <div className="w-[5px] h-[5px] rounded-full bg-[#00FF85] animate-[pulseGreen_2s_infinite]" />
          <span>Nominal</span>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   Dashboard Shell
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [stressLevel, setStressLevel] = useState(0.3);
  const [energyLevel, setEnergyLevel] = useState(0.3);
  const [moodColor, setMoodColor] = useState("#ffffff");

  const [isCallMode, setIsCallMode] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getAudioLevels = useCallback(() => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
      const low = dataArrayRef.current.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
      const mid = dataArrayRef.current.slice(10, 20).reduce((a, b) => a + b, 0) / 10 / 255;
      const high = dataArrayRef.current.slice(20, 30).reduce((a, b) => a + b, 0) / 10 / 255;
      return [low, mid, high];
    }
    return isTyping ? [0.4, 0.5, 0.6] : [0, 0, 0];
  }, [isTyping]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      setIsCallMode(true);
    } catch (e) {
      console.error("Microphone access denied:", e);
    }
  };

  const endCall = () => {
    setIsCallMode(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <motion.main
      className="h-[100dvh] w-screen overflow-hidden bg-[#080808] flex font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Sidebar */}
      <Sidebar 
        active={activeTab} 
        setActive={(id) => {
          if (id === 'analytics') {
            router.push('/analytics');
          } else {
            setActiveTab(id);
          }
        }} 
        isVoiceMuted={isVoiceMuted} 
        toggleMute={() => setIsVoiceMuted(!isVoiceMuted)} 
      />
      {/* Hidden button for mobile dock to trigger mute */}
      <button id="mute-toggle" className="hidden" onClick={() => setIsVoiceMuted(!isVoiceMuted)}></button>

      {/* Main Grid: 50/50 split on desktop, stacked on mobile */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden w-full">
        {/* Left: Core Sphere */}
        <div className={
          isCallMode
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-3xl"
          : `h-[35vh] lg:h-full shrink-0 relative transition-all duration-500 ease-in-out ${
              isInputFocused ? "h-[15vh] -translate-y-2 scale-90" : "h-[35vh]"
            }`
        }>
          <div className={
            isCallMode
            ? "w-full h-full flex flex-col items-center justify-center scale-150 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
            : "w-full h-full transition-all duration-700"
          }>
            <CorePanel 
              isTyping={isTyping} 
              isSpeaking={isSpeaking}
              stressLevel={stressLevel}
              energyLevel={energyLevel}
              moodColor={moodColor}
              audioLevels={getAudioLevels}
              isListening={isCallMode || isTyping || isSpeaking}
            />
          </div>
          
          {/* End Call Button inside overlay */}
          <AnimatePresence>
            {isCallMode && (
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={endCall} 
                className="absolute bottom-12 p-5 bg-[#FF2D55] hover:bg-[#FF2D55]/80 rounded-full shadow-[0_0_30px_rgba(255,45,85,0.4)] transition-colors z-50 cursor-pointer"
              >
                 <PhoneOff size={28} color="white" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Panel */}
        <div className="flex-1 min-h-0 relative pb-[80px] lg:pb-0">
          {activeTab === "schedule" ? (
            <SchedulePanel />
          ) : (
            <ChatPanel 
              onTypingChange={setIsTyping} 
              onFocusChange={setIsInputFocused}
              onSpeakingChange={setIsSpeaking}
              isVoiceMuted={isVoiceMuted}
              isCallMode={isCallMode}
              startCall={startCall}
              endCall={endCall}
              onMindyStateUpdate={(meta) => {
                if (meta.stressScore !== undefined) setStressLevel(meta.stressScore);
                if (meta.energyLevel !== undefined) setEnergyLevel(meta.energyLevel);
                if (meta.sentimentColor !== undefined) setMoodColor(meta.sentimentColor);
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile Navigation Dock */}
      <MobileDock 
        active={activeTab} 
        setActive={(id) => {
          if (id === 'analytics') {
            router.push('/analytics');
          } else {
            setActiveTab(id);
          }
        }} 
        isVoiceMuted={isVoiceMuted} 
        toggleMute={() => setIsVoiceMuted(!isVoiceMuted)} 
      />
    </motion.main>
  );
}
