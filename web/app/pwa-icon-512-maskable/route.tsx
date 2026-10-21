import { ImageResponse } from 'next/og'

// Maskable variant: full-bleed background (the OS applies its own circle/
// squircle mask), glyph kept well inside the ~80%-diameter safe zone so it
// doesn't get clipped.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#047857',
        }}
      >
        <div style={{ color: 'white', fontSize: 190, fontWeight: 700, fontFamily: 'sans-serif' }}>R</div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
