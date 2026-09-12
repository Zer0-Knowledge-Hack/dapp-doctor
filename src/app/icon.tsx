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
          background: '#fff1ee',
        }}
      >
        <div style={{ display: 'flex', width: 280, height: 280, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 100, top: 0, width: 80, height: 280, background: '#000000' }} />
          <div style={{ position: 'absolute', left: 0, top: 100, width: 280, height: 80, background: '#000000' }} />
        </div>
      </div>
    ),
    size,
  );
}
