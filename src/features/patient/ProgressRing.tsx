interface Props {
  completed: number
  total: number
  size?: number
}

export function ProgressRing({ completed, total, size = 92 }: Props) {
  const r = 39
  const circumference = 245 // ≈ 2π × 39
  const allDone = total > 0 && completed >= total
  const dashoffset = total > 0 ? circumference * (1 - completed / total) : circumference
  const strokeColor = allDone ? '#1F9D55' : '#0E8C7F'
  const numColor = allDone ? '#167A41' : '#13233A'

  return (
    <svg width={size} height={size} viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx="46" cy="46" r={r} fill="none" stroke="#EEF0EE" strokeWidth="9" />
      {/* Progress arc */}
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform="rotate(-90 46 46)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {/* Numerator / denominator */}
      <text
        x="46"
        y="42"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill={numColor}
      >
        {completed}/{total}
      </text>
      <text
        x="46"
        y="58"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="9.5"
        fontWeight="600"
        fill="#8794A5"
        letterSpacing="0.6"
      >
        STEPS
      </text>
    </svg>
  )
}
