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
  const [isSphereReady, setIsSphereReady] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
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
      tl.to(ctaRef.current,     { opacity: 1, y:  0, duration: 0.45, ease: "power3.out" }, 1.8);
      tl.to(statusRef.current,  { opacity: 1, y:  0, duration: 0.45, ease: "power3.out" }, 2.1);

      // Gate behind window.load AND WebGL readiness so everything is silky smooth
      const checkAndStart = () => {
        if (isSphereReady && document.readyState === 'complete') {
          requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
        }
      };

      checkAndStart();
      window.addEventListener('load', checkAndStart, { once: true });
    });

    return () => ctx.revert();
  }, [isSphereReady]);


  // ── Auto-start Microphone Reactivity ──
  useEffect(() => {
    if (!isSphereReady) return;
    // Start listening automatically after 2 seconds from sphere readiness
    const timer = setTimeout(() => {
      startListening();
    }, 2000);
    return () => clearTimeout(timer);
  }, [isSphereReady, startListening]);

  return (
    <main className="relative min-h-[100dvh] lg:h-screen bg-[#080808] text-foreground w-full overflow-hidden font-sans selection:bg-primary flex flex-col lg:flex-row selection:text-white" style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}>
      
      {/* LEFT / TOP: Typography & Controls */}
      <section className="flex flex-col relative z-10 lg:flex-1 lg:justify-between lg:items-start lg:text-left items-center text-center" style={{ padding: 'clamp(2rem, 6vw, 5rem)', paddingBottom: '0' }}>
        
        {/* TOP: PROJECT IDENTITY */}
        <header ref={headerRef} style={{ opacity: 0, transform: 'translateY(-20px)' }} className="z-10 w-full flex flex-col items-center lg:items-start">
          <h2 className="font-mono tracking-[0.5em] text-white/40 uppercase mb-1" style={{ fontSize: 'clamp(8px, 0.9vw, 11px)' }}>Project</h2>
          <div className="font-bold tracking-[0.2em] uppercase flex items-center gap-3" style={{ fontSize: 'clamp(1rem, 2vw, 1.6rem)' }}>
            MINDMAP <span className="text-primary">MCU</span>
          </div>
        </header>

        {/* MIDDLE: HEADLINE & CONTENT */}
        <div className="flex flex-col items-center lg:items-start lg:flex-1 lg:justify-center" style={{ margin: 'clamp(1.5rem, 4vw, 5rem) 0' }}>
          <h1 className="font-heading font-black tracking-tighter uppercase text-center lg:text-left" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)', lineHeight: 0.9 }}>
            <div ref={word1Ref} style={{ opacity: 0, transform: 'translateY(20px)' }}>Organic</div>
            <div ref={word2Ref} style={{ opacity: 0, transform: 'translateY(20px)' }} className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] via-[#FF6B00] to-[#FF8C00]">
              Intelligence.
            </div>
          </h1>

          <div ref={taglineRef} style={{ opacity: 0, transform: 'translateY(20px)', marginTop: 'clamp(1.25rem, 2.5vw, 2rem)' }} className="max-w-xs lg:max-w-none">
            <p className="font-mono text-white/50 leading-relaxed normal-case" style={{ fontSize: 'clamp(12px, 1.1vw, 16px)' }}>
              {displayText}
              <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
            </p>
          </div>

          <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(20px)', marginTop: 'clamp(2rem, 4vw, 6rem)' }}>
            <button
              onClick={user ? () => router.push('/dashboard') : signInWithGoogle}
              disabled={loading}
              className="border-2 border-[#FF2D55] bg-transparent text-white font-bold uppercase transition-all duration-300 hover:bg-[#FF2D55] hover:shadow-[0_0_30px_rgba(255,45,85,0.4)]"
              style={{ letterSpacing: '0.3em', fontSize: 'clamp(9px, 0.85vw, 11px)', padding: 'clamp(0.9rem, 1.2vw, 1rem) clamp(2.5rem, 3vw, 2.5rem)' }}
            >
              {loading ? "Connecting..." : "Speak to the core"}
            </button>
          </div>
        </div>

        {/* BOTTOM: Status / Mic — Desktop only */}
        <div ref={statusRef} style={{ opacity: 0, transform: 'translateY(20px)', gap: 'clamp(0.75rem, 1.5vw, 1.5rem)' }} className="hidden lg:flex items-center">
          <Button
            size="lg"
            onClick={isReady ? stopListening : startListening}
            className={cn(
              "rounded-none transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none flex-shrink-0",
              isReady ? "bg-primary text-white" : "bg-white/10 text-white/40 border border-white/10"
            )}
            style={{ width: 'clamp(2.5rem, 3.5vw, 3.5rem)', height: 'clamp(2.5rem, 3.5vw, 3.5rem)' }}
          >
            <Mic style={{ width: 'clamp(0.8rem, 1.2vw, 1.25rem)', height: 'clamp(0.8rem, 1.2vw, 1.25rem)' }} className={cn(!isReady && "opacity-50")} />
          </Button>
          <div className="font-mono text-white/30 uppercase space-y-1" style={{ fontSize: 'clamp(7px, 0.75vw, 10px)', letterSpacing: '0.2em' }}>
            <p>Status: <span className="text-primary">{isReady ? "CORE ACTIVE" : "INTERFACE MUTED"}</span></p>
            <p>Neural Link: <span className={cn(isReady ? "text-[#00FF85]" : "text-white/20")}>Nominal</span></p>
          </div>
        </div>
      </section>

      {/* RIGHT / BOTTOM: THE CORE (SPHERE) — mirroring Dashboard's CorePanel pattern */}
      <section 
        className="lg:flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: 'clamp(320px, 60vw, 100vh)' }}
      >
        {/* Ambient glow — absolute centered, same as Dashboard */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "clamp(300px, 70vw, 600px)",
            height: "clamp(300px, 70vw, 600px)",
            background: "radial-gradient(circle, rgba(255,45,85,0.15) 0%, transparent 65%)",
            filter: "blur(60px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Sphere container — centered with mx-auto, responsive size via CSS */}
        <style>{`
          .sphere-responsive {
            width: clamp(260px, 78vw, 680px);
            height: clamp(260px, 78vw, 680px);
            left: 2rem;
          }
          @media (min-width: 1024px) {
            .sphere-responsive {
              width: clamp(280px, 42vw, 680px);
              height: clamp(280px, 42vw, 680px);
              left: 0;
            }
          }
        `}</style>
        <div 
          ref={sphereRef}
          className="sphere-responsive relative z-10 aspect-square mx-auto flex-shrink-0"
          style={{ opacity: 0, scale: 0.8 }}
        >
          <OrganicSphereWrapper 
            isListening={isReady} 
            audioLevels={updateLevels} 
            colorMode="vibrant" 
            onReady={() => setIsSphereReady(true)}
          />
        </div>
      </section>

    </main>
  );
}
