"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OrganicSphereWrapper from "@/components/3d/OrganicSphereWrapper";

const NARRATIVE_TEXT = "Welcome, student. I am Mindy—a reflection of your mental state and well-being. Let us embark on a journey of self-discovery.";

// 5-level questions
const ONBOARDING_QUESTIONS = [
  {
    id: "stress", 
    title: "How overwhelming is your world right now?",
    options: [
      { id: "s1", label: "Calm",      level: 1, sphereEffect: { stressLevel: 0.1, energyLevel: 0.2, moodColor: "#ffffff" } },
      { id: "s2", label: "Light",     level: 2, sphereEffect: { stressLevel: 0.3, energyLevel: 0.3, moodColor: "#e2e8f0" } },
      { id: "s3", label: "Steady",    level: 3, sphereEffect: { stressLevel: 0.5, energyLevel: 0.5, moodColor: "#cbd5e1" } },
      { id: "s4", label: "Heavy",     level: 4, sphereEffect: { stressLevel: 0.7, energyLevel: 0.7, moodColor: "#fca5a5" } },
      { id: "s5", label: "Chaotic",   level: 5, sphereEffect: { stressLevel: 0.9, energyLevel: 0.9, moodColor: "#ff1a4a" } },
    ],
  },
  {
    id: "energy", 
    title: "What is your current energy level?",
    options: [
      { id: "e1", label: "Exhausted", level: 1, sphereEffect: { stressLevel: 0.2, energyLevel: 0.1, moodColor: "#64748b" } },
      { id: "e2", label: "Drained",   level: 2, sphereEffect: { stressLevel: 0.3, energyLevel: 0.3, moodColor: "#94a3b8" } },
      { id: "e3", label: "Balanced",  level: 3, sphereEffect: { stressLevel: 0.4, energyLevel: 0.5, moodColor: "#fde047" } },
      { id: "e4", label: "Active",    level: 4, sphereEffect: { stressLevel: 0.5, energyLevel: 0.7, moodColor: "#facc15" } },
      { id: "e5", label: "Restless",  level: 5, sphereEffect: { stressLevel: 0.8, energyLevel: 0.9, moodColor: "#fbbf24" } },
    ],
  },
  {
    id: "focus", 
    title: "How clear is your mind today?",
    options: [
      { id: "f1", label: "Foggy",     level: 1, sphereEffect: { stressLevel: 0.6, energyLevel: 0.2, moodColor: "#c084fc" } },
      { id: "f2", label: "Scattered", level: 2, sphereEffect: { stressLevel: 0.5, energyLevel: 0.4, moodColor: "#a855f7" } },
      { id: "f3", label: "Neutral",   level: 3, sphereEffect: { stressLevel: 0.4, energyLevel: 0.5, moodColor: "#ffffff" } },
      { id: "f4", label: "Focused",   level: 4, sphereEffect: { stressLevel: 0.2, energyLevel: 0.7, moodColor: "#22d3ee" } },
      { id: "f5", label: "Sharp",     level: 5, sphereEffect: { stressLevel: 0.1, energyLevel: 0.8, moodColor: "#06b6d4" } },
    ],
  }
];

export default function OnboardingPhase() {
  const router = useRouter();
  
  // 1. Core Onboarding State (0 to 4)
  const [step, setStep] = useState(0);
  
  // 5. User Data State
  const [userData, setUserData] = useState({
    name: "",
    focus: "",
    timetable: []
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  // Narrative State (for Step 0)
  const [currentTyping, setCurrentTyping] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  
  const [sphereState, setSphereState] = useState({ stressLevel: 0.1, energyLevel: 0.1, moodColor: "#ffffff" });

  // Typewriter effect
  useEffect(() => {
    if (step !== 0) return;
    
    if (typingDone) return;
    
    if (currentTyping.length < NARRATIVE_TEXT.length) {
      const t = setTimeout(() => {
        setCurrentTyping(NARRATIVE_TEXT.slice(0, currentTyping.length + 1));
      }, 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setTypingDone(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [currentTyping, typingDone, step]);

  const nextStep = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
      setSelectedOptionId(null);
    } else {
      // Step 4 complete -> save to Firestore & navigate
      console.log("Saving user data to Firestore...", userData);
      router.push('/dashboard');
    }
  };

  const handleSelectOption = useCallback((optionId: string, effect: typeof sphereState, questionId: string, label: string) => {
    setSelectedOptionId(optionId);
    setSphereState(effect);
    
    if (questionId === 'focus') {
      setUserData(prev => ({ ...prev, focus: label }));
    }
    
    setTimeout(() => {
      nextStep();
    }, 1000);
  }, [sphereState]);

  return (
    <main className="relative w-full bg-[#080808] overflow-hidden font-sans selection:bg-white/20 selection:text-white"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* 4. Top Progress Indicator (5 seamless lines) */}
      <div className="absolute top-0 left-0 w-full flex h-[1px] z-50">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 bg-white/[0.15] relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[#FF2D55]"
              initial={{ width: "0%" }}
              animate={{ width: step >= i ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '48px 24px',
        }}
      >
        {/* 3. Sphere - Stays mounted and visible on ALL steps */}
        <motion.div
          className="relative flex-shrink-0"
          style={{
            width:  'clamp(120px, 20vmin, 240px)',
            height: 'clamp(120px, 20vmin, 240px)',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 1, delay: 0.3, ease: "easeOut" } }}
        >
          {/* Mood-reactive ambient glow */}
          <div
            className="absolute rounded-full pointer-events-none transition-colors duration-1000"
            style={{
              inset: '-2rem',
              background: `radial-gradient(circle, ${sphereState.moodColor}40 0%, transparent 70%)`,
              filter: 'blur(32px)',
            }}
          />
          <OrganicSphereWrapper
            isListening={false}
            audioLevels={() => [0, 0, 0]}
            colorMode="neutral"
            manualMode={true}
            stressLevel={sphereState.stressLevel}
            energyLevel={sphereState.energyLevel}
            moodColor={sphereState.moodColor}
          />
        </motion.div>

        {/* Dynamic Content Container */}
        <div className="flex flex-col items-center w-full max-w-3xl px-0 relative">
          <AnimatePresence mode="wait">
            
            {/* Step 0: Narrative Intro */}
            {step === 0 && (
              <motion.div
                key="step-0"
                className="flex flex-col items-center w-full min-h-[160px] justify-center"
                style={{ gap: '16px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.35 } }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              >
                <p className="text-sm md:text-lg text-white/80 font-mono tracking-wide max-w-2xl text-center leading-relaxed
                  after:content-[''] after:inline-block after:w-[2px] after:h-[1em]
                  after:bg-white/60 after:ml-1 after:-mb-0.5
                  after:animate-[blink_1s_infinite] after:align-baseline">
                  {currentTyping}
                </p>

                <AnimatePresence>
                  {typingDone && (
                    <motion.button
                      onClick={nextStep}
                      className="mt-8 px-8 py-3 bg-white/[0.08] border border-white/15 text-white/80
                        font-mono text-sm tracking-[0.15em] uppercase cursor-pointer
                        hover:bg-white/[0.15] hover:border-white/30 hover:text-white
                        transition-all duration-300"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Begin Synchronization
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Steps 1-3: Questions */}
            {[1, 2, 3].includes(step) && (
              <motion.div
                key={`step-${step}`}
                className="flex flex-col items-center w-full"
                style={{ gap: '32px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.35 } }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              >
                <h2 className="text-xl md:text-3xl text-white/90 font-light text-center tracking-wide">
                  {ONBOARDING_QUESTIONS[step - 1].title}
                </h2>

                <div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full">
                  {ONBOARDING_QUESTIONS[step - 1].options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleSelectOption(option.id, option.sphereEffect, ONBOARDING_QUESTIONS[step - 1].id, option.label)}
                        className={`relative flex flex-col items-center justify-center gap-2 w-24 h-28 md:w-28 md:h-32
                          rounded-lg border cursor-pointer transition-all duration-300
                          ${isSelected
                            ? 'border-white/40 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                            : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]'
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className={`font-heading text-2xl md:text-3xl font-bold transition-colors duration-300
                          ${isSelected ? 'text-white' : 'text-white/40'}`}>
                          {option.level}
                        </span>
                        <span className={`font-mono text-[10px] md:text-xs tracking-wider transition-colors duration-300
                          ${isSelected ? 'text-white' : 'text-white/60'}`}>
                          {option.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4: Final Config / Name */}
            {step === 4 && (
              <motion.div
                key="step-4"
                className="flex flex-col items-center w-full"
                style={{ gap: '24px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.35 } }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
              >
                <h2 className="text-xl md:text-3xl text-white/90 font-light text-center tracking-wide">
                  What should we call you?
                </h2>
                
                <input 
                  type="text" 
                  placeholder="Your name"
                  value={userData.name}
                  onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-transparent border-b border-white/20 text-white text-center text-xl pb-2 focus:outline-none focus:border-white/60 transition-colors w-64"
                />

                <motion.button
                  onClick={nextStep}
                  disabled={!userData.name.trim()}
                  className={`mt-4 px-8 py-3 bg-white/[0.08] border border-white/15 text-white/80
                    font-mono text-sm tracking-[0.15em] uppercase cursor-pointer
                    transition-all duration-300 ${!userData.name.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.15] hover:border-white/30 hover:text-white'}`}
                  whileHover={userData.name.trim() ? { scale: 1.03 } : {}}
                  whileTap={userData.name.trim() ? { scale: 0.97 } : {}}
                >
                  Complete Setup
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Branding */}
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
        <div className="font-mono text-[9px] md:text-[10px] text-white/30 uppercase tracking-[0.3em]">
          MindMap <span className="text-white/50">MCU</span>
        </div>
      </div>
      
      {/* 6. Skip Onboarding Link */}
      <button 
        onClick={() => router.push('/dashboard')}
        className="absolute bottom-6 right-6 md:bottom-8 md:right-8 font-mono text-[0.7rem] text-white/40 hover:text-white/80 uppercase tracking-widest transition-colors z-50 cursor-pointer"
      >
        Skip Onboarding
      </button>
    </main>
  );
}
