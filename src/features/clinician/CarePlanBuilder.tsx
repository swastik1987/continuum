import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Cloud, Send, ClipboardList, Video, Stethoscope,
  FlaskConical, Pill, Syringe, HeartPulse, Activity,
  ChevronsUpDown, Trash2, Plus, Calendar, ShieldCheck,
  Sparkles, Check, X, Smartphone, Lock, LogOut,
} from 'lucide-react'
import type { Enums } from '@/lib/database.types'
import { useAuth } from '@/lib/auth/context'
import {
  listConsultations,
  getActivePlanForMember,
  updateCarePlanAction,
  addCarePlanAction,
  deleteCarePlanAction,
  confirmSuggestedAction,
  type ActivePlanResult,
  type ConsultationWithMeta,
  type ActionRow,
} from '@/lib/api/care-plans'

// ── Types ──────────────────────────────────────────────────────────────────

type ActionType = Enums<'action_type'>
type Priority = Enums<'clinical_priority'>

interface EditableAction {
  id: string // real UUID or 'new-N'
  action_type: ActionType
  title: string
  why_plain: string
  clinical_priority: Priority
  due_date: string
}

interface SuggestionItem {
  id: string // real UUID or 'static-N'
  action_type: ActionType
  title: string
  why_plain: string
  clinical_priority: Priority
  due_date: string
  rationale: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_ORDER: ActionType[] = [
  'lab_test', 'follow_up_consult', 'medication', 'vaccination', 'lifestyle', 'imaging',
]

const TYPE_LABEL: Record<ActionType, string> = {
  lab_test: 'Lab test',
  follow_up_consult: 'Follow-up consult',
  medication: 'Medication',
  vaccination: 'Vaccination',
  lifestyle: 'Lifestyle',
  imaging: 'Imaging',
}

const TYPE_ICON: Record<ActionType, React.FC<{ size?: number; strokeWidth?: number }>> = {
  lab_test: FlaskConical,
  follow_up_consult: Stethoscope,
  medication: Pill,
  vaccination: Syringe,
  lifestyle: HeartPulse,
  imaging: Activity,
}

const PRIO: Record<Priority, { bg: string; text: string; dot: string; accent: string; border: string }> = {
  mandatory:   { bg: '#FAE8E7', text: '#A8332F', dot: '#D24B47', accent: '#D24B47', border: '#F1CFCD' },
  recommended: { bg: '#EDF4F3', text: '#0B6F64', dot: '#0E8C7F', accent: '#0E8C7F', border: '#CFE6E1' },
  optional:    { bg: '#EEF1F5', text: '#475569', dot: '#64748B', accent: '#64748B', border: '#DEE4EC' },
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'static-1',
    action_type: 'lab_test',
    title: 'HbA1c (3-month average)',
    why_plain: 'Confirms the diagnosis and gives a baseline to track long-term control against.',
    clinical_priority: 'recommended',
    due_date: '2026-07-10',
    rationale: 'From note: "confirm with HbA1c"',
  },
  {
    id: 'static-2',
    action_type: 'lifestyle',
    title: 'Dietitian referral',
    why_plain: 'Structured nutrition support improves glucose control alongside medication.',
    clinical_priority: 'optional',
    due_date: '2026-07-20',
    rationale: 'Care pathway: new Type 2 diabetes',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00' : ''))
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return isNaN(d.getTime()) ? iso : `${d.getDate()} ${M[d.getMonth()]}`
}

function age(dob: string | null): number | null {
  if (!dob) return null
  const b = new Date(dob)
  const today = new Date()
  let a = today.getFullYear() - b.getFullYear()
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--
  return a
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function toEditableAction(a: ActionRow): EditableAction {
  return {
    id: a.id,
    action_type: a.action_type,
    title: a.title,
    why_plain: a.why_plain ?? '',
    clinical_priority: a.clinical_priority,
    due_date: a.due_date ?? '',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ContinuumRing() {
  return (
    <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="17" stroke="#E2EFEC" strokeWidth="5" />
      <circle cx="22" cy="22" r="17" stroke="#0E8C7F" strokeWidth="5" strokeLinecap="round" strokeDasharray="80 107" transform="rotate(-90 22 22)" />
    </svg>
  )
}

function PriorityButtons({
  value,
  onChange,
}: {
  value: Priority
  onChange: (p: Priority) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {(['mandatory', 'recommended', 'optional'] as Priority[]).map((p) => {
        const active = value === p
        const cfg = PRIO[p]
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              fontFamily: 'inherit', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              padding: '7px 12px', borderRadius: '8px',
              background: active ? cfg.bg : '#fff',
              color: active ? cfg.text : '#8794A5',
              border: `1px solid ${active ? cfg.border : '#E4E2DD'}`,
              textTransform: 'capitalize',
            }}
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}

function AuthoredCard({
  action,
  onChange,
  onRemove,
}: {
  action: EditableAction
  onChange: (patch: Partial<EditableAction>) => void
  onRemove: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const p = PRIO[action.clinical_priority]
  const Icon = TYPE_ICON[action.action_type]

  useEffect(() => {
    if (!pickerOpen) return
    function handleOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [pickerOpen])

  return (
    <div style={{
      background: '#fff',
      border: `1px solid #EDEBE6`,
      borderLeft: `3px solid ${p.accent}`,
      borderRadius: '16px',
      padding: '18px',
      boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 12px 30px -24px rgba(19,35,58,.2)',
    }}>
      {/* Type selector + trash */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((prev) => !prev)}
            title="Select action type"
            style={{
              fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '9px',
              background: pickerOpen ? '#F7F6F3' : '#fff', border: '1px solid #E4E2DD', borderRadius: '9px',
              padding: '7px 11px 7px 9px', fontSize: '13px', fontWeight: 600,
              color: '#13233A', cursor: 'pointer',
            }}
          >
            <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: '#EDF4F3', color: '#0B6F64', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} strokeWidth={1.75} />
            </span>
            {TYPE_LABEL[action.action_type]}
            <span style={{ color: '#A2AAB4', display: 'inline-flex' }}>
              <ChevronsUpDown size={14} strokeWidth={1.75} />
            </span>
          </button>

          {pickerOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
              background: '#fff', border: '1px solid #E4E2DD', borderRadius: '12px',
              boxShadow: '0 8px 24px -8px rgba(19,35,58,.18), 0 1px 3px rgba(19,35,58,.06)',
              padding: '5px', minWidth: '210px',
            }}>
              {TYPE_ORDER.map((type) => {
                const OptionIcon = TYPE_ICON[type]
                const active = action.action_type === type
                return (
                  <button
                    key={type}
                    onClick={() => { onChange({ action_type: type }); setPickerOpen(false) }}
                    style={{
                      fontFamily: 'inherit', width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '8px',
                      background: active ? '#EDF4F3' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      color: active ? '#0B6F64' : '#3A4A5E',
                      fontSize: '13px', fontWeight: 600, textAlign: 'left',
                    }}
                  >
                    <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: active ? '#D7EDE9' : '#F4F2EE', color: active ? '#0B6F64' : '#6B6256', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <OptionIcon size={15} strokeWidth={1.75} />
                    </span>
                    {TYPE_LABEL[type]}
                    {active && (
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', color: '#0E8C7F' }}>
                        <Check size={14} strokeWidth={2} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          title="Remove action"
          style={{
            fontFamily: 'inherit', width: '32px', height: '32px', borderRadius: '8px',
            background: 'transparent', border: 'none', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A2AAB4',
          }}
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* Title */}
      <input
        value={action.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Action title"
        style={{
          width: '100%', border: 'none', outline: 'none', background: 'transparent',
          fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em', color: '#13233A',
          padding: '14px 2px 8px', borderBottom: '1px solid #F0EEEA', fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />

      {/* Why */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A2AAB4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="8" y1="10" x2="16" y2="10" />
        </svg>
        <input
          value={action.why_plain}
          onChange={(e) => onChange({ why_plain: e.target.value })}
          placeholder="Plain-language reason the patient will read…"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '13.5px', color: '#3A4A5E', padding: '2px 0', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Priority + due date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginTop: '16px', paddingTop: '15px', borderTop: '1px solid #F0EEEA', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A2AAB4', marginBottom: '7px' }}>
            Clinical priority
          </div>
          <PriorityButtons value={action.clinical_priority} onChange={(p) => onChange({ clinical_priority: p })} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A2AAB4', marginBottom: '7px' }}>
            Due by
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #E4E2DD', borderRadius: '9px', padding: '8px 11px' }}>
            <Calendar size={15} strokeWidth={1.75} style={{ color: '#5A6B80' }} />
            <input
              type="date"
              value={action.due_date}
              onChange={(e) => onChange({ due_date: e.target.value })}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#13233A', fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({
  item,
  onConfirm,
  onDismiss,
}: {
  item: SuggestionItem
  onConfirm: () => void
  onDismiss: () => void
}) {
  const p = PRIO[item.clinical_priority]
  const Icon = TYPE_ICON[item.action_type]

  return (
    <div style={{ position: 'relative', background: '#FBFAF8', border: '1.5px dashed #D2CCC0', borderRadius: '16px', padding: '18px' }}>
      <span style={{ position: 'absolute', top: '14px', right: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '7px', background: '#F4F2EE', border: '1px solid #E4E1DA', color: '#6B6256', fontSize: '11.5px', fontWeight: 600 }}>
        <Sparkles size={13} strokeWidth={1.75} /> AI-suggested
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
        <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F1EEE9', border: '1px dashed #D6D0C4', color: '#6B6256', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#8794A5', fontWeight: 600 }}>{TYPE_LABEL[item.action_type]}</div>
          <div style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-0.01em', marginTop: '2px' }}>{item.title}</div>
        </div>
      </div>

      <div style={{ fontSize: '13.5px', color: '#3A4A5E', lineHeight: 1.5, marginTop: '13px' }}>{item.why_plain}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '13px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: p.bg, color: p.text, fontSize: '11.5px', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: p.dot }} />
          {item.clinical_priority.charAt(0).toUpperCase() + item.clinical_priority.slice(1)}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#5A6B80' }}>
          <Calendar size={14} strokeWidth={1.75} /> Due {fmt(item.due_date)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '13px', paddingTop: '13px', borderTop: '1px dashed #E2DCD0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A2AAB4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: '#8794A5', lineHeight: 1.4 }}>{item.rationale}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button
          onClick={onConfirm}
          style={{ fontFamily: 'inherit', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0E8C7F', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(14,140,127,.3)' }}
        >
          <Check size={16} strokeWidth={1.75} /> Confirm &amp; authorise
        </button>
        <button
          onClick={onDismiss}
          style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#fff', color: '#5A6B80', border: '1px solid #E4E2DD', borderRadius: '10px', padding: '11px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
        >
          <X size={16} strokeWidth={1.75} /> Dismiss
        </button>
      </div>
    </div>
  )
}

function PatientPreview({
  actions,
  memberFirstName,
  memberInitials,
  providerName,
  consultDate,
}: {
  actions: EditableAction[]
  memberFirstName: string
  memberInitials: string
  providerName: string
  consultDate: string
}) {
  return (
    <div style={{ width: '360px', margin: '0 auto', background: '#F7F6F3', borderRadius: '38px', border: '1px solid #E4E2DD', boxShadow: '0 24px 60px -28px rgba(19,35,58,.4)', overflow: 'hidden' }}>
      {/* Status bar */}
      <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px 0 30px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 6s4-4 11-4 11 4 11 4"/><path d="M5 10s2.5-2.5 7-2.5 7 2.5 7 2.5"/><path d="M9 14s1.5-1.5 3-1.5 3 1.5 3 1.5"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="7" width="17" height="11" rx="2" ry="2"/><polyline points="22 11 22 13"/></svg>
        </div>
      </div>

      <div style={{ padding: '6px 18px 22px' }}>
        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 2px 16px' }}>
          <div>
            <div style={{ fontSize: '23px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Hi {memberFirstName}</div>
            <div style={{ fontSize: '12.5px', color: '#5A6B80', marginTop: '5px' }}>Your care plan from {providerName} · {consultDate}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '99px', background: '#13233A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>{memberInitials}</div>
        </div>

        {/* Progress ring */}
        <div style={{ background: '#fff', border: '1px solid #EDEBE6', borderRadius: '18px', padding: '17px', boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 12px 30px -20px rgba(19,35,58,.18)', display: 'flex', alignItems: 'center', gap: '17px' }}>
          <svg width="78" height="78" viewBox="0 0 92 92" style={{ flexShrink: 0 }}>
            <circle cx="46" cy="46" r="39" fill="none" stroke="#EEF0EE" strokeWidth="9" />
            <circle cx="46" cy="46" r="39" fill="none" stroke="#0E8C7F" strokeWidth="9" strokeLinecap="round" strokeDasharray="245" strokeDashoffset="245" transform="rotate(-90 46 46)" />
            <text x="46" y="42" textAnchor="middle" fontFamily="Inter" fontSize="20" fontWeight="700" fill="#13233A">0/{actions.length}</text>
            <text x="46" y="58" textAnchor="middle" fontFamily="Inter" fontSize="9.5" fontWeight="500" fill="#8794A5" letterSpacing="0.5">STEPS</text>
          </svg>
          <div>
            <div style={{ fontSize: '15.5px', fontWeight: 600, letterSpacing: '-0.01em' }}>Your plan is ready</div>
            <div style={{ fontSize: '12.5px', color: '#5A6B80', lineHeight: 1.45, marginTop: '4px' }}>{actions.length} steps to keep you on track. Let's start with the first.</div>
          </div>
        </div>

        {/* Next steps label */}
        <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', margin: '20px 4px 12px' }}>Next steps</div>

        {/* Preview cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {actions.map((a) => {
            const p = PRIO[a.clinical_priority]
            const Icon = TYPE_ICON[a.action_type]
            return (
              <div key={a.id} style={{ background: '#fff', border: `1px solid #EDEBE6`, borderLeft: `3px solid ${p.accent}`, borderRadius: '15px', padding: '15px', boxShadow: '0 1px 2px rgba(19,35,58,.04), 0 10px 26px -22px rgba(19,35,58,.22)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: p.bg, color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={19} strokeWidth={1.75} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, letterSpacing: '-0.01em' }}>{a.title || 'Untitled action'}</div>
                    <div style={{ fontSize: '11.5px', color: '#8794A5', marginTop: '2px' }}>{TYPE_LABEL[a.action_type]}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: p.bg, color: p.text, fontSize: '11.5px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: p.dot }} />
                    {a.clinical_priority.charAt(0).toUpperCase() + a.clinical_priority.slice(1)}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#3A4A5E', lineHeight: 1.5, marginTop: '11px' }}>{a.why_plain || 'Add a reason the patient will read.'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '11px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#5A6B80' }}>
                    <Calendar size={13} strokeWidth={1.75} /> Due {a.due_date ? fmt(a.due_date) : '—'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: '#EDF4F3', border: '1px solid #CFE6E1', color: '#0B6F64', fontSize: '10.5px', fontWeight: 600 }}>
                    <ShieldCheck size={11} strokeWidth={1.75} /> Clinician-authored
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chat promo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#13233A', borderRadius: '15px', padding: '14px 15px', marginTop: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(255,255,255,.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Questions? Chat with your care team</div>
            <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)', marginTop: '2px' }}>Usually replies within an hour</div>
          </div>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function CarePlanBuilder() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [planResult, setPlanResult] = useState<ActivePlanResult | null>(null)
  const [consultation, setConsultation] = useState<ConsultationWithMeta | null>(null)
  const [actions, setActions] = useState<EditableAction[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(DEFAULT_SUGGESTIONS)
  const [published, setPublished] = useState(false)
  const nextIdRef = useRef(100)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const consults = await listConsultations()
      const consult = consults[0] ?? null
      setConsultation(consult)

      if (consult?.member?.id) {
        // Ensure system_suggested rows exist in DB before loading the plan
        if (consult.id) {
          await supabase.functions.invoke('suggest-actions', {
            body: { consultation_id: consult.id },
          })
        }

        const result = await getActivePlanForMember(consult.member.id)
        setPlanResult(result)
        if (result) {
          const authored = result.actions.filter((a) => a.provenance !== 'system_suggested')
          const suggested = result.actions.filter((a) => a.provenance === 'system_suggested')
          setActions(authored.map(toEditableAction))
          if (suggested.length > 0) {
            setSuggestions(suggested.map((a) => ({
              id: a.id,
              action_type: a.action_type,
              title: a.title,
              why_plain: a.why_plain ?? '',
              clinical_priority: a.clinical_priority,
              due_date: a.due_date ?? '',
              rationale: 'System-suggested from consult notes',
            })))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function updateAction(id: string, patch: Partial<EditableAction>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id))
    if (!id.startsWith('new-')) {
      void deleteCarePlanAction(id)
    }
  }

  function addAction() {
    const id = `new-${nextIdRef.current++}`
    setActions((prev) => [
      ...prev,
      { id, action_type: 'lab_test', title: '', why_plain: '', clinical_priority: 'recommended', due_date: '2026-07-15' },
    ])
  }

  async function handleConfirm(item: SuggestionItem) {
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id))
    if (item.id.startsWith('static-') && planResult) {
      const newAction = await addCarePlanAction(planResult.plan.id, planResult.plan.member_id ?? '', {
        action_type: item.action_type,
        title: item.title,
        why_plain: item.why_plain,
        clinical_priority: item.clinical_priority,
        due_date: item.due_date || undefined,
      })
      if (newAction) {
        setActions((prev) => [...prev, toEditableAction(newAction)])
      } else {
        setActions((prev) => [...prev, {
          id: `new-${nextIdRef.current++}`,
          action_type: item.action_type,
          title: item.title,
          why_plain: item.why_plain,
          clinical_priority: item.clinical_priority,
          due_date: item.due_date,
        }])
      }
    } else {
      void confirmSuggestedAction(item.id)
      setActions((prev) => [...prev, {
        id: item.id,
        action_type: item.action_type,
        title: item.title,
        why_plain: item.why_plain,
        clinical_priority: item.clinical_priority,
        due_date: item.due_date,
      }])
    }
  }

  function handleDismiss(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    if (!id.startsWith('static-') && !id.startsWith('new-')) {
      void deleteCarePlanAction(id)
    }
  }

  async function handlePublish() {
    if (!planResult) return
    await Promise.all(
      actions.map((a) =>
        a.id.startsWith('new-')
          ? addCarePlanAction(planResult.plan.id, planResult.plan.member_id ?? '', {
              action_type: a.action_type,
              title: a.title,
              why_plain: a.why_plain,
              clinical_priority: a.clinical_priority,
              due_date: a.due_date || undefined,
            })
          : updateCarePlanAction(a.id, {
              action_type: a.action_type,
              title: a.title,
              why_plain: a.why_plain,
              clinical_priority: a.clinical_priority,
              due_date: a.due_date || undefined,
            }),
      ),
    )
    setPublished(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setPublished(false), 3200)
  }

  const memberName = consultation?.member?.full_name ?? 'Ananya Sharma'
  const memberAge = age(consultation?.member?.dob ?? null) ?? 46
  const providerName = consultation?.provider?.full_name ?? 'Dr. Priya Mehra'
  const providerSpec = consultation?.provider?.specialty ?? 'Endocrinology'
  const consultDate = consultation?.consulted_at ? fmt(consultation.consulted_at) + ' 2026' : '27 Jun 2026'
  const consultDateShort = consultation?.consulted_at ? fmt(consultation.consulted_at) : '27 Jun'
  const chiefComplaint = consultation?.chief_complaint ?? 'Increased thirst and fatigue over the past 6 weeks.'
  const clinicalNotes = consultation?.summary ?? 'Presents with classic hyperglycaemia symptoms. Fasting glucose elevated. Likely new Type 2 diabetes — confirm with HbA1c. Start first-line metformin, lifestyle counselling, and structured follow-up to track response.'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8794A5', fontSize: '14px' }}>
        Loading care plan…
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', color: '#13233A', background: '#F7F6F3' }}>

      {/* ── Top bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', background: '#fff', borderBottom: '1px solid #ECEAE5', flexShrink: 0, zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ContinuumRing />
          <div style={{ width: '1px', height: '30px', background: '#ECEAE5' }} />
          <div>
            <div style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>Care-Plan Builder</div>
            <div style={{ fontSize: '12.5px', color: '#8794A5', marginTop: '4px' }}>
              Consult #{planResult ? planResult.plan.consultation_id?.slice(0, 8).toUpperCase() ?? 'CN-4471' : 'CN-4471'} · turning today's visit into a trackable plan
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: '#8794A5', fontWeight: 500 }}>
            <Cloud size={15} strokeWidth={1.75} /> Draft saved · just now
          </div>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            style={{ fontFamily: 'inherit', width: '38px', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#A2AAB4', border: '1px solid #E4E2DD', borderRadius: '10px', cursor: 'pointer' }}
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

        {/* ── Left aside: Consult summary ── */}
        <aside style={{ width: '316px', flexShrink: 0, background: '#fff', borderRight: '1px solid #ECEAE5', overflowY: 'auto', padding: '22px 22px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8794A5', marginBottom: '16px' }}>
            <ClipboardList size={14} strokeWidth={1.75} style={{ color: '#0E8C7F' }} /> 1 · Consult summary
          </div>

          {/* Patient identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '99px', background: '#13233A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, flexShrink: 0 }}>
              {initials(memberName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '16.5px', fontWeight: 600, letterSpacing: '-0.01em' }}>{memberName}</div>
              <div style={{ fontSize: '12.5px', color: '#8794A5', marginTop: '2px' }}>{memberAge} · Female · MRN 88-201-447</div>
            </div>
          </div>

          {/* Diagnosis chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '14px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '7px', background: '#FBEFDD', color: '#A6620F', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#D9821B' }} /> New diagnosis
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '7px', background: '#EEF1F5', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
              Type 2 diabetes
            </span>
          </div>

          {/* Consult meta */}
          <div style={{ marginTop: '20px', padding: '14px 16px', borderRadius: '13px', background: '#F7F6F3', border: '1px solid #ECEAE5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#3A4A5E' }}>
              <Video size={16} strokeWidth={1.75} style={{ color: '#0E8C7F' }} /> Video consult · {consultDate}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#3A4A5E', marginTop: '11px' }}>
              <Stethoscope size={16} strokeWidth={1.75} style={{ color: '#0E8C7F' }} /> {providerName} · {providerSpec}
            </div>
          </div>

          {/* Chief complaint */}
          <div style={{ marginTop: '22px' }}>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8794A5', marginBottom: '9px' }}>Chief complaint</div>
            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.45 }}>{chiefComplaint}</div>
          </div>

          {/* Vitals */}
          <div style={{ marginTop: '22px' }}>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8794A5', marginBottom: '11px' }}>Today's readings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
              <div style={{ padding: '11px 13px', borderRadius: '11px', border: '1px solid #F1CFCD', background: '#FAE8E7' }}>
                <div style={{ fontSize: '11px', color: '#A8332F', fontWeight: 600 }}>Fasting glucose</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#A8332F', marginTop: '3px' }}>142<span style={{ fontSize: '11px', fontWeight: 500 }}> mg/dL</span></div>
              </div>
              <div style={{ padding: '11px 13px', borderRadius: '11px', border: '1px solid #ECEAE5', background: '#F7F6F3' }}>
                <div style={{ fontSize: '11px', color: '#8794A5', fontWeight: 600 }}>Blood pressure</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: '3px' }}>138/86</div>
              </div>
              <div style={{ padding: '11px 13px', borderRadius: '11px', border: '1px solid #ECEAE5', background: '#F7F6F3' }}>
                <div style={{ fontSize: '11px', color: '#8794A5', fontWeight: 600 }}>BMI</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: '3px' }}>28.4</div>
              </div>
              <div style={{ padding: '11px 13px', borderRadius: '11px', border: '1px solid #ECEAE5', background: '#F7F6F3' }}>
                <div style={{ fontSize: '11px', color: '#8794A5', fontWeight: 600 }}>HbA1c</div>
                <div style={{ fontSize: '18px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: '3px', color: '#8794A5' }}>—</div>
              </div>
            </div>
          </div>

          {/* Clinical notes */}
          <div style={{ marginTop: '22px' }}>
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8794A5', marginBottom: '9px' }}>Clinical notes</div>
            <div style={{ fontSize: '13px', color: '#3A4A5E', lineHeight: 1.6 }}>{clinicalNotes}</div>
          </div>
        </aside>

        {/* ── Centre: Builder ── */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 30px 40px' }}>

          {/* Authored heading */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8794A5', marginBottom: '8px' }}>2 · Build plan</div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Next steps</h2>
              <p style={{ fontSize: '13.5px', color: '#5A6B80', margin: '5px 0 0' }}>The structured actions Continuum will track until they're done.</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '8px', background: '#EDF4F3', border: '1px solid #CFE6E1', color: '#0B6F64', fontSize: '12.5px', fontWeight: 600, flexShrink: 0 }}>
              <ShieldCheck size={15} strokeWidth={1.75} /> {actions.length} authored by you
            </span>
          </div>

          {/* Authored action cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {actions.map((action) => (
              <AuthoredCard
                key={action.id}
                action={action}
                onChange={(patch) => updateAction(action.id, patch)}
                onRemove={() => removeAction(action.id)}
              />
            ))}
          </div>

          {/* Add action button */}
          <button
            onClick={addAction}
            style={{ fontFamily: 'inherit', width: '100%', marginTop: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px', background: 'transparent', border: '1.5px dashed #CFCABF', borderRadius: '14px', padding: '15px', fontSize: '14px', fontWeight: 600, color: '#5A6B80', cursor: 'pointer' }}
          >
            <Plus size={18} strokeWidth={1.75} /> Add a care-plan action
          </button>

          {/* Suggested by Continuum */}
          <div style={{ marginTop: '34px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#F4F2EE', border: '1px dashed #D6D0C4', color: '#6B6256', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={17} strokeWidth={1.75} />
              </span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>Suggested by Continuum</div>
                <div style={{ fontSize: '12.5px', color: '#8794A5', marginTop: '2px' }}>System-generated from the consult. Nothing here reaches the patient until you confirm it.</div>
              </div>
            </div>

            {suggestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginTop: '16px' }}>
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    item={s}
                    onConfirm={() => void handleConfirm(s)}
                    onDismiss={() => handleDismiss(s.id)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '18px', borderRadius: '14px', border: '1.5px dashed #D2CCC0', background: '#FBFAF8', color: '#8794A5' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F9D55" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18" opacity=".5"/></svg>
                <span style={{ fontSize: '13.5px', fontWeight: 500 }}>All suggestions reviewed. Every action in this plan was authored or authorised by you.</span>
              </div>
            )}
          </div>
        </main>

        {/* ── Right aside: Patient preview ── */}
        <aside style={{ width: '404px', flexShrink: 0, background: '#EFEDE8', borderLeft: '1px solid #E4E2DD', overflowY: 'auto', padding: '22px 22px 34px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8794A5' }}>
              <Smartphone size={14} strokeWidth={1.75} style={{ color: '#0E8C7F' }} /> 3 · Preview &amp; publish
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#0B6F64' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#1F9D55' }} /> Live
            </span>
          </div>

          <PatientPreview
            actions={actions}
            memberFirstName={memberName.split(' ')[0]}
            memberInitials={initials(memberName)}
            providerName={providerName}
            consultDate={consultDateShort}
          />

          <div style={{ marginTop: '20px', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.5)', border: '1px solid #E4E2DD' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '11.5px', color: '#8794A5', marginBottom: '14px' }}>
              <Lock size={13} strokeWidth={1.75} /> Updates live as you build · not sent until you publish
            </div>
            <button
              onClick={() => void handlePublish()}
              style={{ fontFamily: 'inherit', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0E8C7F', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(14,140,127,.35)' }}
            >
              <Send size={16} strokeWidth={1.75} /> Publish care plan to {memberName.split(' ')[0]}
            </button>
          </div>
        </aside>
      </div>

      {/* ── Publish toast ── */}
      <div style={{
        position: 'absolute', left: '50%', bottom: '26px',
        transform: published ? 'translateX(-50%)' : 'translateX(-50%) translateY(12px)',
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#13233A', borderRadius: '14px', padding: '13px 18px',
        boxShadow: '0 20px 50px -16px rgba(19,35,58,.5)', zIndex: 5,
        opacity: published ? 1 : 0,
        pointerEvents: published ? 'auto' : 'none',
        transition: 'opacity 0.25s, transform 0.25s',
      }}>
        <span style={{ width: '30px', height: '30px', borderRadius: '99px', background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={18} strokeWidth={1.75} style={{ color: '#fff' }} />
        </span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Care plan published</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', marginTop: '1px' }}>
            {actions.length} action{actions.length !== 1 ? 's' : ''} sent to {memberName.split(' ')[0]} · she's been notified
          </div>
        </div>
      </div>

    </div>
  )
}
