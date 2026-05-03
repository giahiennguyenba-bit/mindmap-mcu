"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the OrganicSphere to prevent SSR issues with WebGL/Three.js
const OrganicSphere = dynamic(() => import("./OrganicSphere"), {
  ssr: false,
});

export interface OrganicSphereWrapperProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevels?: () => number[];
  colorMode?: 'vibrant' | 'neutral';
  manualMode?: boolean;
  stressLevel?: number;
  energyLevel?: number;
  moodColor?: string;
  onReady?: () => void;
}

export default function OrganicSphereWrapper({
  isListening = false,
  isSpeaking = false,
  audioLevels = () => [0, 0, 0],
  colorMode = 'vibrant',
  manualMode = false,
  stressLevel = 0.3,
  energyLevel = 0.3,
  moodColor,
  onReady,
}: OrganicSphereWrapperProps) {
  return (
    <Suspense fallback={
      <div className="relative w-[150%] h-[150%] flex items-center justify-center animate-[spin_20s_linear_infinite]">
        <div className="absolute w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-[#ff1a4a] via-[#ff7b00] to-[#00d4ff] opacity-20 blur-3xl animate-pulse"></div>
      </div>
    }>
      <OrganicSphere
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
    </Suspense>
  );
}
