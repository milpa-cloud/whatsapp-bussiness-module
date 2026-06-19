import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '20px' }}>
          <div style={{ width: '5px', height: '13px', background: '#059669', borderRadius: '2px' }} />
          <div style={{ width: '5px', height: '20px', background: '#059669', borderRadius: '2px' }} />
          <div style={{ width: '5px', height: '8px',  background: '#059669', borderRadius: '2px' }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
