import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180
};

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
          background: '#0b1117',
          borderRadius: 44,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 16,
            borderRadius: 36,
            background: 'linear-gradient(180deg, #141c24 0%, #0e141b 100%)',
            border: '1px solid rgba(245, 244, 240, 0.08)'
          }}
        />
        <div
          style={{
            width: 76,
            height: 96,
            borderRadius: 16,
            background: '#101821',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.32)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: 'polygon(0 0, 100% 0, 100% 67%, 50% 58%, 0 63%)',
              background: 'linear-gradient(180deg, #16212c 0%, #0f1720 100%)'
            }}
          />
          <div style={{ position: 'absolute', left: 12, right: 14, top: 26, height: 6, borderRadius: 999, background: '#8cf3c9' }} />
          <div style={{ position: 'absolute', left: 12, right: 28, top: 44, height: 6, borderRadius: 999, background: 'rgba(140, 243, 201, 0.92)' }} />
          <div style={{ position: 'absolute', left: 12, right: 40, top: 62, height: 6, borderRadius: 999, background: 'rgba(140, 243, 201, 0.82)' }} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 28,
              background: 'linear-gradient(90deg, #8cf3c9 0%, #4bc0a1 100%)',
              clipPath: 'polygon(0 18%, 34% 0, 58% 8%, 100% 30%, 100% 100%, 0 100%)'
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 34,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: '#8cf3c9',
            color: '#0b1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            boxShadow: '0 0 16px rgba(140,243,201,0.35)'
          }}
        >
          +
        </div>
      </div>
    ),
    size
  );
}
