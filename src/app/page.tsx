"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";
import OrganicSphereWrapper from "@/components/3d/OrganicSphereWrapper";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAudioReactivity } from "@/hooks/useAudioReactivity";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isReady, startListening, stopListening, updateLevels, error } = useAudioReactivity();
  const { user, loading, signInWithGoogle } = useAuth();
  
  useEffect(() => {
    if (user && !loading) {
      router.push('/onboarding');
    }
  }, [user, loading, router]);

  // ── Landing Typewriter ──
  const TYPEWRITER_TEXTS = [
    "Your AI sanctuary for mental clarity.",
    "Synchronizing your schedule and mind.",
    "Built for Ming Chuan University students.",
    "Speak to the core. Start your journey.",
  ];
  const [displayText, setDisplayText] = useState("");
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Refs ──
  const headerRef  = useRef(null);
  const word1Ref   = useRef(null);
  const word2Ref   = useRef(null);
  const taglineRef = useRef(null);
  const ctaRef     = useRef(null);
  const statusRef  = useRef(null);
  const sphereRef  = useRef(null);

  // ── Status Bar Cycling ──
  const statusTexts = ["AWAITING INPUT...", "SCANNING SCHEDULE...", "CORE READY."];
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusFade, setStatusFade]   = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusFade(false);
      setTimeout(() => {
        setStatusIndex(prev => (prev + 1) % statusTexts.length);
        setStatusFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Typewriter ──
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentText = TYPEWRITER_TEXTS[typewriterIndex];
    if (isDeleting) {
      if (displayText.length > 0) {
        timeout = setTimeout(() => setDisplayText(prev => prev.slice(0, -1)), 30);
      } else {
        setIsDeleting(false);
        setTypewriterIndex(prev => (prev + 1) % TYPEWRITER_TEXTS.length);
      }
    } else {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => setDisplayText(currentText.slice(0, displayText.length + 1)), 50);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, typewriterIndex]);

  // ── GSAP Intro — Cinematic Breathing Timeline ──
  // All elements start invisible via inline style on JSX (no FOUC).
  // Absolute delay values only — no stagger, no relative offsets.
  useGSAP(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });

      // 1. Header label — identity first
      tl.to(headerRef.current,  { opacity: 1, y:  0, duration: 0.5,  ease: "power3.out" }, 0.0);

      // 2. Sphere — starts early, long warm-up so it feels like materialization not a pop
      tl.to(sphereRef.current,  { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" }, 0.4);

      // 3. "ORGANIC" slides in from left
      tl.to(word1Ref.current,   { opacity: 1, x:  0, duration: 0.65, ease: "power3.out" }, 0.7);

      // 4. "INTELLIGENCE." — 0.3s after "ORGANIC" so brain processes each word separately
      tl.to(word2Ref.current,   { opacity: 1, x:  0, duration: 0.65, ease: "power3.out" }, 1.0);

      // 5. Tagline — intentional 0.4s gap after headline finishes (breathing room)
      tl.to(taglineRef.current, { opacity: 1, y:  0, duration: 0.55, ease: "power3.out" }, 1.4);

      // 6. CTA button
      tl.to(ctaRef.current,     { opacity: 1, y:  0, duration: 0.45, ease: "power3.out" }, 1.8);

      // 7. Status bar — ambient, arrives last
      tl.to(statusRef.current,  { opacity: 1, y:  0, duration: 0.45, ease: "power3.out" }, 2.1);

      // Gate behind window.load so fonts + WebGL canvas are fully ready
      const startTimeline = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
      };

      if (document.readyState === 'complete') {
        startTimeline();
      } else {
        window.addEventListener('load', startTimeline, { once: true });
      }
    });

    return () => ctx.revert();
  }, []);


  // ── Auto-start Microphone Reactivity ──
  useEffect(() => {
    // Start listening automatically after 2 seconds
    const timer = setTimeout(() => {
      startListening();
    }, 2000);
    return () => clearTimeout(timer);
  }, []); // Run once on mount

  return (
    <main className="relative min-h-[100dvh] lg:h-screen bg-[#080808] text-foreground w-full overflow-hidden font-sans selection:bg-primary flex flex-col lg:flex-row selection:text-white">
      
      {/* LEFT: Typography & Controls */}
      <section className="flex-1 lg:flex-[0.6] flex flex-col justify-between p-6 md:p-12 lg:p-20 relative z-10 items-start text-left">
        
        {/* TOP: PROJECT IDENTITY */}
        <header ref={headerRef} style={{ opacity: 0, transform: 'translateY(-20px)' }} className="z-10 pt-4 lg:pt-0">
          <h2 className="font-mono text-[10px] md:text-xs tracking-[0.5em] text-white/40 uppercase mb-1">Project</h2>
          <div className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase flex items-center gap-3">
            MINDMAP <span className="text-primary">MCU</span>
          </div>
        </header>

        {/* MIDDLE: HEADLINE & CONTENT */}
        <div className="flex-1 flex flex-col items-start justify-center my-10 lg:my-20">
          <h1 className="font-heading text-[12vw] md:text-[6rem] lg:text-[7rem] xl:text-[8rem] font-black leading-[1.1] md:leading-[0.9] tracking-tighter uppercase -ml-1 md:-ml-2">
            <div ref={word1Ref} style={{ opacity: 0, transform: 'translateY(20px)' }}>Organic</div>
            <div ref={word2Ref} style={{ opacity: 0, transform: 'translateY(20px)' }} className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] via-[#FF6B00] to-[#FF8C00]">
              Intelligence.
            </div>
          </h1>

          <div ref={taglineRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="mt-8 mb-10 lg:mb-0 max-w-[280px] md:max-w-md lg:max-w-xl">
            <p className="text-[11px] md:text-base lg:text-lg font-mono text-white/50 leading-relaxed normal-case">
              {displayText}
              <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
            </p>
          </div>

          <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="mt-12 lg:mt-24">
            <button
              onClick={user ? () => router.push('/onboarding') : signInWithGoogle}
              disabled={loading}
              className="border-2 border-[#FF2D55] bg-transparent text-white tracking-[0.3em] text-[10px] md:text-xs px-10 py-4 font-bold uppercase transition-all duration-300 hover:bg-[#FF2D55] hover:shadow-[0_0_30px_rgba(255,45,85,0.4)]"
            >
              {loading ? "Connecting..." : "Speak to the core"}
            </button>
          </div>
        </div>

        {/* BOTTOM: Status / Mic */}
        <div ref={statusRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="flex items-center gap-6 mt-8">
          <Button
            size="lg"
            onClick={isReady ? stopListening : startListening}
            className={cn(
              "rounded-none w-14 h-14 transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
              isReady ? "bg-primary text-white" : "bg-white/10 text-white/40 border border-white/10"
            )}
          >
            <Mic className={cn("w-5 h-5", !isReady && "opacity-50")} />
          </Button>
          <div className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] space-y-1">
            <p>Status: <span className="text-primary">{isReady ? "CORE ACTIVE" : "INTERFACE MUTED"}</span></p>
            <p>Neural Link: <span className={cn(isReady ? "text-[#00FF85]" : "text-white/20")}>Nominal</span></p>
          </div>
        </div>
      </section>

      {/* RIGHT: THE CORE (SPHERE) */}
      <section 
        className="flex-1 lg:flex-[0.4] relative flex items-center justify-center min-h-[45dvh] lg:min-h-screen z-0 overflow-visible -mt-10 lg:mt-0"
      >
        <div 
          ref={sphereRef}
          style={{ 
            opacity: 0, 
            scale: 0.8,
            width: "clamp(330px, 46vw, 750px)",
            height: "clamp(330px, 46vw, 750px)"
          }}
          className="relative aspect-square flex items-center justify-center"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full opacity-20 blur-3xl animate-[pulseGlow_5s_ease-in-out_infinite]"
               style={{ background: 'radial-gradient(circle, #FF2D55 0%, transparent 70%)' }} />
          
          {/* 3D Canvas Layer */}
          <div className="absolute inset-0 z-10 pointer-events-auto cursor-default">
            <OrganicSphereWrapper isListening={isReady} audioLevels={updateLevels} colorMode="vibrant" />
          </div>

          {/* Decoration Layer */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            <div className="scanlines-radial absolute inset-0 opacity-10" />
          </div>
        </div>
      </section>

    </main>
  );
}
