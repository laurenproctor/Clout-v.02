'use client'

const ROWS = [
  'Detecting signal velocity',
  'Mapping adjacent concepts',
  'Identifying whitespace',
  'Tracking competitor coverage',
  'Ranking asymmetric opportunities',
]

export function SignalFeedGenerating() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barSweep {
          from { width: 0%; }
          to   { width: 100%; }
        }
      ` }} />

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f8fb',
        padding: '24px 16px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '520px',
          textAlign: 'center',
        }}>
          {/* Top accent */}
          <div style={{
            width: '48px',
            height: '2px',
            backgroundColor: '#1a1560',
            margin: '0 auto 32px',
          }} />

          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 12px',
            lineHeight: '1.3',
          }}>
            Building your signal intelligence layer
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.65',
            margin: '0 auto 40px',
            maxWidth: '380px',
          }}>
            Clout is mapping emerging narratives, competitor gaps, and authority opportunities across your focus areas.
          </p>

          {/* Animated rows */}
          <div style={{
            textAlign: 'left',
            maxWidth: '320px',
            margin: '0 auto 32px',
          }}>
            {ROWS.map((row, i) => (
              <div
                key={row}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 0',
                  opacity: 0,
                  animation: 'fadeSlideIn 0.5s ease forwards',
                  animationDelay: `${i * 0.48}s`,
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#4f46e5',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '13px',
                  color: '#374151',
                  fontWeight: 500,
                }}>
                  {row}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{
            backgroundColor: '#e5e7eb',
            height: '2px',
            borderRadius: '1px',
            overflow: 'hidden',
            maxWidth: '320px',
            margin: '0 auto',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#1a1560',
              borderRadius: '1px',
              width: '0%',
              animation: 'barSweep 2.6s ease forwards',
            }} />
          </div>
        </div>
      </div>
    </>
  )
}
