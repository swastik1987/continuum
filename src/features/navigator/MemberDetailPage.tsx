import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight, User, Languages, Building2, Pencil, Paperclip, Tag, Phone, MessageCircle, Calendar, CheckCheck, Flag, Sparkles } from 'lucide-react'
import { getMember, type MemberRow } from '@/lib/api/members'
import { getActivePlanForMember, type ActivePlanResult } from '@/lib/api/care-plans'
import { listNudgesForMember, type NudgeRow } from '@/lib/api/nudges'
import { listNavigatorTasks, updateTaskStatus, type NavigatorTaskWithMember } from '@/lib/api/navigator-tasks'
import { getOrg, type OrgRow } from '@/lib/api/organizations'
import { getSimDay } from '@/lib/api/sim-state'
import type { Json, Enums } from '@/lib/database.types'
import { RiskGauge } from './RiskGauge'
import { CarePlanTimeline } from './CarePlanTimeline'
import { EngagementHistory } from './EngagementHistory'

// ── Types & helpers ─────────────────────────────────────────────────────────

type RiskDriver = { icon: string; label: string; detail: string; color: 'red' | 'amber' | 'slate' }

function parseDrivers(raw: Json): RiskDriver[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (d): d is RiskDriver =>
      d !== null &&
      typeof d === 'object' &&
      !Array.isArray(d) &&
      typeof (d as Record<string, unknown>).label === 'string',
  )
}

const PRIO_CFG: Record<string, { bg: string; text: string; badgeBg: string; badgeText: string }> = {
  p1: { bg: '#FAE8E7', text: '#A8332F', badgeBg: '#D24B47', badgeText: '#fff' },
  p2: { bg: '#FBEFDD', text: '#A6620F', badgeBg: '#D9821B', badgeText: '#fff' },
  p3: { bg: '#EEF1F5', text: '#475569', badgeBg: '#64748B', badgeText: '#fff' },
}

const TRIGGER_LABEL: Record<Enums<'task_reason'>, string> = {
  post_er_72h: 'ER discharge — 72h follow-up',
  declined_mandatory: 'Declined mandatory test',
  repeat_dropper: 'Repeat drop-off',
  abnormal_result: 'Abnormal result',
  high_risk_overdue: 'High-risk overdue',
  structural_barrier: 'Structural barrier',
}

const SUGGESTED_APPROACH: Partial<Record<Enums<'task_reason'>, string>> = {
  declined_mandatory: 'Patient declined. Lead with reassurance about the concern raised before re-booking. Avoid repeat automated nudges.',
  post_er_72h: 'Recent ER discharge — confirm medication reconciliation and arrange urgent follow-up today.',
  repeat_dropper: 'Multiple no-shows. Try a different channel or time; ask about barriers directly.',
  structural_barrier: 'Structural barrier identified. Explore home collection or employer-sponsored transport.',
  high_risk_overdue: 'High-risk with overdue actions. Prioritise phone outreach today.',
  abnormal_result: 'Abnormal result pending follow-up. Flag urgency to clinician if unable to reach.',
}

const SEG_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  forgot: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Needs reminder' },
  cost: { bg: '#FBEFDD', text: '#A6620F', dot: '#D9821B', label: 'Cost barrier' },
  feels_better: { bg: '#E6F4EC', text: '#167A41', dot: '#1F9D55', label: 'Feels better' },
  logistics: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Transport' },
  lost_thread: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Lost thread' },
  trust: { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', label: 'Trust barrier' },
  avoidance: { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', label: 'Avoidance' },
  none: { bg: '#EEF1F5', text: '#475569', dot: '#64748B', label: 'Unknown' },
}

const DRIVER_ICON_COLOR: Record<string, { bg: string; color: string }> = {
  red: { bg: '#FAE8E7', color: '#A8332F' },
  amber: { bg: '#FBEFDD', color: '#A6620F' },
  slate: { bg: '#EEF1F5', color: '#475569' },
}

function DriverIcon({ name, color }: { name: string; color: 'red' | 'amber' | 'slate' }) {
  const cfg = DRIVER_ICON_COLOR[color] ?? DRIVER_ICON_COLOR.slate
  const ICONS: Record<string, string> = {
    'activity': 'M22 12h-4l-3 9L9 3l-3 9H2',
    'circle-slash': 'M9 9l6 6m0-6l-6 6M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z',
    'rotate-ccw': 'M3 2v6h6M3.5 9A9 9 0 1 0 5.1 5.1',
    'clock': 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l4 2',
    'trending-up': 'M23 6l-9.5 9.5-5-5L1 18',
  }
  const d = ICONS[name] ?? ICONS.activity
  return (
    <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </div>
  )
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function calcAge(dob: string | null, today: Date): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function orgAbbr(name: string): string {
  return name.replace(/\s+/g, '').slice(0, 3).toUpperCase()
}

// ── Main component ──────────────────────────────────────────────────────────

export function MemberDetailPage({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<MemberRow | null>(null)
  const [plan, setPlan] = useState<ActivePlanResult | null>(null)
  const [nudges, setNudges] = useState<NudgeRow[]>([])
  const [task, setTask] = useState<NavigatorTaskWithMember | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<OrgRow | null>(null)
  const [simDay, setSimDay] = useState<Date>(new Date())

  useEffect(() => {
    async function load() {
      const [m, p, n, tasks, day] = await Promise.all([
        getMember(memberId),
        getActivePlanForMember(memberId),
        listNudgesForMember(memberId),
        listNavigatorTasks({ member_id: memberId, status: 'open' }),
        getSimDay(),
      ])
      setSimDay(day)
      setMember(m)
      setPlan(p)
      setNudges(n)
      setTask(tasks[0] ?? null)
      if (m?.org_id) {
        const o = await getOrg(m.org_id)
        setOrg(o)
      }
      setLoading(false)
    }
    load()
  }, [memberId])

  async function handleSaveNote() {
    if (!task || !note.trim()) return
    setSaving(true)
    await updateTaskStatus(task.id, 'in_progress', note.trim())
    setSaving(false)
    setSaved(true)
    setNote('')
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleResolve() {
    if (!task) return
    await updateTaskStatus(task.id, 'resolved', note.trim() || undefined)
    window.history.back()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8794A5', fontSize: '14px' }}>
        Loading…
      </div>
    )
  }

  if (!member) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Member not found</div>
        <Link to="/navigator" style={{ fontSize: '13px', color: '#0B6F64' }}>← Back to worklist</Link>
      </div>
    )
  }

  const drivers = parseDrivers(member.risk_drivers ?? [])
  const seg = SEG_CFG[member.drop_segment ?? 'none'] ?? SEG_CFG.none
  const prioCfg = task ? (PRIO_CFG[task.priority] ?? PRIO_CFG.p3) : null
  const riskTierColor: Record<string, { bg: string; text: string; dot: string }> = {
    high: { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47' },
    medium: { bg: '#FBEFDD', text: '#A6620F', dot: '#D9821B' },
    low: { bg: '#E6F4EC', text: '#167A41', dot: '#1F9D55' },
  }
  const tierCfg = riskTierColor[member.risk_tier] ?? riskTierColor.low
  const suggestion = task ? SUGGESTED_APPROACH[task.trigger_reason] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Member header ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #ECEAE5', flexShrink: 0 }}>
        {/* Breadcrumb + task badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12.5px', color: '#8794A5', fontWeight: 500 }}>
            <Link
              to="/navigator"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#5A6B80', textDecoration: 'none' }}
            >
              <ArrowLeft size={15} strokeWidth={1.75} /> Worklist
            </Link>
            <ChevronRight size={14} strokeWidth={1.75} style={{ color: '#C2CAD3' }} />
            <span style={{ color: '#13233A', fontWeight: 600 }}>{member.full_name}</span>
          </div>

          {task && prioCfg && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 11px 5px 9px', borderRadius: '8px', background: prioCfg.bg, border: `1px solid ${prioCfg.bg}`, color: prioCfg.text, fontSize: '12px', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 7px', borderRadius: '5px', background: prioCfg.badgeBg, color: prioCfg.badgeText, fontSize: '11px', fontWeight: 700 }}>
                {task.priority.toUpperCase()}
              </span>
              Open task · {TRIGGER_LABEL[task.trigger_reason]}
            </div>
          )}
        </div>

        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '99px', background: tierCfg.bg, color: tierCfg.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, flexShrink: 0 }}>
              {initials(member.full_name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ fontSize: '25px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{member.full_name}</h1>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderRadius: '999px', background: tierCfg.bg, color: tierCfg.text, fontSize: '12.5px', fontWeight: 600 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '99px', background: tierCfg.dot }} />
                  {member.risk_tier.charAt(0).toUpperCase() + member.risk_tier.slice(1)}-risk tier
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '13.5px', color: '#5A6B80', flexWrap: 'wrap' }}>
                {(member.dob || member.gender) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} strokeWidth={1.75} style={{ color: '#A2AAB4' }} />
                    {[calcAge(member.dob, simDay), member.gender].filter(Boolean).join(' · ')}
                  </span>
                )}
                {org?.name && (
                  <>
                    <span style={{ width: '3px', height: '3px', borderRadius: '99px', background: '#C2CAD3' }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={15} strokeWidth={1.75} style={{ color: '#A2AAB4' }} />
                      {org.name}
                    </span>
                  </>
                )}
                {member.preferred_language && (
                  <>
                    <span style={{ width: '3px', height: '3px', borderRadius: '99px', background: '#C2CAD3' }} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Languages size={15} strokeWidth={1.75} style={{ color: '#A2AAB4' }} />
                      {member.preferred_language}
                    </span>
                  </>
                )}
                {member.drop_segment && member.drop_segment !== 'none' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px', borderRadius: '7px', background: seg.bg, color: seg.text, fontSize: '12px', fontWeight: 600, marginLeft: '2px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: seg.dot }} />
                    {seg.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8794A5', lineHeight: 1.7 }}>
            <div>MEMBER #{org ? `${orgAbbr(org.name)}-${member.id.replace(/-/g, '').slice(-5).toUpperCase()}` : member.id.slice(0, 8).toUpperCase()}</div>
            {member.created_at && (
              <div>ENROLLED {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</div>
            )}
          </div>
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '312px 1fr 376px',
          gap: '20px',
          padding: '22px 28px 26px',
          overflowY: 'auto',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT: Risk + Why flagged + Suggestion ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <RiskGauge
            score={member.risk_score ?? 50}
            tier={member.risk_tier as 'low' | 'medium' | 'high'}
            trend={null}
          />

          {/* Why flagged */}
          <div style={{ background: '#fff', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '4px' }}>
              <Flag size={17} strokeWidth={1.75} style={{ color: '#D24B47' }} />
              <h2 style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Why flagged</h2>
            </div>
            <div style={{ fontSize: '12.5px', color: '#8794A5', marginBottom: '18px' }}>
              {drivers.length > 0 ? `${drivers.length} risk driver${drivers.length !== 1 ? 's' : ''} triggered this task.` : 'Risk drivers will appear after compute-risk runs.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {drivers.length > 0
                ? drivers.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: '13px', padding: '13px 0', borderBottom: i < drivers.length - 1 ? '1px solid #F2F0EC' : undefined }}>
                      <DriverIcon name={d.icon} color={d.color} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{d.label}</div>
                        <div style={{ fontSize: '12px', color: '#8794A5', marginTop: '2px' }}>{d.detail}</div>
                      </div>
                    </div>
                  ))
                : task && (
                    <div style={{ display: 'flex', gap: '13px', padding: '13px 0' }}>
                      <DriverIcon name="activity" color="amber" />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{TRIGGER_LABEL[task.trigger_reason]}</div>
                        <div style={{ fontSize: '12px', color: '#8794A5', marginTop: '2px' }}>From navigator task</div>
                      </div>
                    </div>
                  )
              }
            </div>
          </div>

          {/* Suggested approach */}
          {suggestion && (
            <div style={{ background: '#EDF4F3', border: '1px solid #CFE6E1', borderRadius: '16px', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0B6F64', fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>
                <Sparkles size={15} strokeWidth={1.75} /> Suggested approach
              </div>
              <div style={{ fontSize: '13px', color: '#13233A', lineHeight: 1.5 }}>{suggestion}</div>
            </div>
          )}
        </div>

        {/* ── CENTER: Care plan ── */}
        {plan ? (
          <CarePlanTimeline
            actions={plan.actions}
            providerName={plan.providerName}
            consultAt={plan.consultation?.consulted_at ?? null}
            simDay={simDay}
          />
        ) : (
          <div style={{ background: '#fff', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '24px 26px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>Care plan</h2>
            <div style={{ fontSize: '13px', color: '#8794A5' }}>No active care plan found.</div>
          </div>
        )}

        {/* ── RIGHT: Actions + History + Note ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Action buttons */}
          <div style={{ background: '#fff', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0E8C7F', color: '#fff', border: 'none', borderRadius: '11px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(14,140,127,.3)' }}>
                <Phone size={16} strokeWidth={1.75} /> Call
              </button>
              <button style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff', color: '#0B6F64', border: '1px solid #BFDCD7', borderRadius: '11px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                <MessageCircle size={16} strokeWidth={1.75} /> WhatsApp
              </button>
              <button style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff', color: '#0B6F64', border: '1px solid #BFDCD7', borderRadius: '11px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                <Calendar size={16} strokeWidth={1.75} /> Reschedule
              </button>
              <button
                onClick={handleResolve}
                disabled={!task}
                style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: task ? '#13233A' : '#D1D5DB', color: '#fff', border: 'none', borderRadius: '11px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 600, cursor: task ? 'pointer' : 'default' }}
              >
                <CheckCheck size={16} strokeWidth={1.75} /> Resolve task
              </button>
            </div>
          </div>

          {/* Engagement history */}
          <EngagementHistory nudges={nudges} />

          {/* Add note */}
          <div style={{ background: '#fff', border: '1px solid #ECEAE5', borderRadius: '16px', padding: '18px', boxShadow: '0 1px 2px rgba(19,35,58,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Pencil size={16} strokeWidth={1.75} style={{ color: '#0E8C7F' }} />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Add note</span>
            </div>
            <textarea
              placeholder="Log the outcome of your outreach…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ fontFamily: 'inherit', width: '100%', height: '74px', resize: 'none', fontSize: '13px', color: '#13233A', background: '#fff', border: '1px solid #D9D6CF', borderRadius: '10px', padding: '11px 13px', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '11px' }}>
              <div style={{ display: 'flex', gap: '7px' }}>
                <button style={{ fontFamily: 'inherit', width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #E4E2DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Paperclip size={15} strokeWidth={1.75} style={{ color: '#5A6B80' }} />
                </button>
                <button style={{ fontFamily: 'inherit', width: '32px', height: '32px', borderRadius: '8px', background: '#fff', border: '1px solid #E4E2DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Tag size={15} strokeWidth={1.75} style={{ color: '#5A6B80' }} />
                </button>
              </div>
              <button
                onClick={handleSaveNote}
                disabled={!note.trim() || saving}
                style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '7px', background: note.trim() ? '#0E8C7F' : '#CFE3DF', color: '#fff', border: 'none', borderRadius: '9px', padding: '9px 15px', fontSize: '13px', fontWeight: 600, cursor: note.trim() ? 'pointer' : 'default' }}
              >
                {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
