import { useState, useRef, useEffect, useCallback } from 'react'
import type { ComponentType } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  GitMerge, Play, ChevronsRight, PlayCircle, Pause, RotateCcw,
  BellRing, CircleCheckBig, Route, TrendingUp, GitCommitHorizontal,
  CheckCheck, User, Compass, Stethoscope, Building2, Activity,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { getSimState } from '@/lib/api/sim-state'
import type { Enums } from '@/lib/database.types'

// ── Types ─────────────────────────────────────────────────────────────────────
type FeedKind = 'nudge' | 'closed' | 'routed' | 'high' | 'er' | 'summary'

interface FeedEntry {
  id: number
  kind: FeedKind
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>
  text: string
  dateLabel: string
  color: { bg: string; bd: string; fg: string }
}

interface DayActivity {
  date: string
  dateLabel: string
  nudged: number
  suppressed: number
  closed: number
  routed: number
  er: number
  newHighRisk: number
}

interface AdvanceResult {
  ok: boolean
  current_day?: string
  counts?: { nudged: number; suppressed: number; closed: number; routed: number; tasks: number }
  days?: DayActivity[]
  error?: string
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  slate: { bg: '#EEF1F5', bd: '#DEE4EC', fg: '#475569' },
  green: { bg: '#E6F4EC', bd: '#D2EBDC', fg: '#167A41' },
  red:   { bg: '#FAE8E7', bd: '#F1CFCD', fg: '#A8332F' },
  amber: { bg: '#FBEFDD', bd: '#F0DDBE', fg: '#A6620F' },
  teal:  { bg: '#EDF4F3', bd: '#CFE6E1', fg: '#0B6F64' },
}

// ── Feed persistence ──────────────────────────────────────────────────────────
type StoredFeed = {
  events: Omit<FeedEntry, 'Icon'>[]
  nudged: number
  closed: number
  routed: number
  nextId: number
}

const ICON_BY_KIND: Record<FeedKind, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  nudge:   BellRing,
  closed:  CircleCheckBig,
  routed:  Route,
  er:      Activity,
  high:    TrendingUp,
  summary: CheckCheck,
}

const FEED_KEY = 'continuum.simFeed'

function loadSimFeed(): StoredFeed {
  try {
    const raw = localStorage.getItem(FEED_KEY)
    if (!raw) return { events: [], nudged: 0, closed: 0, routed: 0, nextId: 1 }
    return JSON.parse(raw) as StoredFeed
  } catch {
    return { events: [], nudged: 0, closed: 0, routed: 0, nextId: 1 }
  }
}

// ── Role switcher rows ────────────────────────────────────────────────────────
const SWITCH_ROLES: {
  label: string
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>
  role: Enums<'user_role'>
  home: string
}[] = [
  { label: 'Patient',   Icon: User,        role: 'patient',        home: '/patient'   },
  { label: 'Navigator', Icon: Compass,     role: 'navigator',      home: '/navigator' },
  { label: 'Clinician', Icon: Stethoscope, role: 'clinician',      home: '/clinician' },
  { label: 'Employer',  Icon: Building2,   role: 'employer_admin', home: '/employer'  },
]

// ── Date helpers ──────────────────────────────────────────────────────────────
const BASE_MS = Date.UTC(2026, 5, 14) // 14 Jun 2026 — matches seed BASE_DATE
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

function toDayNum(dateStr: string): number {
  return Math.max(1, Math.floor((Date.parse(dateStr + 'T00:00:00Z') - BASE_MS) / 86400000) + 1)
}

function fmtTimestamp(): string {
  const n = new Date()
  let h = n.getHours()
  const m = String(n.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ap}`
}

// ── Build feed entries for one day's activity ─────────────────────────────────
function buildEntries(day: DayActivity, isSummary: boolean, getId: () => number): FeedEntry[] {
  const out: FeedEntry[] = []

  if (day.nudged > 0 || day.suppressed > 0) {
    const parts = [`${day.nudged} reminder${day.nudged !== 1 ? 's' : ''} sent`]
    if (day.suppressed > 0) parts.push(`${day.suppressed} suppressed`)
    out.push({ id: getId(), kind: 'nudge', Icon: BellRing,
      text: parts.join(' · '), dateLabel: day.dateLabel, color: C.slate })
  }

  if (day.closed > 0) {
    out.push({ id: getId(), kind: 'closed', Icon: CircleCheckBig,
      text: `${day.closed} test${day.closed !== 1 ? 's' : ''} completed → actions auto-closed`,
      dateLabel: day.dateLabel, color: C.green })
  }

  if (day.routed > 0) {
    out.push({ id: getId(), kind: 'routed', Icon: Route,
      text: `${day.routed} member${day.routed !== 1 ? 's' : ''} declined → routed to navigator`,
      dateLabel: day.dateLabel, color: C.red })
  }

  if (day.er > 0) {
    out.push({ id: getId(), kind: 'er', Icon: Activity,
      text: `${day.er} ER follow-up task${day.er !== 1 ? 's' : ''} created`,
      dateLabel: day.dateLabel, color: C.red })
  }

  if (day.newHighRisk > 0) {
    out.push({ id: getId(), kind: 'high', Icon: TrendingUp,
      text: `Risk recomputed: ${day.newHighRisk} member${day.newHighRisk !== 1 ? 's' : ''} → High`,
      dateLabel: day.dateLabel, color: C.amber })
  }

  if (isSummary && day.closed > 0) {
    out.push({ id: getId(), kind: 'summary', Icon: CheckCheck,
      text: `Week closed · ${day.closed} action${day.closed !== 1 ? 's' : ''} auto-resolved`,
      dateLabel: day.dateLabel, color: C.teal })
  }

  return out
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DemoSimulation() {
  const { effectiveRole, setViewAs } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentDay,  setCurrentDay]  = useState('2026-06-14')
  const [timestamp,   setTimestamp]   = useState(fmtTimestamp)
  const [simReady,    setSimReady]    = useState(false)
  const [feedInit]                    = useState(loadSimFeed)
  const [events,      setEvents]      = useState<FeedEntry[]>(
    () => feedInit.events.map(e => ({ ...e, Icon: ICON_BY_KIND[e.kind] }))
  )
  const [nudged,      setNudged]      = useState(feedInit.nudged)
  const [closed,      setClosed]      = useState(feedInit.closed)
  const [routed,      setRouted]      = useState(feedInit.routed)
  const [loading,     setLoading]     = useState(false)
  const [playing,     setPlaying]     = useState(false)

  const sessionStartedAt = useRef<string | null>(null)
  const pendingAdvance   = useRef(false)
  const playInterval     = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextEventId      = useRef(feedInit.nextId)

  // Load initial sim day from DB
  useEffect(() => {
    getSimState().then((s) => {
      if (s?.current_day) setCurrentDay(s.current_day)
      setSimReady(true)
    })
  }, [])

  // Refresh timestamp every minute
  useEffect(() => {
    const tid = setInterval(() => setTimestamp(fmtTimestamp()), 60_000)
    return () => clearInterval(tid)
  }, [])

  // Cleanup auto-play on unmount
  useEffect(() => {
    return () => { if (playInterval.current) clearInterval(playInterval.current) }
  }, [])

  // Persist feed across navigation — restore when admin returns to this page
  useEffect(() => {
    const stored: StoredFeed = {
      events: events.map(({ Icon: _icon, ...rest }) => rest),
      nudged,
      closed,
      routed,
      nextId: nextEventId.current,
    }
    localStorage.setItem(FEED_KEY, JSON.stringify(stored))
  }, [events, nudged, closed, routed])

  const advance = useCallback(async (days: number) => {
    if (pendingAdvance.current) return
    pendingAdvance.current = true

    if (!sessionStartedAt.current) sessionStartedAt.current = new Date().toISOString()

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke<AdvanceResult>('advance-simulation', {
        body: { days, sessionStartedAt: sessionStartedAt.current },
      })

      if (error || !data?.ok) {
        console.error('advance-simulation failed:', error ?? data?.error)
        return
      }

      if (data.current_day) setCurrentDay(data.current_day)
      setTimestamp(fmtTimestamp())

      // Build feed entries newest-first; 7-day run gets a summary on the last day
      const daysList = data.days ?? []
      const isSummaryRun = days >= 7
      const getId = () => nextEventId.current++
      const newEntries: FeedEntry[] = []

      daysList.forEach((day, idx) => {
        const isSummaryDay = isSummaryRun && idx === daysList.length - 1
        buildEntries(day, isSummaryDay, getId).forEach((e) => newEntries.unshift(e))
      })

      setEvents((prev) => [...newEntries, ...prev].slice(0, 40))

      const c = data.counts
      if (c) {
        setNudged((n) => n + c.nudged)
        setClosed((n) => n + c.closed)
        setRouted((n) => n + c.routed)
      }

      // Invalidate shared queries so other open views refresh
      queryClient.invalidateQueries({ queryKey: ['sim-state'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['navigator-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['care-plan-actions'] })
      queryClient.invalidateQueries({ queryKey: ['employer:stats'] })
    } finally {
      setLoading(false)
      pendingAdvance.current = false
    }
  }, [queryClient])

  // Stable ref so the setInterval always calls the latest advance
  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const togglePlay = useCallback(() => {
    if (playing) {
      if (playInterval.current) { clearInterval(playInterval.current); playInterval.current = null }
      setPlaying(false)
    } else {
      setPlaying(true)
      playInterval.current = setInterval(() => advanceRef.current(1), 1600)
    }
  }, [playing])

  const reset = useCallback(async () => {
    if (playInterval.current) { clearInterval(playInterval.current); playInterval.current = null }
    setPlaying(false)
    setLoading(true)

    try {
      await supabase.functions.invoke('advance-simulation', {
        body: { reset: true, sessionStartedAt: sessionStartedAt.current },
      })
    } finally {
      sessionStartedAt.current = null
      nextEventId.current = 1
      localStorage.removeItem(FEED_KEY)
      setCurrentDay('2026-06-14')
      setEvents([])
      setNudged(0)
      setClosed(0)
      setRouted(0)
      setTimestamp(fmtTimestamp())
      setLoading(false)
      queryClient.invalidateQueries({ queryKey: ['sim-state'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['navigator-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['care-plan-actions'] })
      queryClient.invalidateQueries({ queryKey: ['employer:stats'] })
    }
  }, [queryClient])

  const switchRole = useCallback((role: Enums<'user_role'>, home: string) => {
    setViewAs(role)
    navigate({ to: home })
  }, [setViewAs, navigate])

  const dayNum     = toDayNum(currentDay)
  const dateLabel  = simReady ? fmtDate(currentDay) : '—'
  const showTotals = nudged > 0 || closed > 0 || routed > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F6F3',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#13233A',
      WebkitFontSmoothing: 'antialiased',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes feedIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(31,157,85,.5); }
          70%  { box-shadow: 0 0 0 6px rgba(31,157,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(31,157,85,0); }
        }
        @keyframes dayPop {
          0%   { transform: scale(.92); }
          55%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .sim-scroll::-webkit-scrollbar { width: 7px; }
        .sim-scroll::-webkit-scrollbar-thumb { background: #DAD7D0; border-radius: 99px; }
        .sim-scroll::-webkit-scrollbar-track { background: transparent; }
        .sim-adv1:hover:not(:disabled) { background: #0B6F64 !important; }
        .sim-adv1:active:not(:disabled) { transform: scale(.97) !important; }
        .sim-adv7:hover:not(:disabled) { background: #F2F8F7 !important; }
        .sim-adv7:active:not(:disabled) { transform: scale(.97) !important; }
        .sim-reset:hover:not(:disabled) { background: #F4F2EE !important; color: #13233A !important; }
      `}</style>

      <div style={{
        width: '460px',
        background: '#FFFFFF',
        border: '1px solid #EDEBE6',
        borderRadius: '20px',
        boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 24px 60px -28px rgba(19,35,58,.28)',
        overflow: 'hidden',
      }}>

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '22px 24px 18px', borderBottom: '1px solid #F0EEEA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px',
              background: '#13233A', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GitMerge size={21} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.1 }}>
                Demo Simulation
              </div>
              <div style={{ fontSize: '12.5px', color: '#8794A5', marginTop: '3px' }}>
                Watch the closed loop run
              </div>
            </div>
          </div>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#167A41', background: '#E6F4EC', border: '1px solid #D2EBDC',
            padding: '5px 10px 5px 8px', borderRadius: '999px', flexShrink: 0,
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '99px', background: '#1F9D55',
              animation: 'livePulse 1.8s infinite',
            }} />
            Live
          </span>
        </div>

        {/* ── DAY + ADVANCE ─────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '10.5px', fontWeight: 500,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8794A5',
              }}>
                Current day
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '11px', marginTop: '7px' }}>
                {/* key triggers dayPop animation each time the date changes */}
                <div key={dateLabel} style={{
                  fontSize: '38px', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums', animation: 'dayPop .35s ease',
                }}>
                  {dateLabel}
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 600, color: '#0B6F64',
                  background: '#EDF4F3', border: '1px solid #CFE6E1',
                  padding: '4px 10px', borderRadius: '999px', fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}>
                  Day {dayNum}
                </span>
              </div>
            </div>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
              color: '#B7BFC9', letterSpacing: '0.04em',
            }}>
              {timestamp}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="sim-adv1"
              onClick={() => advance(1)}
              disabled={loading}
              style={{
                flex: 1, fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                background: loading ? '#7FBFBA' : '#0E8C7F',
                color: '#fff', border: 'none', borderRadius: '11px',
                padding: '13px 16px', fontSize: '14.5px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(14,140,127,.3)',
                transition: 'transform .08s, background .15s',
              }}
            >
              {loading ? 'Running…' : 'Advance 1 day'}
              <Play size={16} strokeWidth={1.75} />
            </button>

            <button
              className="sim-adv7"
              onClick={() => advance(7)}
              disabled={loading}
              style={{
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#fff', color: '#0B6F64',
                border: '1px solid #BFDCD7', borderRadius: '11px',
                padding: '13px 16px', fontSize: '14.5px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                transition: 'transform .08s, background .15s',
              }}
            >
              +7 days
              <ChevronsRight size={17} strokeWidth={1.75} />
            </button>
          </div>

          {/* Running totals — visible after first advance */}
          {showTotals && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '9px', marginTop: '16px' }}>
              <div style={{ background: '#FAF9F6', border: '1px solid #EDEBE6', borderRadius: '12px', padding: '12px 13px' }}>
                <div style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {nudged}
                </div>
                <div style={{ fontSize: '11px', color: '#8794A5', marginTop: '2px', lineHeight: 1.3 }}>Members nudged</div>
              </div>
              <div style={{ background: '#FAF9F6', border: '1px solid #EDEBE6', borderRadius: '12px', padding: '12px 13px' }}>
                <div style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: '#167A41' }}>
                  {closed}
                </div>
                <div style={{ fontSize: '11px', color: '#8794A5', marginTop: '2px', lineHeight: 1.3 }}>Actions auto-closed</div>
              </div>
              <div style={{ background: '#FAF9F6', border: '1px solid #EDEBE6', borderRadius: '12px', padding: '12px 13px' }}>
                <div style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: '#A8332F' }}>
                  {routed}
                </div>
                <div style={{ fontSize: '11px', color: '#8794A5', marginTop: '2px', lineHeight: 1.3 }}>Routed to navigator</div>
              </div>
            </div>
          )}
        </div>

        {/* ── LIVE FEED ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '2px 24px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '10.5px', fontWeight: 500,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8794A5',
            }}>
              Live activity
            </div>
            <span style={{ fontSize: '11px', color: '#B7BFC9', fontVariantNumeric: 'tabular-nums' }}>
              {events.length} events
            </span>
          </div>

          <div
            className="sim-scroll"
            style={{ maxHeight: '212px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}
          >
            {events.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '34px 20px', textAlign: 'center',
                border: '1px dashed #E2E0DA', borderRadius: '13px',
              }}>
                <GitCommitHorizontal size={22} strokeWidth={1.75} color="#A6AEB9" />
                <div style={{ fontSize: '13px', color: '#8794A5', maxWidth: '230px', lineHeight: 1.5 }}>
                  Press <strong style={{ color: '#0B6F64' }}>Advance 1 day</strong> to run the loop and watch actions resolve.
                </div>
              </div>
            ) : (
              events.map((ev) => {
                const Icon = ev.Icon
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '11px',
                      padding: '11px 12px',
                      background: '#fff', border: '1px solid #EFEDE8', borderRadius: '11px',
                      boxShadow: '0 1px 2px rgba(19,35,58,.03)',
                      animation: 'feedIn .32s cubic-bezier(.2,.8,.2,1)',
                    }}
                  >
                    <div style={{
                      flexShrink: 0, width: '30px', height: '30px', borderRadius: '9px',
                      background: ev.color.bg, border: `1px solid ${ev.color.bd}`, color: ev.color.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.4, color: '#26384F' }}>
                        {ev.text}
                      </div>
                    </div>
                    <span style={{
                      flexShrink: 0,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px', color: '#A6AEB9',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}>
                      {ev.dateLabel}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── CONTROLS ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', marginTop: '8px', borderTop: '1px solid #F0EEEA',
        }}>
          <button
            onClick={togglePlay}
            disabled={loading}
            style={{
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              border: `1px solid ${playing ? '#BFDCD7' : '#E7E5E0'}`,
              background: playing ? '#EDF4F3' : '#fff',
              color: playing ? '#0B6F64' : '#5A6B80',
              borderRadius: '9px', padding: '9px 13px',
              fontSize: '13px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all .15s',
            }}
          >
            {playing
              ? <Pause size={16} strokeWidth={1.75} />
              : <PlayCircle size={16} strokeWidth={1.75} />}
            {playing ? 'Pause' : 'Auto-play'}
          </button>

          <button
            className="sim-reset"
            onClick={reset}
            disabled={loading}
            style={{
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'transparent', color: '#5A6B80', border: 'none',
              borderRadius: '9px', padding: '9px 12px',
              fontSize: '13px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background .15s, color .15s',
            }}
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Reset demo
          </button>
        </div>

        {/* ── ROLE SWITCHER ─────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 22px', background: '#FAF9F6', borderTop: '1px solid #F0EEEA' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '10.5px', fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8794A5',
            marginBottom: '11px',
          }}>
            View as
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            background: '#F1EFEB', border: '1px solid #E7E5E0',
            borderRadius: '12px', padding: '4px', gap: '3px',
          }}>
            {SWITCH_ROLES.map(({ label, Icon, role, home }) => {
              const isActive = effectiveRole === role
              return (
                <button
                  key={role}
                  onClick={() => switchRole(role, home)}
                  style={{
                    fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    padding: '9px 4px', borderRadius: '9px', transition: 'all .15s',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0B6F64' : '#5A6B80',
                    boxShadow: isActive ? '0 1px 3px rgba(19,35,58,.14)' : 'none',
                  }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
