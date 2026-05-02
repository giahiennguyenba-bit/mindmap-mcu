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
  const { isReady, startListening, updateLevels, error } = useAudioReactivity();
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


  return (
    <main className="min-h-screen h-screen bg-[#080808] text-foreground flex flex-col lg:flex-row w-full overflow-hidden selection:bg-primary selection:text-white font-sans">

      {/* LEFT: Typography & Controls */}
      <section className="flex-1 lg:flex-[0.6] flex flex-col justify-between p-6 md:p-12 lg:p-16 relative z-10">

        {/* opacity:0 initial state prevents flash before GSAP runs */}
        <header ref={headerRef} style={{ opacity: 0, transform: 'translateY(-20px)' }} className="flex justify-between items-start gap-4">
          <div>
            <h2 className="font-mono text-xs md:text-sm tracking-[0.3em] text-white/50 uppercase">Project</h2>
            <div className="text-lg md:text-xl font-bold tracking-widest mt-1 flex items-center gap-2 uppercase">
              MindMap <span className="text-primary">MCU</span>
            </div>
          </div>
        </header>

        <div className="my-16 lg:my-20">
          <h1 className="font-heading text-[3.5rem] leading-[0.9] md:text-[6rem] lg:text-[7rem] xl:text-[8rem] font-black tracking-tighter uppercase break-words">
            <div ref={word1Ref} style={{ opacity: 0, transform: 'translateX(-60px)' }} className="inline-block">Organic</div> <br />
            <div ref={word2Ref} style={{ opacity: 0, transform: 'translateX(-60px)' }} className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#ff7b00]">Intelligence.</div>
          </h1>

          <div ref={taglineRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="mt-8 min-h-[3.5rem] md:min-h-[4rem] max-w-md">
            <p className="text-sm md:text-base lg:text-lg text-white/60 font-mono leading-relaxed relative inline-block
              after:content-[''] after:inline-block after:w-2 after:h-[1em]
              after:bg-[#FF2D55] after:ml-2 after:-mb-0.5
              after:animate-[blink_1s_infinite] after:align-baseline">
              {displayText}
            </p>
          </div>

          <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="mt-8">
            <button
              onClick={user ? () => router.push('/onboarding') : signInWithGoogle}
              disabled={loading}
              className="inline-flex items-center justify-center border-2 border-[#FF2D55] bg-transparent
                text-white tracking-[0.2em] text-[0.85rem] px-8 py-3 font-bold uppercase cursor-pointer
                transition-all duration-300 disabled:opacity-50 disabled:cursor-wait
                hover:bg-gradient-to-r hover:from-[#FF2D55] hover:to-[#FF6B00]
                hover:border-transparent hover:shadow-[0_0_20px_rgba(255,45,85,0.5)]"
            >
              {loading ? "Connecting..." : "Speak to the core"}
            </button>
          </div>
        </div>

        {/* Status / Mic */}
        <div ref={statusRef} style={{ opacity: 0, transform: 'translateY(20px)' }} className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={!isReady && !error ? startListening : undefined}
            className="rounded-none w-14 h-14 md:w-16 md:h-16 bg-primary text-white
              hover:bg-white hover:text-black transition-colors
              shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)]
              hover:shadow-none hover:translate-y-2 hover:translate-x-2"
          >
            <Mic className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <div className="font-mono text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest space-y-1.5">
            <p>
              Status:{" "}
              <span className={cn(
                "text-primary transition-opacity duration-300",
                statusFade ? "opacity-100" : "opacity-0"
              )}>
                {statusTexts[statusIndex]}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <span>Core Temp:</span>
              <div className="w-[5px] h-[5px] rounded-full bg-[#00FF85] animate-[pulseGreen_2s_infinite]" />
              <span>NOMINAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT: Sphere */}
      <section className="flex-1 lg:flex-[0.4] relative flex items-center justify-center min-h-[50vh] lg:min-h-screen overflow-visible pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] md:w-[800px] xl:w-[1000px] aspect-square flex items-center justify-center z-0 pointer-events-auto">
          <div ref={sphereRef} style={{ opacity: 0, transform: 'scale(0.9)' }} className="relative w-full h-full flex items-center justify-center">
            <div className="scanlines-radial absolute inset-0 z-0" />
            <div
              className="absolute inset-0 animate-[pulseGlow_3s_ease-in-out_infinite] z-0"
              style={{ background: 'radial-gradient(circle, rgba(255,45,85,0.2) 0%, rgba(255,107,0,0.05) 40%, transparent 60%)' }}
            />
            <div
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto overflow-visible cursor-pointer"
              onClick={!isReady && !error ? startListening : undefined}
            >
              <OrganicSphereWrapper isListening={isReady} audioLevels={updateLevels} colorMode="vibrant" />
            </div>
          </div>
        </div>
        {/* Ambient bleed */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/10 rounded-full blur-[80px] md:blur-[120px] opacity-30 mix-blend-screen pointer-events-none" />
      </section>
    </main>
  );
}
