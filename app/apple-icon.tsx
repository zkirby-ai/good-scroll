import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(80% 60% at 30% 20%, #1a1612 0%, #0b0a08 60%, #050403 100%)',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(232,144,64,0.55) 0%, rgba(232,144,64,0) 70%)'
          }}
        />
        <div
          style={{
            fontSize: 118,
            fontWeight: 500,
            fontFamily: 'serif',
            fontStyle: 'italic',
            color: '#f4ede0',
            letterSpacing: '-0.06em',
            lineHeight: 1,
            transform: 'translateY(-2px)',
            display: 'flex'
          }}
        >
          G
        </div>
        <div
          style={{
            position: 'absolute',
            left: 126,
            top: 80,
            width: 14,
            height: 14,
            borderRadius: 999,
            background: '#e89040',
            boxShadow: '0 0 12px rgba(232,144,64,0.7)'
          }}
        />
      </div>
    ),
    size
  );
}
