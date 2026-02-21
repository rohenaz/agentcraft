import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AgentCraft — Assign sounds to AI coding agent lifecycle events';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  const bars = [4, 7, 5, 9, 6, 10, 7, 8, 5, 9, 6, 8, 4, 7, 5, 8];
  const maxH = 120;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#07090F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top border accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#00E5FF', opacity: 0.8, display: 'flex' }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          display: 'flex',
        }} />

        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 48, height: maxH + 20 }}>
          {bars.map((v, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: Math.round((v / 10) * maxH),
                background: i === 8 ? '#00E5FF' : `rgba(0,229,255,${0.3 + (v / 10) * 0.7})`,
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#00E5FF',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          display: 'flex',
        }}>
          AGENTCRAFT
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 22,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          marginTop: 16,
          display: 'flex',
        }}>
          AUDIO ASSIGNMENT TERMINAL
        </div>

        {/* Tag line */}
        <div style={{
          fontSize: 16,
          color: 'rgba(0,229,255,0.5)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: 24,
          display: 'flex',
        }}>
          CLAUDE CODE · OPENCODE · AI LIFECYCLE HOOKS
        </div>

        {/* Bottom border */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#00E5FF', opacity: 0.3, display: 'flex' }} />
      </div>
    ),
    { ...size }
  );
}
