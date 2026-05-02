"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { sphereVertexShader, sphereFragmentShader } from "./shaders";
import { useAudioReactivity } from "@/hooks/useAudioReactivity";

// Suppress THREE.Clock deprecation warning coming from @react-three/fiber internals
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const OrganicMaterial = shaderMaterial(
  {
    // Start pure white — onboarding slowly dilutes this with sentiment color
    uLightAColor: new THREE.Color("#ffffff"),
    uLightAPosition: new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, 0.615, 2.049)),
    uLightAIntensity: 0.9,
    uLightBColor: new THREE.Color("#ffffff"),
    uLightBPosition: new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, 2.561, -1.844)),
    uLightBIntensity: 0.7,
    uSubdivision: new THREE.Vector2(192, 192), // MUST MATCH sphereGeometry args
    uOffset: new THREE.Vector3(),
    uDistortionFrequency: 1.5,
    uDistortionStrength: 0.65,
    uDisplacementFrequency: 2.12,
    uDisplacementStrength: 0.152,
    uFresnelOffset: -1.609,
    uFresnelMultiplier: 3.587,
    uFresnelPower: 1.793,
    uTime: 0,
  },
  sphereVertexShader,
  sphereFragmentShader,
  (material) => {
    material.defines = { USE_TANGENT: "" };
  }
);

extend({ OrganicMaterial });

// ── Props Interface ──
interface SphereCoreProps {
  isListening: boolean;
  isSpeaking?: boolean;
  audioLevels: () => number[];
  colorMode?: 'vibrant' | 'neutral';
  manualMode?: boolean;
  stressLevel?: number;   // 0-1: controls uDistortionStrength
  energyLevel?: number;   // 0-1: controls pulsing speed (lowLevel.target)
  moodColor?: string;     // hex: lerp target for light colors
}

function SphereCore({
  isListening,
  isSpeaking = false,
  audioLevels,
  colorMode = 'vibrant',
  manualMode = false,
  stressLevel = 0.3,
  energyLevel = 0.3,
  moodColor,
}: SphereCoreProps) {
  const materialRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Create geometry once and compute tangents immediately
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 192, 192);
    geo.computeTangents();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Variations state - Acceleration & Velocity (Spring Physics)
  // upEasing reduced from 0.08 → 0.04 for softer, less jittery reactions
  const variations = useRef({
    volume: { target: 0.152, current: 0.152, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    lowLevel: { target: 0.0003, current: 0.0003, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    mediumLevel: { target: 3.587, current: 3.587, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    highLevel: { target: 0.65, current: 0.65, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    fresnelPower: { target: 1.793, current: 1.793, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
  });

  // Auto-breathing accumulator for manual mode
  const breathAccum = useRef(0);

  const offset = useRef({
    spherical: new THREE.Spherical(1, Math.random() * Math.PI, Math.random() * Math.PI * 2),
    direction: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    // Normalize delta for 60fps base calculations
    const timeDelta = delta * 1000;
    const timeRatio = Math.min(timeDelta / 16.666, 3);

    let currentRawVol = 0;

    if (manualMode) {
      // ═══ MANUAL MODE: Drive sphere from external state ═══
      breathAccum.current += delta;
      const breathCycle = Math.sin(breathAccum.current * (0.8 + energyLevel * 1.5)) * 0.5 + 0.5;

      // Map stressLevel to distortion — capped at 0.9 to prevent visual noise jitter
      const distortionTarget = Math.min(0.9, 0.35 + stressLevel * 0.7);
      variations.current.highLevel.target = distortionTarget;

      // Map energyLevel to pulsing speed
      variations.current.lowLevel.target = 0.0002 + energyLevel * 0.002;

      // Auto-breathing displacement: very gentle sine — keeps surface rippling without chaos
      let breathDisplacement = 0.13 + breathCycle * 0.05 + stressLevel * 0.06;
      
      // Override for TTS Mindy speaking
      if (isSpeaking) {
        // Create an artificial voice modulation based on rapid time
        const speakingMod = Math.sin(timeRatio * 50) * 0.5 + 0.5; // rapid pulse
        breathDisplacement *= (1 + speakingMod * 0.3); // add 30% volume pulse when speaking
        variations.current.lowLevel.target *= 1.5; // faster speed
      }
      
      variations.current.volume.target = breathDisplacement;

      // Softer fresnel for manual mode
      variations.current.mediumLevel.target = 3.587 + breathCycle * 0.3;
      variations.current.fresnelPower.target = 1.793 - stressLevel * 0.2;

      // ── SLOW COLOR DILUTION ──
      // Each frame lerps only 0.003 towards the sentiment color.
      // Over ~300 frames (~5s at 60fps) the white fully dilutes to the moodColor.
      // When moodColor changes (new answer selected), it begins blending from the
      // current tinted color towards the new target — not from white.
      const dilutionRate = 0.003 * timeRatio;
      if (moodColor) {
        const sentimentA = new THREE.Color(moodColor);
        // Secondary light is a slightly shifted hue for depth
        const sentimentB = new THREE.Color(moodColor).offsetHSL(0.04, -0.1, 0.08);
        materialRef.current.uLightAColor.lerp(sentimentA, dilutionRate);
        materialRef.current.uLightBColor.lerp(sentimentB, dilutionRate);
      } else {
        // No mood selected yet — stay white
        materialRef.current.uLightAColor.lerp(new THREE.Color("#ffffff"), dilutionRate * 2);
        materialRef.current.uLightBColor.lerp(new THREE.Color("#f0f0f0"), dilutionRate * 2);
      }

    } else if (isListening) {
      // ═══ AUDIO MODE: Drive sphere from microphone ═══
      const [low, mid, high] = audioLevels();
      // Quadratic filter: squash small values, amplify large ones for smoother response
      currentRawVol = Math.pow((low * 0.6) + (mid * 0.3) + (high * 0.1), 2);

      // Noise gate threshold: keep breathing if silent
      if (currentRawVol < 0.05) {
        variations.current.volume.target = 0.152;
      } else {
        // Softer displacement multiplier (0.35)
        variations.current.volume.target = currentRawVol * 0.35;
      }

      variations.current.lowLevel.target = Math.max(0.0003, low * 0.003 + 0.0001);

      // Reset mediumLevel to a softer multiplier, and decrease fresnelPower
      variations.current.mediumLevel.target = Math.max(3.587, mid * 2 + 3.587);
      variations.current.fresnelPower.target = Math.max(0.8, 1.793 - (currentRawVol * 0.8));

      variations.current.highLevel.target = Math.max(0.5, high * 5 + 0.5);

      // Determine target colors based on colorMode
      const targetColorA = colorMode === 'neutral' ? new THREE.Color("#e0e0e0") : new THREE.Color("#ff1a4a");
      const targetColorB = colorMode === 'neutral' ? new THREE.Color("#ffffff") : new THREE.Color("#ff7b00");

      // Hit effect: flash white on loud sounds (>0.7)
      if (currentRawVol > 0.7) {
        materialRef.current.uLightAColor.set("#ffffff");
        materialRef.current.uLightBColor.set("#ffffff");
      } else {
        materialRef.current.uLightAColor.lerp(targetColorA, 0.1 * timeRatio);
        materialRef.current.uLightBColor.lerp(targetColorB, 0.1 * timeRatio);
      }
    } else {
      // ═══ IDLE MODE: Base breathing state ═══
      breathAccum.current += delta;
      const idleBreath = Math.sin(breathAccum.current * 0.6) * 0.5 + 0.5;

      variations.current.volume.target = 0.142 + idleBreath * 0.02;
      variations.current.lowLevel.target = 0.0003;
      variations.current.mediumLevel.target = 3.587;
      variations.current.highLevel.target = 0.65;
      variations.current.fresnelPower.target = 1.793;

      const targetColorA = colorMode === 'neutral' ? new THREE.Color("#e0e0e0") : new THREE.Color("#ff1a4a");
      const targetColorB = colorMode === 'neutral' ? new THREE.Color("#ffffff") : new THREE.Color("#ff7b00");
      materialRef.current.uLightAColor.lerp(targetColorA, 0.1 * timeRatio);
      materialRef.current.uLightBColor.lerp(targetColorB, 0.1 * timeRatio);
    }

    // Apply Acceleration & Velocity (Spring physics)
    for (const key of Object.keys(variations.current) as Array<keyof typeof variations.current>) {
      const v = variations.current[key];
      const acceleration = v.target > v.current ? v.upEasing : v.downEasing;
      const friction = 0.8;

      v.velocity += (v.target - v.current) * acceleration * timeRatio;
      v.current += v.velocity * timeRatio;
      v.velocity *= friction;
    }

    const timeFrequency = variations.current.lowLevel.current;
    const elapsedTime = timeRatio * timeFrequency * 1000;

    // Extract normalized volume from smoothed state (~0 to 1 range, max target is 0.35)
    const smoothedVol = Math.max(0, variations.current.volume.current / 0.35);

    // Update Material Uniforms
    materialRef.current.uDisplacementStrength = variations.current.volume.current;

    // Add boiling distortion when loud
    let distortion = variations.current.highLevel.current;
    if (smoothedVol > 0.5) {
      distortion += (smoothedVol - 0.5) * 2.0;
    }
    materialRef.current.uDistortionStrength = distortion;

    materialRef.current.uFresnelMultiplier = variations.current.mediumLevel.current;
    materialRef.current.uFresnelPower = variations.current.fresnelPower.current;

    // Scale mesh reaction — use smoothed volume.current directly for very soft pulsing
    meshRef.current.scale.setScalar(1 + variations.current.volume.current * 0.3);

    // CSS filter bloom đã được loại bỏ. Quầng sáng (Glow) sẽ dựa vào fresnel trong shaders.ts.

    // Offset
    const offsetTime = elapsedTime * 0.3;
    offset.current.spherical.phi = ((Math.sin(offsetTime * 0.001) * Math.sin(offsetTime * 0.00321)) * 0.5 + 0.5) * Math.PI;
    offset.current.spherical.theta = ((Math.sin(offsetTime * 0.0001) * Math.sin(offsetTime * 0.000321)) * 0.5 + 0.5) * Math.PI * 2;
    offset.current.direction.setFromSpherical(offset.current.spherical);
    offset.current.direction.multiplyScalar(timeFrequency * 2);

    materialRef.current.uOffset.add(offset.current.direction);
    // Boiling effect: accelerate time dimension of the noise when speaking
    materialRef.current.uTime += elapsedTime * 0.001 * (1 + smoothedVol * 2);
    // Rotate mesh if not dragging
    if (!isDragging.current && meshRef.current) {
      meshRef.current.rotation.y += 0.05 * timeRatio * 0.01;
    }
  });

  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: any) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    if (e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !meshRef.current) return;

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    meshRef.current.rotation.y += deltaX * 0.005;
    meshRef.current.rotation.x += deltaY * 0.005;

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: any) => {
    isDragging.current = false;
    if (e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* @ts-ignore */}
      <organicMaterial ref={materialRef} />
    </mesh>
  );
}

// ── Exported Props Interface ──
export interface OrganicSphereProps {
  isListening: boolean;
  isSpeaking?: boolean;
  audioLevels: () => number[];
  colorMode?: 'vibrant' | 'neutral';
  manualMode?: boolean;
  stressLevel?: number;
  energyLevel?: number;
  moodColor?: string;
}

export default function OrganicSphere({
  isListening,
  isSpeaking = false,
  audioLevels,
  colorMode = 'vibrant',
  manualMode = false,
  stressLevel = 0.3,
  energyLevel = 0.3,
  moodColor,
}: OrganicSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fix: R3F Canvas measures container at mount time, but CSS clamp()/vmin
  // values may not have settled yet (especially with dynamic imports + scrollbar).
  // ResizeObserver watches the container and dispatches a synthetic resize event
  // whenever dimensions actually change, forcing R3F to remeasure.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });

    observer.observe(el);
    // Also fire once immediately after mount to catch the initial layout settle
    window.dispatchEvent(new Event('resize'));

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent"
    >
      {/* Use same Camera config as Bruno Simon for correct scale, zoomed out 10% */}
      <Canvas
        camera={{ position: [0, 0, 6.6], fov: 25 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        style={{ background: 'transparent' }}
        resize={{ debounce: { scroll: 50, resize: 0 } }}
      >
        <SphereCore
          isListening={isListening}
          isSpeaking={isSpeaking}
          audioLevels={audioLevels}
          colorMode={colorMode}
          manualMode={manualMode}
          stressLevel={stressLevel}
          energyLevel={energyLevel}
          moodColor={moodColor}
        />
      </Canvas>
    </div>
  );
}
