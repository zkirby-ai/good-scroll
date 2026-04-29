import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
        {/* warm glow */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            right: 70,
            width: 140,
            height: 140,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(232,144,64,0.55) 0%, rgba(232,144,64,0) 70%)'
          }}
        />
        {/* serif G */}
        <div
          style={{
            fontSize: 320,
            fontWeight: 500,
            fontFamily: 'serif',
            fontStyle: 'italic',
            color: '#f4ede0',
            letterSpacing: '-0.06em',
            lineHeight: 1,
            transform: 'translateY(-6px)',
            display: 'flex'
          }}
        >
          G
        </div>
        {/* accent dot */}
        <div
          style={{
            position: 'absolute',
            left: 360,
            top: 230,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: '#e89040',
            boxShadow: '0 0 30px rgba(232,144,64,0.7)'
          }}
        />
      </div>
    ),
    size
  );
}
