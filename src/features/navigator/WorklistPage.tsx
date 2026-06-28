import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  SlidersHorizontal,
  Search,
  Inbox,
  CircleCheckBig,
  AlertTriangle,
  Phone,
  MessageCircle,
  CircleSlash,
  Activity,
  RotateCcw,
  Clock,
  MapPin,
  X,
  ChevronDown,
} from 'lucide-react'
import { listNavigatorTasks, type NavigatorTaskWithMember } from '@/lib/api/navigator-tasks'
import { getAtRiskActionForMember, type ActionRow } from '@/lib/api/care-plans'
import { getSimDay } from '@/lib/api/sim-state'
import type { Enums } from '@/lib/database.types'

// ── Lookup tables ──────────────────────────────────────────────────────────

const TRIGGER_CFG: Record<
  Enums<'task_reason'>,
  { label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }>; color: string }
> = {
  post_er_72h:         { label: 'ER discharge — 72h follow-up', Icon: Activity,    color: '#D24B47' },
  declined_mandatory:  { label: 'Declined mandatory test',       Icon: CircleSlash, color: '#D24B47' },
  repeat_dropper:      { label: 'Repeat drop-off',               Icon: RotateCcw,  color: '#D9821B' },
  abnormal_result:     { label: 'Abnormal result',               Icon: Activity,    color: '#D9821B' },
  high_risk_overdue:   { label: 'High-risk overdue',             Icon: Clock,       color: '#D9821B' },
  structural_barrier:  { label: 'Structural barrier',            Icon: MapPin,      color: '#D9821B' },
}

const SEG_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  forgot:       { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Needs reminder' },
  cost:         { bg: '#FBEFDD', text: '#A6620F', dot: '#D9821B', label: 'Cost barrier' },
  feels_better: { bg: '#E6F4EC', text: '#167A41', dot: '#1F9D55', label: 'Feels better' },
  logistics:    { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Transport' },
  lost_thread:  { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Lost thread' },
  trust:        { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', label: 'Trust barrier' },
  avoidance:    { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', label: 'Avoidance' },
  none:         { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Unknown' },
}

const RISK_CFG: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FAE8E7', text: '#A8332F', label: 'High' },
  medium: { bg: '#FBEFDD', text: '#A6620F', label: 'Med' },
  low:    { bg: '#EEF1F5', text: '#475569', label: 'Low' },
}

const PRIO_CFG: Record<string, { bg: string; text: string }> = {
  p1: { bg: '#FAE8E7', text: '#A8332F' },
  p2: { bg: '#FBEFDD', text: '#A6620F' },
  p3: { bg: '#EEF1F5', text: '#475569' },
}

// ── Filter option constants ────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'p1', label: 'P1 — Urgent' },
  { value: 'p2', label: 'P2 — High' },
  { value: 'p3', label: 'P3 — Standard' },
]

const RISK_OPTIONS = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

const SEGMENT_OPTIONS = Object.entries(SEG_CFG)
  .filter(([k]) => k !== 'none')
  .map(([value, cfg]) => ({ value, label: cfg.label }))

const TRIGGER_OPTIONS = Object.entries(TRIGGER_CFG).map(([value, cfg]) => ({
  value: value as Enums<'task_reason'>,
  label: cfg.label,
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function calcAge(dob: string | null, today: Date): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function dueLabel(dueDate: string | null, today: Date): string {
  if (!dueDate) return '—'
  const due = new Date(dueDate)
  const diffDays = Math.round((today.getTime() - due.getTime()) / 86400000)
  if (diffDays > 0) return `Overdue ${diffDays}d`
  if (diffDays === 0) return 'Due today'
  return `Due in ${-diffDays}d`
}

function formatSimDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── FilterDropdown ─────────────────────────────────────────────────────────

function FilterDropdown({
  id,
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
}: {
  id: string
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string | null) => void
  isOpen: boolean
  onToggle: (id: string | null) => void
}) {
  if (value) {
    const activeLabel = options.find((o) => o.value === value)?.label ?? value
    return (
      <button
        onClick={() => onChange(null)}
        style={{
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: '#EDF4F3', border: '1px solid #BFDCD7',
          borderRadius: '10px', padding: '8px 13px',
          fontSize: '13px', fontWeight: 600, color: '#0B6F64', cursor: 'pointer',
        }}
      >
        {label}: {activeLabel}
        <X size={14} strokeWidth={1.75} />
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => onToggle(isOpen ? null : id)}
        style={{
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: '#fff', border: '1px solid #E4E2DD',
          borderRadius: '10px', padding: '8px 13px',
          fontSize: '13px', fontWeight: 600, color: '#13233A', cursor: 'pointer',
        }}
      >
        {label}
        <ChevronDown size={14} strokeWidth={1.75} style={{ color: '#8794A5' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            background: '#fff', border: '1px solid #E4E2DD',
            borderRadius: '12px', padding: '6px',
            boxShadow: '0 4px 16px rgba(19,35,58,.12)',
            minWidth: '175px',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); onToggle(null) }}
              style={{
                fontFamily: 'inherit',
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px', borderRadius: '8px',
                border: 'none', background: 'none',
                fontSize: '13px', color: '#3A4A5E', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F7F6F3' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

type RowData = {
  task: NavigatorTaskWithMember
  atRiskAction: ActionRow | null
}

export function WorklistPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<RowData[]>([])
  const [simDay, setSimDay] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<string | null>(null)
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null)
  const [triggerFilter, setTriggerFilter] = useState<Enums<'task_reason'> | null>(null)

  useEffect(() => {
    async function load() {
      const [tasks, day] = await Promise.all([
        listNavigatorTasks({ status: 'open' }),
        getSimDay(),
      ])
      setSimDay(day)

      const enriched = await Promise.all(
        tasks.map(async (task) => ({
          task,
          atRiskAction: task.member_id ? await getAtRiskActionForMember(task.member_id) : null,
        })),
      )
      setRows(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) => {
    if (priorityFilter && r.task.priority !== priorityFilter) return false
    if (riskFilter && (r.task.member?.risk_tier ?? 'low') !== riskFilter) return false
    if (segmentFilter && (r.task.member?.drop_segment ?? 'none') !== segmentFilter) return false
    if (triggerFilter && r.task.trigger_reason !== triggerFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.task.member?.full_name?.toLowerCase().includes(q) ?? false
    }
    return true
  })

  const openCount = rows.length
  const resolvedToday = 0
  const p1Count = rows.filter((r) => r.task.priority === 'p1').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Backdrop — closes all dropdowns on outside click */}
      {openDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* ── Top bar ── */}
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px', background: '#fff',
          borderBottom: '1px solid #ECEAE5', flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: '21px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Navigator Worklist
          </div>
          <div style={{ fontSize: '13px', color: '#8794A5', marginTop: '3px' }}>
            {formatSimDate(simDay)} · prioritised for you
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '13px', background: '#F7F6F3', border: '1px solid #ECEAE5' }}>
            <Inbox size={18} strokeWidth={1.75} style={{ color: '#5A6B80' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{openCount}</div>
              <div style={{ fontSize: '11px', color: '#8794A5', marginTop: '3px' }}>Open tasks</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '13px', background: '#F7F6F3', border: '1px solid #ECEAE5' }}>
            <CircleCheckBig size={18} strokeWidth={1.75} style={{ color: '#1F9D55' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{resolvedToday}</div>
              <div style={{ fontSize: '11px', color: '#8794A5', marginTop: '3px' }}>Resolved today</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderRadius: '13px', background: p1Count > 0 ? '#FAE8E7' : '#F7F6F3', border: `1px solid ${p1Count > 0 ? '#F1CFCD' : '#ECEAE5'}` }}>
            <AlertTriangle size={18} strokeWidth={1.75} style={{ color: p1Count > 0 ? '#D24B47' : '#5A6B80' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: p1Count > 0 ? '#A8332F' : '#13233A' }}>{p1Count}</div>
              <div style={{ fontSize: '11px', color: p1Count > 0 ? '#A8332F' : '#8794A5', marginTop: '3px' }}>P1 urgent</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 28px', flexShrink: 0,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, color: '#8794A5' }}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> Filter
        </span>

        <FilterDropdown
          id="priority" label="Priority"
          options={PRIORITY_OPTIONS} value={priorityFilter}
          onChange={setPriorityFilter}
          isOpen={openDropdown === 'priority'}
          onToggle={setOpenDropdown}
        />
        <FilterDropdown
          id="risk" label="Risk tier"
          options={RISK_OPTIONS} value={riskFilter}
          onChange={setRiskFilter}
          isOpen={openDropdown === 'risk'}
          onToggle={setOpenDropdown}
        />
        <FilterDropdown
          id="segment" label="Segment"
          options={SEGMENT_OPTIONS} value={segmentFilter}
          onChange={setSegmentFilter}
          isOpen={openDropdown === 'segment'}
          onToggle={setOpenDropdown}
        />
        <FilterDropdown
          id="trigger" label="Trigger"
          options={TRIGGER_OPTIONS} value={triggerFilter}
          onChange={(v) => setTriggerFilter(v as Enums<'task_reason'> | null)}
          isOpen={openDropdown === 'trigger'}
          onToggle={setOpenDropdown}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '12.5px', color: '#8794A5' }}>
            Sorted by <span style={{ color: '#13233A', fontWeight: 600 }}>priority</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #E4E2DD', borderRadius: '10px', padding: '8px 12px', width: '220px' }}>
            <Search size={15} strokeWidth={1.75} style={{ color: '#A2AAB4', flexShrink: 0 }} />
            <input
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#13233A', background: 'transparent', width: '100%', fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 28px 28px' }}>
        <div
          style={{
            background: '#fff', border: '1px solid #ECEAE5',
            borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 14px 34px -24px rgba(19,35,58,.18)',
            height: '100%', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Column header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '78px 184px 84px 142px 230px 1fr 158px',
              alignItems: 'center', gap: '14px', padding: '13px 20px',
              borderBottom: '1px solid #ECEAE5', background: '#FBFAF8',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
              color: '#8794A5', textTransform: 'uppercase', flexShrink: 0,
            }}
          >
            <div>Priority</div>
            <div>Patient</div>
            <div>Risk</div>
            <div>Segment</div>
            <div>Trigger</div>
            <div>Action at risk</div>
            <div />
          </div>

          {/* Rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ padding: '48px', textAlign: 'center', color: '#8794A5', fontSize: '14px' }}>
                Loading…
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: '#8794A5', fontSize: '14px' }}>
                No open tasks match this filter.
              </div>
            )}
            {!loading && filtered.map(({ task, atRiskAction }) => {
              const member = task.member
              const seg = SEG_CFG[member?.drop_segment ?? 'none'] ?? SEG_CFG.none
              const risk = RISK_CFG[member?.risk_tier ?? 'low'] ?? RISK_CFG.low
              const prio = PRIO_CFG[task.priority] ?? PRIO_CFG.p3
              const trig = TRIGGER_CFG[task.trigger_reason]
              const TrigIcon = trig?.Icon ?? Activity
              const age = calcAge(member?.dob ?? null, simDay)
              const isPrio1 = task.priority === 'p1'

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '78px 184px 84px 142px 230px 1fr 158px',
                    alignItems: 'center', gap: '14px', padding: '15px 20px',
                    borderBottom: '1px solid #F2F0EC',
                    borderLeft: `3px solid ${isPrio1 ? '#D24B47' : 'transparent'}`,
                    background: isPrio1 ? '#FDF6F5' : '#fff',
                  }}
                >
                  {/* Priority */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', padding: '4px 9px', borderRadius: '7px', background: prio.bg, color: prio.text, fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em' }}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>

                  {/* Patient */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member?.full_name ?? '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8794A5', marginTop: '2px' }}>
                      {[age, member?.gender].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  {/* Risk */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: risk.bg, color: risk.text, fontSize: '12px', fontWeight: 600 }}>
                      {risk.label}
                    </span>
                  </div>

                  {/* Segment */}
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px', borderRadius: '7px', background: seg.bg, color: seg.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: seg.dot, flexShrink: 0 }} />
                      {seg.label}
                    </span>
                  </div>

                  {/* Trigger */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 500, color: '#3A4A5E' }}>
                      {trig && <span style={{ color: trig.color, flexShrink: 0, display: 'inline-flex' }}><TrigIcon size={15} strokeWidth={1.75} /></span>}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {trig?.label ?? task.trigger_reason}
                      </span>
                    </div>
                    {task.notes && (
                      <div style={{ fontSize: '11.5px', color: '#A2AAB4', marginTop: '2px', paddingLeft: '22px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.notes}
                      </div>
                    )}
                  </div>

                  {/* Action at risk */}
                  <div style={{ minWidth: 0 }}>
                    {atRiskAction ? (
                      <>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {atRiskAction.title}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#A6620F', fontWeight: 600, marginTop: '3px' }}>
                          <Clock size={12} strokeWidth={1.75} />
                          {dueLabel(atRiskAction.due_date, simDay)}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#A2AAB4' }}>—</span>
                    )}
                  </div>

                  {/* CTAs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'flex-end' }}>
                    <button
                      title="Call"
                      style={{ fontFamily: 'inherit', width: '34px', height: '34px', borderRadius: '9px', background: '#fff', border: '1px solid #E4E2DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Phone size={16} strokeWidth={1.75} style={{ color: '#0B6F64' }} />
                    </button>
                    <button
                      title="WhatsApp"
                      style={{ fontFamily: 'inherit', width: '34px', height: '34px', borderRadius: '9px', background: '#fff', border: '1px solid #E4E2DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <MessageCircle size={16} strokeWidth={1.75} style={{ color: '#0B6F64' }} />
                    </button>
                    <button
                      onClick={() =>
                        task.member_id &&
                        navigate({ to: '/navigator/member/$memberId', params: { memberId: task.member_id } })
                      }
                      style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0E8C7F', color: '#fff', border: 'none', borderRadius: '9px', padding: '8px 13px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
