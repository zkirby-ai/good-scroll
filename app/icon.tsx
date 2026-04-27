import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512
};

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
          background: '#0b1117',
          borderRadius: 116,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 42,
            borderRadius: 96,
            background: 'linear-gradient(180deg, #141c24 0%, #0e141b 100%)',
            border: '4px solid rgba(245, 244, 240, 0.08)'
          }}
        />
        <div
          style={{
            width: 220,
            height: 280,
            borderRadius: 40,
            background: '#101821',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 50px rgba(0,0,0,0.32)'
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
          <div
            style={{
              position: 'absolute',
              left: 36,
              right: 48,
              top: 76,
              height: 18,
              borderRadius: 999,
              background: '#8cf3c9'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 36,
              right: 86,
              top: 130,
              height: 18,
              borderRadius: 999,
              background: 'rgba(140, 243, 201, 0.92)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 36,
              right: 122,
              top: 184,
              height: 18,
              borderRadius: 999,
              background: 'rgba(140, 243, 201, 0.82)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 84,
              background: 'linear-gradient(90deg, #8cf3c9 0%, #4bc0a1 100%)',
              clipPath: 'polygon(0 18%, 34% 0, 58% 8%, 100% 30%, 100% 100%, 0 100%)'
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 88,
            right: 104,
            width: 62,
            height: 62,
            borderRadius: 999,
            background: '#8cf3c9',
            color: '#0b1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            fontWeight: 700,
            boxShadow: '0 0 32px rgba(140,243,201,0.35)'
          }}
        >
          +
        </div>
      </div>
    ),
    size
  );
}
