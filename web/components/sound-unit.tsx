'use client';

import { useDraggable } from '@dnd-kit/core';
import { formatSoundName } from '@/lib/utils';
import type { SoundAsset } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';

interface SoundUnitProps {
  sound: SoundAsset;
  isAssigned: boolean;
  onPreview: (path: string) => void;
  isOverlay?: boolean;
}

const BARS = 16;

export function SoundUnit({ sound, isAssigned, onPreview, isOverlay }: SoundUnitProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(sound.waveform.map(h => h / 10));

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Reset bars when sound changes
  useEffect(() => {
    setBars(sound.waveform.map(h => h / 10));
  }, [sound.waveform]);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.stop(); } catch {} sourceRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    setIsPlaying(false);
    setBars(sound.waveform.map(h => h / 10));
  }, [sound.waveform]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sound.path,
    data: { sound },
    disabled: isOverlay,
  });

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Stop if already playing
    if (isPlaying) { stop(); return; }

    setIsPlaying(true);

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256; // 128 frequency bins
    analyser.smoothingTimeConstant = 0.6;
    analyser.connect(ctx.destination);

    // Fetch audio and decode
    let audioBuffer: AudioBuffer;
    try {
      const res = await fetch(`/api/audio/${sound.path}`);
      const arrayBuf = await res.arrayBuffer();
      audioBuffer = await ctx.decodeAudioData(arrayBuf);
    } catch {
      stop();
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    source.start();
    sourceRef.current = source;

    source.onended = stop;

    // Drive bars from real frequency data
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const binsPerBar = Math.floor(analyser.frequencyBinCount / BARS);

    const draw = () => {
      analyser.getByteFrequencyData(freqData);
      const next = Array.from({ length: BARS }, (_, i) => {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) sum += freqData[i * binsPerBar + j];
        return Math.max(0.04, (sum / binsPerBar) / 255);
      });
      setBars(next);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const overlayStyle = isOverlay ? {
    backgroundColor: 'var(--sf-panel2)',
    border: '1px solid var(--sf-cyan)',
    boxShadow: '0 0 24px rgba(0,229,255,0.5), 0 0 8px rgba(0,229,255,0.3)',
    opacity: 1,
    cursor: 'grabbing',
    transform: 'rotate(1.5deg) scale(1.04)',
  } : {
    backgroundColor: 'var(--sf-panel2)',
    border: `1px solid ${isDragging ? 'var(--sf-cyan)' : isAssigned ? 'rgba(0,255,136,0.4)' : 'var(--sf-border)'}`,
    opacity: isDragging ? 0.3 : 1,
    boxShadow: isDragging ? '0 0 16px rgba(0,229,255,0.4)' : undefined,
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className="sf-card relative flex flex-col gap-2 p-3 transition-all"
      style={{ ...overlayStyle, cursor: isOverlay ? 'grabbing' : 'grab' }}
      {...(isOverlay ? {} : { ...listeners, ...attributes })}
    >
      {isAssigned && !isOverlay && (
        <div
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--sf-green)', boxShadow: '0 0 4px var(--sf-green)' }}
        />
      )}

      <div className="flex items-end gap-px h-5">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: `${v * 100}%`,
              backgroundColor: isOverlay || isPlaying ? 'var(--sf-cyan)' : 'rgba(0,229,255,0.35)',
              minWidth: '2px',
              transition: 'height 50ms linear',
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] opacity-70 truncate leading-tight" title={sound.filename}>
          {formatSoundName(sound.filename)}
        </span>
        {!isOverlay && (
          <button
            onClick={handlePreview}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] transition-all"
            style={{ border: '1px solid var(--sf-border)', color: 'var(--sf-cyan)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isPlaying ? '\u25A0' : '\u25B6'}
          </button>
        )}
      </div>
    </div>
  );
}
