"use client";

import { useRef, useState } from "react";

export function useAudioReactivity() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const levelsRef = useRef<number[]>([0, 0, 0]); // Low, Mid, High

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 512;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      setIsReady(true);
      setError(null);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setError("Microphone access denied");
    }
  };

  const updateLevels = () => {
    if (!analyserRef.current || !dataArrayRef.current) return levelsRef.current;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    
    // Split into 3 bands: Low, Mid, High
    const length = dataArrayRef.current.length;
    let low = 0, mid = 0, high = 0;
    
    for (let i = 0; i < length; i++) {
      const value = dataArrayRef.current[i] / 255.0; // Normalize 0-1
      if (i < length * 0.1) { // Low frequencies
        low += value;
      } else if (i < length * 0.5) { // Mid
        mid += value;
      } else { // High
        high += value;
      }
    }
    
    low /= (length * 0.1);
    mid /= (length * 0.4);
    high /= (length * 0.5);
    
    levelsRef.current = [low, mid, high];
    return levelsRef.current;
  };

  return { isReady, startListening, updateLevels, error };
}
