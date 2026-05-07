"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, Brain, Shield, Calendar, MessageCircle, BarChart3, ArrowRight, Lock, Heart } from "lucide-react";
import OrganicSphereWrapper from "@/components/3d/OrganicSphereWrapper";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { useAudioReactivity } from "@/hooks/useAudioReactivity";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isReady, startListening, stopListening, updateLevels, error } = useAudioReactivity();
  const { user, loading, signInWithGoogle } = useAuth();
  const [isSphereReady, setIsSphereReady] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Fix: sphere off-center on mobile before first scroll (browser layout reflow issue)
  // Apply a 2rem left offset initially, snap to centered position on first scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0 && !hasScrolled) {
        setHasScrolled(true);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

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
  const headerRef = useRef(null);
  const word1Ref = useRef(null);
  const word2Ref = useRef(null);
  const taglineRef = useRef(null);
  const ctaRef = useRef(null);
  const statusRef = useRef(null);
  const sphereRef = useRef(null);

  // ── Status Bar Cycling ──
  const statusTexts = ["AWAITING INPUT...", "SCANNING SCHEDULE...", "CORE READY."];
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusFade, setStatusFade] = useState(true);

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
      tl.to(headerRef.current, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.0);

      // 2. Sphere — starts early, long warm-up so it feels like materialization not a pop
      tl.to(sphereRef.current, { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" }, 0.4);

      // 3. "ORGANIC" slides in from left
      tl.to(word1Ref.current, { opacity: 1, x: 0, duration: 0.65, ease: "power3.out" }, 0.7);

      // 4. "INTELLIGENCE." — 0.3s after "ORGANIC" so brain processes each word separately
      tl.to(word2Ref.current, { opacity: 1, x: 0, duration: 0.65, ease: "power3.out" }, 1.0);

      // 5. Tagline — intentional 0.4s gap after headline finishes (breathing room)
      tl.to(taglineRef.current, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 1.4);
      tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 1.8);
      tl.to(statusRef.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 2.1);

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
    // Start listening automatically after 0.5 seconds from sphere readiness
    const timer = setTimeout(() => {
      startListening();
    }, 500);
    return () => clearTimeout(timer);
  }, [isSphereReady, startListening]);

  return (
    <div className="bg-[#080808] text-white font-sans overflow-x-hidden">
      {/* ═══ HERO ═══ */}
      <main className="relative min-h-[100dvh] xl:h-screen w-full overflow-hidden flex flex-col xl:flex-row selection:bg-primary selection:text-white" style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}>
        <style>{`
          /* Large tablet / small desktop: iPad Pro 1366px and similar */
          @media (min-width: 1280px) and (max-width: 1536px) {
            .hero-headline-text { font-size: clamp(2rem, 5.5vw, 4.8rem) !important; }
            .hero-left-xl { padding: clamp(1.5rem, 3.5vw, 3.5rem) !important; padding-bottom: clamp(1.5rem, 3vw, 3rem) !important; }
            .hero-middle-xl { margin-top: clamp(1rem, 2vw, 2.5rem) !important; margin-bottom: clamp(1rem, 2vw, 2rem) !important; }
            .hero-cta-xl { margin-top: clamp(1.25rem, 2.5vw, 2.5rem) !important; }
          }
        `}</style>

        {/* LEFT / TOP: Typography & Controls */}
        <section className="hero-left-xl flex flex-col relative z-10 xl:flex-1 xl:justify-between xl:items-start xl:text-left items-center text-center" style={{ padding: 'clamp(2rem, 6vw, 5rem)', paddingBottom: 'clamp(2rem, 5vw, 5rem)' }}>

          {/* TOP: PROJECT IDENTITY */}
          <header ref={headerRef} style={{ opacity: 0, transform: 'translateY(-20px)' }} className="z-10 w-full flex flex-col items-center xl:items-start">
            <h2 className="font-mono tracking-[0.5em] text-white/40 uppercase mb-1" style={{ fontSize: 'clamp(8px, 0.9vw, 11px)' }}>Project</h2>
            <div className="font-bold tracking-[0.2em] uppercase flex items-baseline gap-3" style={{ fontSize: 'clamp(1rem, 2vw, 1.6rem)' }}>
              <span>MINDMAP</span> <span className="text-primary">MCU</span>
            </div>
          </header>

          {/* MIDDLE: HEADLINE & CONTENT */}
          <div className="hero-middle-xl flex flex-col items-center xl:items-start xl:flex-1 xl:justify-center" style={{ margin: 'clamp(1.5rem, 4vw, 5rem) 0' }}>
            <h1 className="hero-headline-text font-heading font-black tracking-tighter uppercase text-center xl:text-left" style={{ fontSize: 'clamp(3rem, 10vw, 9rem)', lineHeight: 0.9 }}>
              <div ref={word1Ref} style={{ opacity: 0, transform: 'translateY(20px)' }}>Organic</div>
              <div ref={word2Ref} style={{ opacity: 0, transform: 'translateY(20px)' }} className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] via-[#FF6B00] to-[#FF8C00]">
                Intelligence.
              </div>
            </h1>

            <div ref={taglineRef} style={{ opacity: 0, transform: 'translateY(20px)', marginTop: 'clamp(1.25rem, 2.5vw, 2rem)' }} className="max-w-xs xl:max-w-none">
              <p className="font-mono text-white/50 leading-relaxed normal-case" style={{ fontSize: 'clamp(12px, 1.1vw, 16px)' }}>
                {displayText}
                <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
              </p>
            </div>

            <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(20px)', marginTop: 'clamp(2rem, 4vw, 6rem)' }} className="hero-cta-xl">
              <button
                onClick={user ? () => router.push('/dashboard') : signInWithGoogle}
                disabled={loading}
                className="border-2 border-[#FF2D55] bg-transparent text-white font-bold uppercase transition-all duration-300 hover:bg-[#FF2D55] hover:shadow-[0_0_30px_rgba(255,45,85,0.4)]"
                style={{ letterSpacing: '0.3em', fontSize: 'clamp(9px, 0.85vw, 11px)', padding: 'clamp(0.9rem, 1.2vw, 1rem) clamp(2.5rem, 3vw, 2.5rem)' }}
              >
                {loading ? "Connecting..." : "Connect with Mindy"}
              </button>
            </div>
          </div>

          {/* BOTTOM: Status / Mic — Desktop only */}
          <div ref={statusRef} style={{ opacity: 0, transform: 'translateY(20px)', gap: 'clamp(0.75rem, 1.5vw, 1.5rem)' }} className="hidden xl:flex items-center">
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

        {/* RIGHT / BOTTOM: THE CORE (SPHERE) */}
        <section
          className="xl:flex-1 relative flex items-center justify-center overflow-hidden"
          style={{ minHeight: 'clamp(300px, 50vh, 100vh)' }}
        >
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

          <style>{`
          .sphere-responsive {
            width: clamp(260px, 70vw, 560px);
            height: clamp(260px, 70vw, 560px);
          }
          @media (min-width: 768px) and (max-width: 1279px) {
            .sphere-responsive {
              width: clamp(260px, 55vw, 480px);
              height: clamp(260px, 55vw, 480px);
            }
          }
          @media (min-width: 1280px) {
            .sphere-responsive {
              width: clamp(300px, 42vw, 680px);
              height: clamp(300px, 42vw, 680px);
            }
            .sphere-wrapper {
              transform: translateX(0px) !important;
            }
          }
        `}</style>
          <div
            ref={sphereRef}
            className="sphere-wrapper sphere-responsive relative z-10 aspect-square mx-auto flex-shrink-0"
            style={{
              opacity: 0,
              scale: 0.8,
              transform: `translateX(${hasScrolled ? '0px' : '32px'})`,
              transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
            }}
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

      {/* ═══ PROBLEM SECTION ═══ */}
      <section className="relative pt-8 pb-24 md:py-32 px-6 md:px-16 lg:px-24 max-w-6xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center"
        >
          <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-6">The problem</p>
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Students carry more <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] to-[#FF6B00]">mental weight</span> than ever before.
          </h2>
          <p className="mt-6 text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed font-light">
            Academic pressure, social isolation, and burnout are at an all-time high. Most students suffer in silence because professional help feels distant and intimidating.
          </p>
        </motion.div>
      </section>

      {/* ═══ FEATURES SECTION ═══ */}
      <section className="py-16 md:py-24 px-6 md:px-16 lg:px-24 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-12 text-center"
        >Core capabilities</motion.p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "CBT-Powered AI Companion",
              desc: "Mindy uses Cognitive Behavioral Therapy techniques to help you reframe negative thoughts and build emotional resilience — not just chat."
            },
            {
              icon: Calendar,
              title: "Smart Schedule Sync",
              desc: "Your timetable feeds Mindy's awareness. She knows when you're overloaded and suggests healing blocks directly into your schedule."
            },
            {
              icon: BarChart3,
              title: "Emotional Analytics",
              desc: "Track your stress patterns over time. See weekly trends, identify triggers, and watch your balance improve with real data."
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="group p-8 border border-white/[0.06] bg-white/[0.02] rounded-2xl hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500"
            >
              <feature.icon size={28} strokeWidth={1.2} className="text-white/30 mb-6 group-hover:text-[#FF2D55] transition-colors duration-500" />
              <h3 className="text-lg font-semibold tracking-tight mb-3">{feature.title}</h3>
              <p className="text-sm text-white/35 leading-relaxed font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 md:py-32 px-6 md:px-16 lg:px-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-4">How it works</p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Three steps to clarity.</h2>
        </motion.div>

        {/* Mobile: vertical stack with connector line | Desktop: horizontal row */}
        <div className="relative flex flex-col md:flex-row md:items-stretch gap-0">
          {/* Desktop connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {[
            { step: "01", label: "Sign in", desc: "Connect with your Google account. Your data stays private and encrypted." },
            { step: "02", label: "Talk to Mindy", desc: "Share what's on your mind. She listens, validates, and gently reframes." },
            { step: "03", label: "Grow", desc: "Track your emotional progress. Build resilience with real insights over time." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.18 }}
              className="flex-1 flex md:flex-col items-start md:items-center gap-5 md:gap-4 relative
              px-6 py-6 md:py-0 md:px-6
              border-l-2 md:border-l-0 md:border-t-0 border-white/10
              first:border-l-0 md:first:border-l-0"
              style={{
                borderLeftColor: i === 0 ? 'rgba(255,45,85,0.5)' : undefined
              }}
            >
              {/* Mobile: vertical connector dot */}
              {i < 2 && (
                <div className="md:hidden absolute left-[-1px] bottom-0 w-[2px] h-full bg-gradient-to-b from-white/10 to-transparent" />
              )}

              {/* Step number circle */}
              <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/15 bg-[#080808]
              flex items-center justify-center relative z-10"
              >
                <span className="font-mono font-bold text-sm md:text-base text-transparent bg-clip-text bg-gradient-to-br from-[#FF2D55] to-[#FF8C00]">
                  {item.step}
                </span>
              </div>

              {/* Text */}
              <div className="text-left md:text-center">
                <h3 className="text-base md:text-lg font-semibold mb-1.5 text-white">{item.label}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ TRUST & SAFETY ═══ */}
      <section className="py-20 md:py-28 px-6 md:px-16 lg:px-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="p-8 md:p-12 border border-white/[0.06] bg-white/[0.015] rounded-2xl"
        >
          <p className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-6">Built on trust</p>
          <h2 className="text-2xl md:text-3xl font-heading font-bold tracking-tight mb-8">Your safety is non-negotiable.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Crisis Protocol", desc: "If Mindy detects signs of distress, she immediately connects you to MCU Counseling and the Taiwan crisis hotline (1925)." },
              { icon: Lock, title: "Data Privacy", desc: "All conversations are encrypted and stored securely. Your emotional data is yours alone — never shared, never sold." },
              { icon: Heart, title: "Evidence-Based", desc: "Every response is grounded in CBT research. Mindy never suggests self-harm — this is an absolute, unbreakable rule." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <item.icon size={22} strokeWidth={1.2} className="text-white/25 mb-4" />
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-xs text-white/30 leading-relaxed font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 md:py-32 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight leading-[1.1] mb-6">
            Ready to meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2D55] to-[#FF6B00]">Mindy</span>?
          </h2>
          <p className="text-base text-white/35 mb-10 font-light leading-relaxed max-w-md mx-auto">
            Your AI psychologist is waiting. Free for all Ming Chuan University students.
          </p>
          <button
            onClick={user ? () => router.push('/dashboard') : signInWithGoogle}
            disabled={loading}
            className="group inline-flex items-center gap-3 border-2 border-[#FF2D55] bg-transparent text-white font-bold uppercase tracking-[0.3em] transition-all duration-300 hover:bg-[#FF2D55] hover:shadow-[0_0_40px_rgba(255,45,85,0.3)]"
            style={{ fontSize: 'clamp(9px, 0.85vw, 11px)', padding: 'clamp(1rem, 1.4vw, 1.2rem) clamp(2.5rem, 3.5vw, 3rem)' }}
          >
            {loading ? "Connecting..." : "Begin your journey"}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.05] py-8 px-6 text-center">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-5xl mx-auto gap-4">
          <p className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">
            Project MindMap MCU — Ming Chuan University
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em] hover:text-white/40 transition-colors">Privacy</a>
            <span className="font-mono text-[9px] text-white/10">© 2025</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

