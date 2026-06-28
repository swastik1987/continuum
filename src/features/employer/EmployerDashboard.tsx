import { useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  LifeBuoy,
  CalendarRange,
  ChevronDown,
  Users,
  CircleCheckBig,
  GitMerge,
  CalendarCheck,
  ShieldHalf,
  Activity,
  TrendingUp,
  ArrowUpRight,
  UserRound,
  Info,
  ShieldCheck,
  Hand,
  HeartHandshake,
  FlaskConical,
  UserRoundCheck,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth/context'
import {
  getEmployerStats,
  EMPLOYER_BASELINE_RATE,
  type WeeklyRate,
} from '@/lib/api/employer-stats'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return 'EP'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'EP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatINR(amount: number): { main: string; unit: string } {
  if (amount >= 1_00_00_000) return { main: (amount / 1_00_00_000).toFixed(1), unit: 'Cr' }
  if (amount >= 1_00_000) return { main: (amount / 1_00_000).toFixed(1), unit: 'L' }
  if (amount >= 1_000) return { main: (amount / 1_000).toFixed(1), unit: 'K' }
  return { main: amount.toLocaleString('en-IN'), unit: '' }
}

function getOrgAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'O'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS = ['This quarter', 'Last 90 days', 'Year to date', 'Last 12 months']

const CARD: CSSProperties = {
  background: '#fff',
  border: '1px solid #E7E5E0',
  borderRadius: 16,
  padding: 22,
  boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 14px 34px -26px rgba(19,35,58,.22)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContinuumLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="17" stroke="#E2EFEC" strokeWidth="5" />
      <circle
        cx="22" cy="22" r="17"
        stroke="#0E8C7F" strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="80 107"
        transform="rotate(-90 22 22)"
      />
    </svg>
  )
}

function DateRangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          background: '#fff',
          color: '#13233A',
          border: '1px solid #D9D6CF',
          borderRadius: 11,
          padding: '0 16px',
          minHeight: 52,
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <CalendarRange size={16} color="#0E8C7F" />
        <span style={{ lineHeight: 1.15, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 10.5, color: '#8794A5', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Date range
          </span>
          {value}
        </span>
        <ChevronDown size={15} color="#A2AAB4" style={{ marginLeft: 2 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 4px)',
            background: '#fff', border: '1px solid #D9D6CF', borderRadius: 11,
            boxShadow: '0 8px 24px -8px rgba(19,35,58,.2)',
            zIndex: 50, minWidth: 180, overflow: 'hidden',
          }}>
            {DATE_RANGE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', fontSize: 13.5,
                  fontWeight: opt === value ? 600 : 500,
                  color: opt === value ? '#0E8C7F' : '#13233A',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface KPITileProps {
  icon: ReactNode
  label: string
  value: string
  badge: { icon: ReactNode; text: string; bg: string; color: string }
  subtext: string
}

function KPITile({ icon, label, value, badge, subtext }: KPITileProps) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8794A5', fontSize: 12.5, fontWeight: 600 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 14, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: badge.bg, color: badge.color, fontSize: 12.5, fontWeight: 600 }}>
          {badge.icon} {badge.text}
        </span>
        <span style={{ fontSize: 12.5, color: '#8794A5' }}>{subtext}</span>
      </div>
    </div>
  )
}

// Recharts custom tick components (must be React components, not render functions)
function XTick(props: Record<string, unknown>) {
  const x = props.x as number | undefined
  const y = props.y as number | undefined
  const payload = props.payload as { value?: string } | undefined
  if (!payload?.value) return <g />
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fill="#8794A5" fontSize={9.5} fontFamily="'JetBrains Mono', monospace">
      {payload.value}
    </text>
  )
}

function YTick(props: Record<string, unknown>) {
  const x = props.x as number | undefined
  const y = props.y as number | undefined
  const payload = props.payload as { value?: number } | undefined
  return (
    <text x={(x ?? 0) - 4} y={(y ?? 0) + 4} textAnchor="end" fill="#B7BFC9" fontSize={9.5} fontFamily="'JetBrains Mono', monospace">
      {payload?.value}%
    </text>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EmployerDashboard() {
  const { profile } = useAuth()
  const [dateRange, setDateRange] = useState('This quarter')

  // Resolve org ID: prefer profile.org_id, fall back to first org (for admin viewAs)
  const { data: orgId } = useQuery({
    queryKey: ['employer:orgId', profile?.id, profile?.org_id],
    queryFn: async () => {
      if (profile?.org_id) return profile.org_id
      const { data } = await supabase
        .from('organizations')
        .select('id')
        .order('name')
        .limit(1)
        .single()
      return data?.id ?? null
    },
    enabled: !!profile,
    staleTime: Infinity,
  })

  const { data: stats } = useQuery({
    queryKey: ['employer:stats', orgId],
    queryFn: () => getEmployerStats(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  // Derived display values
  const initials = getInitials(profile?.full_name)
  const displayName = profile?.full_name ?? 'Employer'
  const orgName = stats?.orgName ?? '—'
  const orgAbbr = getOrgAbbr(orgName === '—' ? 'Organisation' : orgName)
  const contractLives = stats?.contractLives ?? 0

  const completionPct = Math.round((stats?.completionRate ?? 0) * 100)
  const baselinePct = Math.round(EMPLOYER_BASELINE_RATE * 100)
  const ptsDelta = completionPct - baselinePct

  const engagementPct = Math.round((stats?.activeEngagementPct ?? 0) * 100)
  const engagementDelta = engagementPct - baselinePct

  const claims = formatINR(stats?.claimsAvoided.estimatedClaimsAvoided ?? 0)
  const suppressedCount = stats?.suppressedNudgeCount ?? 0
  const weeklyRates: WeeklyRate[] = stats?.weeklyRates ?? []

  const rateVals = weeklyRates.map(r => r.rate)
  const yMin = rateVals.length > 0
    ? Math.floor((Math.min(...rateVals, baselinePct) - 4) / 10) * 10
    : 48
  const yMax = rateVals.length > 0
    ? Math.ceil((Math.max(...rateVals, baselinePct) + 8) / 10) * 10
    : 85
  const yTicks = [50, 60, 70, 80].filter(t => t >= yMin && t <= yMax)

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', fontFamily: "'Inter', system-ui, sans-serif", color: '#13233A' }}>

      {/* ===== TOP BAR ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #ECEAE5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <ContinuumLogo />
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>Continuum</div>
          <span style={{ display: 'inline-block', width: 1, height: 18, background: '#E4E1DA', margin: '0 4px' }} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: '#8794A5', textTransform: 'uppercase' }}>
            Employer Portal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#5A6B80', fontWeight: 500, cursor: 'pointer' }}>
            <LifeBuoy size={16} color="#A2AAB4" /> Talk to your account team
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 18, borderLeft: '1px solid #ECEAE5' }}>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: '#13233A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#8794A5' }}>VP, Total Rewards</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HEADER BAND ===== */}
      <div style={{ padding: '30px 32px 26px', background: '#fff', borderBottom: '1px solid #ECEAE5' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#13233A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0 }}>
                {orgAbbr}
              </div>
              <h1 style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>
                {orgName} — Care Continuity
              </h1>
            </div>
            <div style={{ fontSize: 14, color: '#5A6B80', marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
              Is your benefits spend producing real health engagement — and avoided downstream claims? This is where the loop closes.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 14, flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: '4px 4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {contractLives ? contractLives.toLocaleString('en-IN') : '—'}
                </span>
                <span style={{ fontSize: 13, color: '#8794A5', fontWeight: 500 }}>lives</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#8794A5', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Users size={13} color="#A2AAB4" /> covered · all sites
              </div>
            </div>
            <div style={{ width: 1, background: '#ECEAE5' }} />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ padding: '24px 32px 28px' }}>

        {/* KPI ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>

          <KPITile
            icon={<CircleCheckBig size={16} />}
            label="Follow-up completion"
            value={`${completionPct}%`}
            badge={{ icon: <TrendingUp size={14} />, text: `+${ptsDelta} pts`, bg: '#E6F4EC', color: '#167A41' }}
            subtext={`up from ${baselinePct}%`}
          />

          <KPITile
            icon={<GitMerge size={16} />}
            label="Care gaps closed"
            value={(stats?.careGapsClosed ?? 0).toLocaleString('en-IN')}
            badge={{ icon: <CalendarCheck size={14} />, text: 'this quarter', bg: '#EDF4F3', color: '#0B6F64' }}
            subtext="loops resolved"
          />

          {/* Claims avoided — custom layout for the "illustrative model" tag */}
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8794A5', fontSize: 12.5, fontWeight: 600 }}>
                <ShieldHalf size={16} /> Est. claims avoided
              </div>
              <span
                title={stats?.claimsAvoided.assumptions.disclaimer}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: '#F4F2EE', border: '1px solid #E4E1DA', color: '#6B6256', fontSize: 10.5, fontWeight: 600, cursor: 'help' }}
              >
                illustrative model
              </span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 14, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              ₹{claims.main}
              {claims.unit && (
                <span style={{ fontSize: 22, color: '#5A6B80', fontWeight: 600, marginLeft: 4 }}>{claims.unit}</span>
              )}
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#8794A5', lineHeight: 1.4 }}>
              Projected from gaps closed &amp; avoided escalations
            </div>
          </div>

          <KPITile
            icon={<Activity size={16} />}
            label="Active engagement"
            value={`${engagementPct}%`}
            badge={{
              icon: <TrendingUp size={14} />,
              text: engagementDelta >= 0 ? `+${engagementDelta} pts` : `${engagementDelta} pts`,
              bg: engagementDelta >= 0 ? '#E6F4EC' : '#FEF3F2',
              color: engagementDelta >= 0 ? '#167A41' : '#B91C1C',
            }}
            subtext="of members"
          />
        </div>

        {/* CHART ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginTop: 18 }}>

          {/* Area chart — completion over time */}
          <div style={{ ...CARD, padding: '22px 24px 18px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                  Follow-up completion over time
                </h2>
                <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 4 }}>
                  Weekly completion rate vs. pre-Continuum baseline · {dateRange}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#0B6F64', fontWeight: 600 }}>
                  <span style={{ width: 14, height: 3, borderRadius: 9, background: '#0E8C7F', display: 'inline-block' }} />
                  Completion
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#8794A5', fontWeight: 600 }}>
                  <span style={{ width: 14, display: 'inline-block', borderTop: '2px dashed #B7BFC9' }} />
                  Baseline {baselinePct}%
                </span>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={weeklyRates} margin={{ top: 8, right: 8, bottom: 12, left: 8 }}>
                  <defs>
                    <linearGradient id="empAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0E8C7F" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0E8C7F" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={true} vertical={false} stroke="#F0EEEA" strokeWidth={1} />
                  <XAxis
                    dataKey="month"
                    interval={0}
                    tick={<XTick />}
                    axisLine={false}
                    tickLine={false}
                    height={20}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    ticks={yTicks}
                    tick={<YTick />}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <ReferenceLine
                    y={baselinePct}
                    stroke="#B7BFC9"
                    strokeDasharray="5 4"
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, 'Completion']}
                    labelFormatter={(label: unknown) => String(label)}
                    contentStyle={{ background: '#13233A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 12px' }}
                    itemStyle={{ color: '#7FD6CA' }}
                    labelStyle={{ color: '#A8B6C8', fontSize: 11, marginBottom: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    fill="url(#empAreaGrad)"
                    stroke="#0E8C7F"
                    strokeWidth={2.5}
                    activeDot={{ r: 4, fill: '#0E8C7F', stroke: '#fff', strokeWidth: 2 }}
                    dot={(props: Record<string, unknown>) => {
                      const cx = props.cx as number
                      const cy = props.cy as number
                      const index = props.index as number
                      if (index === 0) return <circle key="s" cx={cx} cy={cy} r={3.5} fill="#fff" stroke="#B7BFC9" strokeWidth={2} />
                      if (index === weeklyRates.length - 1) return <circle key="e" cx={cx} cy={cy} r={5} fill="#fff" stroke="#0E8C7F" strokeWidth={2.5} />
                      return <g key={`n${index}`} />
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, padding: '10px 13px', borderRadius: 10, background: '#EDF4F3', border: '1px solid #CFE6E1' }}>
              <ArrowUpRight size={16} color="#0B6F64" />
              <span style={{ fontSize: 12.5, color: '#13233A', lineHeight: 1.4 }}>
                <b style={{ fontWeight: 600 }}>+{ptsDelta} points</b> above baseline — the gap is the value Continuum is adding over do-nothing reminders.
              </span>
            </div>
          </div>

          {/* Segment bars */}
          <div style={{ ...CARD, padding: '22px 24px 18px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
              Completion by behaviour segment
            </h2>
            <div style={{ fontSize: 12.5, color: '#8794A5', marginTop: 4 }}>
              Who responds to a nudge — and who needs a human navigator.
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {stats?.bySegment.map(seg => {
                const pct = Math.round(seg.rate * 100)
                const hasData = seg.total > 0
                return (
                  <div key={seg.key}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600 }}>
                        {seg.label}
                        {seg.navigatorRequired && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px', borderRadius: 5,
                            background: seg.barColor === '#D24B47' ? '#FAE8E7' : '#FBEFDD',
                            color: seg.barColor === '#D24B47' ? '#A8332F' : '#A6620F',
                            fontSize: 10, fontWeight: 600,
                          }}>
                            <UserRound size={11} /> navigator
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: hasData ? seg.valueColor : '#B7BFC9' }}>
                        {hasData ? `${pct}%` : '—'}
                      </span>
                    </div>
                    <div style={{ height: 11, borderRadius: 9, background: '#F1EFEB', overflow: 'hidden' }}>
                      <div style={{ width: `${hasData ? pct : 0}%`, height: '100%', borderRadius: 9, background: seg.barColor, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid #F0EEEA', fontSize: 11.5, color: '#8794A5', lineHeight: 1.45 }}>
              <Info size={14} color="#A2AAB4" style={{ flexShrink: 0 }} />
              Low-response segments are routed to human care — <b style={{ color: '#5A6B80', fontWeight: 600 }}>not</b> nudged harder.
            </div>
          </div>
        </div>

        {/* TRUST PANEL */}
        <div style={{ marginTop: 18, background: '#13233A', borderRadius: 18, padding: '30px 34px', boxShadow: '0 24px 60px -34px rgba(19,35,58,.7)', position: 'relative', overflow: 'hidden' }}>
          {/* Shield watermark */}
          <svg width="260" height="260" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', right: -30, top: -46, opacity: 0.05 }} stroke="#fff" strokeWidth="1">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40, position: 'relative' }}>

            {/* Left: statement */}
            <div style={{ maxWidth: 380, flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(14,140,127,.18)', border: '1px solid rgba(82,196,182,.4)', color: '#7FD6CA', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <ShieldCheck size={14} /> Recommendation integrity
              </div>
              <h2 style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: '#fff', margin: '18px 0 0', lineHeight: 1.25 }}>
                We earn trust by not<br />spamming your people.
              </h2>
              <p style={{ fontSize: 13.5, color: '#A8B6C8', lineHeight: 1.6, margin: '14px 0 0' }}>
                Every message is a clinician's decision — never a growth tactic. When contact would do more harm than good, we hold back and send a human instead.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, padding: '9px 14px', borderRadius: 11, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
                <UserRoundCheck size={16} color="#7FD6CA" />
                <span style={{ fontSize: 12.5, color: '#D7DFE9', fontWeight: 500 }}>Member opt-out rate</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums', marginLeft: 2 }}>1.2%</span>
              </div>
            </div>

            {/* Right: 3 proof stats */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* 100% traceable — spans full width */}
              <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(14,140,127,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={26} color="#7FD6CA" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 34, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>100%</span>
                    <span style={{ fontSize: 13.5, color: '#7FD6CA', fontWeight: 600 }}>fully traceable</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#C3CDDA', marginTop: 8, lineHeight: 1.45 }}>
                    of nudges trace to a <b style={{ color: '#fff', fontWeight: 600 }}>clinician-authored care plan</b> — zero auto-generated outreach.
                  </div>
                </div>
              </div>

              {/* Suppressed nudges */}
              <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A8B6C8', fontSize: 12, fontWeight: 600 }}>
                  <Hand size={15} color="#7FD6CA" /> Low-value nudges suppressed
                </div>
                <div style={{ fontSize: 30, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginTop: 12, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {suppressedCount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 12, color: '#8FA0B4', marginTop: 9, lineHeight: 1.45 }}>
                  Members facing cost or anxiety barriers — routed to a navigator, not messaged.
                </div>
              </div>

              {/* Redirected to human */}
              <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A8B6C8', fontSize: 12, fontWeight: 600 }}>
                  <HeartHandshake size={15} color="#7FD6CA" /> Redirected to human care
                </div>
                <div style={{ fontSize: 30, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginTop: 12, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  100%
                </div>
                <div style={{ fontSize: 12, color: '#8FA0B4', marginTop: 9, lineHeight: 1.45 }}>
                  of suppressed cases got a personal follow-up instead of silence.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A2AAB4' }}>
            <FlaskConical size={13} />
            Figures shown are illustrative prototype data — claims-cost avoidance is a modelled estimate, not billed amounts.
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#B7BFC9' }}>
            CONTINUUM · EMPLOYER PORTAL · v1.0
          </div>
        </div>

      </div>
    </div>
  )
}
