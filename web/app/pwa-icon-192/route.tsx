import { ImageResponse } from 'next/og'

// A simple placeholder app icon (brand emerald + an "R" monogram) so the
// PWA is installable with something better than a broken image. Swap for
// a real designed logo later -- this is intentionally minimal.
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
          borderRadius: 40,
        }}
      >
        <div style={{ color: 'white', fontSize: 110, fontWeight: 700, fontFamily: 'sans-serif' }}>R</div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
