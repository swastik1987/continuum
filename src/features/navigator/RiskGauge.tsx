type RiskTier = 'low' | 'medium' | 'high'

const TIER_COLOR: Record<RiskTier, string> = {
  high: '#D24B47',
  medium: '#D9821B',
  low: '#1F9D55',
}

const TIER_LABEL: Record<RiskTier, string> = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
}

const TIER_BG: Record<RiskTier, string> = {
  high: '#FAE8E7',
  medium: '#FBEFDD',
  low: '#E6F4EC',
}

const TIER_TEXT: Record<RiskTier, string> = {
  high: '#A8332F',
  medium: '#A6620F',
  low: '#167A41',
}

const TIER_DOT: Record<RiskTier, string> = {
  high: '#D24B47',
  medium: '#D9821B',
  low: '#1F9D55',
}

const CIRCUMFERENCE = 301.6 // 2π × 48

export function RiskGauge({
  score,
  tier,
  trend,
}: {
  score: number
  tier: RiskTier
  trend?: number | null
}) {
  const dashoffset = CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, score)) / 100)
  const color = TIER_COLOR[tier]

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECEAE5',
        borderRadius: '16px',
        padding: '22px 22px 20px',
        boxShadow: '0 1px 2px rgba(19,35,58,.04)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#8794A5',
          marginBottom: '14px',
        }}
      >
        Risk score
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <svg
          width="116"
          height="116"
          viewBox="0 0 116 116"
          style={{ flexShrink: 0 }}
          aria-label={`Risk score ${score} out of 100`}
        >
          <circle cx="58" cy="58" r="48" fill="none" stroke="#F1EFEB" strokeWidth="11" />
          <circle
            cx="58"
            cy="58"
            r="48"
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 58 58)"
          />
          <text
            x="58"
            y="55"
            textAnchor="middle"
            fontFamily="Inter"
            fontSize="30"
            fontWeight="600"
            fill="#13233A"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {score}
          </text>
          <text
            x="58"
            y="73"
            textAnchor="middle"
            fontFamily="Inter"
            fontSize="11"
            fontWeight="500"
            fill="#8794A5"
          >
            / 100
          </text>
        </svg>

        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 11px',
              borderRadius: '999px',
              background: TIER_BG[tier],
              color: TIER_TEXT[tier],
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '99px',
                background: TIER_DOT[tier],
              }}
            />
            {TIER_LABEL[tier]}
          </span>

          {trend != null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                color: trend > 0 ? '#A8332F' : '#167A41',
                fontWeight: 600,
                marginTop: '12px',
              }}
            >
              {trend > 0 ? '↑' : '↓'} {trend > 0 ? '+' : ''}{trend} in 30 days
            </div>
          )}

          <div
            style={{
              fontSize: '12px',
              color: '#8794A5',
              marginTop: trend != null ? '6px' : '12px',
              lineHeight: 1.4,
            }}
          >
            Predicted gap-in-care
            <br />
            within 60 days
          </div>
        </div>
      </div>
    </div>
  )
}
