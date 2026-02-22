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
  onSelectAssign?: () => void; // if set, card click assigns instead of plays
  packLabel?: string;          // shown when browsing multiple packs simultaneously
}

const BARS = 16;

export function SoundUnit({ sound, isAssigned, onPreview, isOverlay, onSelectAssign, packLabel }: SoundUnitProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [bars, setBars] = useState<number[]>(sound.waveform.map(h => h / 10));

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  // Track whether a drag actually happened so we can suppress the click
  const didDragRef = useRef(false);

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

  // Track drag so we can suppress click-to-play after a drag
  useEffect(() => {
    if (isDragging) didDragRef.current = true;
  }, [isDragging]);

  const playSound = useCallback(async () => {
    if (isPlaying) { stop(); return; }
    setIsPlaying(true);

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    analyser.connect(ctx.destination);

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
  }, [isPlaying, sound.path, stop]);

  const handleCardClick = useCallback(() => {
    if (didDragRef.current) { didDragRef.current = false; return; }
    if (onSelectAssign) {
      onSelectAssign();
    } else {
      playSound();
    }
  }, [playSound, onSelectAssign]);

  if (isOverlay) {
    return (
      <div
        className="sf-card relative flex flex-col gap-2 p-3"
        style={{
          backgroundColor: 'var(--sf-panel2)',
          border: '1px solid var(--sf-cyan)',
          boxShadow: '0 0 24px rgba(0,229,255,0.5), 0 0 8px rgba(0,229,255,0.3)',
          opacity: 1,
          cursor: 'grabbing',
          transform: 'rotate(1.5deg) scale(1.04)',
        }}
      >
        <div className="flex items-end gap-px h-5">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ height: `${v * 100}%`, backgroundColor: 'var(--sf-cyan)', minWidth: '2px' }}
            />
          ))}
        </div>
        <span className="text-[10px] opacity-70 truncate leading-tight">{formatSoundName(sound.filename)}</span>
      </div>
    );
  }

  const lit = isHovered || isPlaying;

  return (
    <div
      ref={setNodeRef}
      // data-sf-hover: hover sound fires on enter
      // data-no-ui-sound: suppress UI click sound (card click plays actual audio instead)
      data-sf-hover
      data-no-ui-sound
      className="sf-card relative flex flex-col gap-2 p-3 transition-all select-none"
      style={{
        backgroundColor: lit ? 'rgba(0,229,255,0.06)' : 'var(--sf-panel2)',
        border: `1px solid ${
          isDragging ? 'var(--sf-cyan)'
          : isPlaying ? 'var(--sf-cyan)'
          : onSelectAssign && lit ? 'rgba(0,229,255,0.8)'
          : onSelectAssign ? 'rgba(0,229,255,0.35)'
          : lit ? 'rgba(0,229,255,0.55)'
          : isAssigned ? 'rgba(0,255,136,0.4)'
          : 'var(--sf-border)'
        }`,
        opacity: isDragging ? 0.3 : 1,
        boxShadow: isPlaying ? '0 0 8px rgba(0,229,255,0.2)' : isDragging ? '0 0 16px rgba(0,229,255,0.4)' : undefined,
        cursor: isDragging ? 'grabbing' : 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      {...listeners}
      {...attributes}
    >
      {isAssigned && !isPlaying && (
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
              backgroundColor: isPlaying ? 'var(--sf-cyan)' : lit ? 'rgba(0,229,255,0.55)' : 'rgba(0,229,255,0.3)',
              minWidth: '2px',
              transition: 'height 50ms linear',
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[10px] truncate leading-tight"
          style={{ color: lit ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)' }}
          title={sound.filename}
        >
          {formatSoundName(sound.filename)}
        </span>
        {onSelectAssign && !isPlaying && (
          <span className="shrink-0 text-[9px]" style={{ color: 'rgba(0,229,255,0.5)' }}>→</span>
        )}
        {isPlaying && (
          <span className="shrink-0 text-[9px] animate-pulse" style={{ color: 'var(--sf-cyan)' }}>♪</span>
        )}
      </div>
      {packLabel && (
        <span className="text-[8px] truncate leading-none" style={{ color: 'rgba(255,192,0,0.45)' }}>
          {packLabel}
        </span>
      )}
    </div>
  );
}
