"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { sphereVertexShader, sphereFragmentShader } from "./shaders";

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
    uLightAColor: new THREE.Color("#ffffff"),
    uLightAPosition: new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, 0.615, 2.049)),
    uLightAIntensity: 0.9,
    uLightBColor: new THREE.Color("#ffffff"),
    uLightBPosition: new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, 2.561, -1.844)),
    uLightBIntensity: 0.7,
    uSubdivision: new THREE.Vector2(192, 192),
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
    if (material) material.defines = { USE_TANGENT: "" };
  }
);

extend({ OrganicMaterial });

interface SphereCoreProps {
  isListening: boolean;
  isSpeaking?: boolean;
  audioLevels: () => number[];
  colorMode?: 'vibrant' | 'neutral';
  manualMode?: boolean;
  stressLevel?: number;
  energyLevel?: number;
  moodColor?: string;
  onReady?: () => void;
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
  onReady,
}: SphereCoreProps) {
  const materialRef = useRef<any>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Signal ready when mounted
  useEffect(() => {
    if (onReady) onReady();
  }, [onReady]);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 192, 192);
    geo.computeTangents();
    geo.computeVertexNormals();
    return geo;
  }, []);

  const variations = useRef({
    volume: { target: 0.152, current: 0.152, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    lowLevel: { target: 0.0003, current: 0.0003, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    mediumLevel: { target: 3.587, current: 3.587, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    highLevel: { target: 0.65, current: 0.65, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
    fresnelPower: { target: 1.793, current: 1.793, upEasing: 0.04, downEasing: 0.02, velocity: 0 },
  });

  const breathAccum = useRef(0);
  const offset = useRef({
    spherical: new THREE.Spherical(1, Math.random() * Math.PI, Math.random() * Math.PI * 2),
    direction: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;
    const timeDelta = delta * 1000;
    const timeRatio = Math.min(timeDelta / 16.666, 3);
    
    if (manualMode) {
      breathAccum.current += delta;
      const breathCycle = Math.sin(breathAccum.current * (0.8 + energyLevel * 1.5)) * 0.5 + 0.5;
      const distortionTarget = Math.min(0.9, 0.35 + stressLevel * 0.7);
      variations.current.highLevel.target = distortionTarget;
      variations.current.lowLevel.target = 0.0002 + energyLevel * 0.002;
      let breathDisplacement = 0.13 + breathCycle * 0.05 + stressLevel * 0.06;
      if (isSpeaking) {
        const speakingMod = Math.sin(timeRatio * 50) * 0.5 + 0.5;
        breathDisplacement *= (1 + speakingMod * 0.3);
        variations.current.lowLevel.target *= 1.5;
      }
      variations.current.volume.target = breathDisplacement;
      variations.current.mediumLevel.target = 3.587 + breathCycle * 0.3;
      variations.current.fresnelPower.target = 1.793 - stressLevel * 0.2;
      const dilutionRate = 0.003 * timeRatio;
      if (moodColor) {
        const sentimentA = new THREE.Color(moodColor);
        const sentimentB = new THREE.Color(moodColor).offsetHSL(0.04, -0.1, 0.08);
        materialRef.current.uLightAColor.lerp(sentimentA, dilutionRate);
        materialRef.current.uLightBColor.lerp(sentimentB, dilutionRate);
      } else {
        materialRef.current.uLightAColor.lerp(new THREE.Color("#ffffff"), dilutionRate * 2);
        materialRef.current.uLightBColor.lerp(new THREE.Color("#f0f0f0"), dilutionRate * 2);
      }
    } else if (isListening) {
      const levels = audioLevels();
      const low = levels[0] || 0;
      const mid = levels[1] || 0;
      const high = levels[2] || 0;
      let currentRawVol = Math.pow((low * 0.6) + (mid * 0.3) + (high * 0.1), 2);
      if (currentRawVol < 0.05) {
        variations.current.volume.target = 0.152;
      } else {
        variations.current.volume.target = currentRawVol * 0.35;
      }
      variations.current.lowLevel.target = Math.max(0.0003, low * 0.003 + 0.0001);
      variations.current.mediumLevel.target = Math.max(3.587, mid * 2 + 3.587);
      variations.current.fresnelPower.target = Math.max(0.8, 1.793 - (currentRawVol * 0.8));
      variations.current.highLevel.target = Math.max(0.5, high * 5 + 0.5);
      const targetColorA = colorMode === 'neutral' ? new THREE.Color("#e0e0e0") : new THREE.Color("#ff1a4a");
      const targetColorB = colorMode === 'neutral' ? new THREE.Color("#ffffff") : new THREE.Color("#ff7b00");
      if (currentRawVol > 0.7) {
        materialRef.current.uLightAColor.set("#ffffff");
        materialRef.current.uLightBColor.set("#ffffff");
      } else {
        materialRef.current.uLightAColor.lerp(targetColorA, 0.1 * timeRatio);
        materialRef.current.uLightBColor.lerp(targetColorB, 0.1 * timeRatio);
      }
    } else {
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
    const smoothedVol = Math.max(0, variations.current.volume.current / 0.35);
    materialRef.current.uDisplacementStrength = variations.current.volume.current;
    let distortion = variations.current.highLevel.current;
    if (smoothedVol > 0.5) distortion += (smoothedVol - 0.5) * 2.0;
    materialRef.current.uDistortionStrength = distortion;
    materialRef.current.uFresnelMultiplier = variations.current.mediumLevel.current;
    materialRef.current.uFresnelPower = variations.current.fresnelPower.current;
    meshRef.current.scale.setScalar(1 + variations.current.volume.current * 0.3);
    const offsetTime = elapsedTime * 0.3;
    offset.current.spherical.phi = ((Math.sin(offsetTime * 0.001) * Math.sin(offsetTime * 0.00321)) * 0.5 + 0.5) * Math.PI;
    offset.current.spherical.theta = ((Math.sin(offsetTime * 0.0001) * Math.sin(offsetTime * 0.000321)) * 0.5 + 0.5) * Math.PI * 2;
    offset.current.direction.setFromSpherical(offset.current.spherical);
    offset.current.direction.multiplyScalar(timeFrequency * 2);
    materialRef.current.uOffset.add(offset.current.direction);
    materialRef.current.uTime += elapsedTime * 0.001 * (1 + smoothedVol * 2);

    if (meshRef.current) {
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

export interface OrganicSphereProps {
  isListening: boolean;
  isSpeaking?: boolean;
  audioLevels: () => number[];
  colorMode?: 'vibrant' | 'neutral';
  manualMode?: boolean;
  stressLevel?: number;
  energyLevel?: number;
  moodColor?: string;
  onReady?: () => void;
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
  onReady,
}: OrganicSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    observer.observe(el);
    window.dispatchEvent(new Event('resize'));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent"
    >
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 25 }}
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
          onReady={onReady}
        />
      </Canvas>
    </div>
  );
}
