import type { CSSProperties } from 'react'

export type ActionStatus = 'pending' | 'scheduled' | 'completed' | 'snoozed' | 'declined' | 'overdue'
export type NudgeStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'responded' | 'suppressed'
export type TaskStatus = 'open' | 'in_progress' | 'resolved' | 'snoozed'
export type TaskPriority = 'p1' | 'p2' | 'p3'

type StatusConfig = {
  label: string
  style: CSSProperties
  dotStyle: CSSProperties
}

// CSS vars defined in src/styles.css — never hardcode colors in components
export const actionStatusConfig: Record<ActionStatus, StatusConfig> = {
  completed: {
    label: 'Done',
    style: {
      color: 'var(--c-done-text)',
      background: 'var(--c-done-bg)',
      borderColor: 'var(--c-done-bd)',
    },
    dotStyle: { background: 'var(--c-done)' },
  },
  pending: {
    label: 'Pending',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
  scheduled: {
    label: 'Scheduled',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
  overdue: {
    label: 'Overdue',
    style: {
      color: 'var(--c-overdue-text)',
      background: 'var(--c-overdue-bg)',
      borderColor: 'var(--c-overdue-bd)',
    },
    dotStyle: { background: 'var(--c-overdue)' },
  },
  declined: {
    label: 'Declined',
    style: {
      color: 'var(--c-declined-text)',
      background: 'var(--c-declined-bg)',
      borderColor: 'var(--c-declined-bd)',
    },
    dotStyle: { background: 'var(--c-declined)' },
  },
  snoozed: {
    label: 'Snoozed',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
}

export const nudgeStatusConfig: Record<NudgeStatus, StatusConfig> = {
  queued: {
    label: 'Queued',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
  sent: {
    label: 'Sent',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
  delivered: {
    label: 'Delivered',
    style: {
      color: 'var(--c-done-text)',
      background: 'var(--c-done-bg)',
      borderColor: 'var(--c-done-bd)',
    },
    dotStyle: { background: 'var(--c-done)' },
  },
  read: {
    label: 'Read',
    style: {
      color: 'var(--c-done-text)',
      background: 'var(--c-done-bg)',
      borderColor: 'var(--c-done-bd)',
    },
    dotStyle: { background: 'var(--c-done)' },
  },
  responded: {
    label: 'Responded',
    style: {
      color: 'var(--c-done-text)',
      background: 'var(--c-done-bg)',
      borderColor: 'var(--c-done-bd)',
    },
    dotStyle: { background: 'var(--c-done)' },
  },
  suppressed: {
    label: 'Suppressed',
    style: {
      color: 'var(--c-declined-text)',
      background: 'var(--c-declined-bg)',
      borderColor: 'var(--c-declined-bd)',
    },
    dotStyle: { background: 'var(--c-declined)' },
  },
}

export const taskStatusConfig: Record<TaskStatus, StatusConfig> = {
  open: {
    label: 'Open',
    style: {
      color: 'var(--c-overdue-text)',
      background: 'var(--c-overdue-bg)',
      borderColor: 'var(--c-overdue-bd)',
    },
    dotStyle: { background: 'var(--c-overdue)' },
  },
  in_progress: {
    label: 'In Progress',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
  resolved: {
    label: 'Resolved',
    style: {
      color: 'var(--c-done-text)',
      background: 'var(--c-done-bg)',
      borderColor: 'var(--c-done-bd)',
    },
    dotStyle: { background: 'var(--c-done)' },
  },
  snoozed: {
    label: 'Snoozed',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
}

export const taskPriorityConfig: Record<TaskPriority, StatusConfig> = {
  p1: {
    label: 'P1',
    style: {
      color: 'var(--c-declined-text)',
      background: 'var(--c-declined-bg)',
      borderColor: 'var(--c-declined-bd)',
    },
    dotStyle: { background: 'var(--c-declined)' },
  },
  p2: {
    label: 'P2',
    style: {
      color: 'var(--c-overdue-text)',
      background: 'var(--c-overdue-bg)',
      borderColor: 'var(--c-overdue-bd)',
    },
    dotStyle: { background: 'var(--c-overdue)' },
  },
  p3: {
    label: 'P3',
    style: {
      color: 'var(--c-pending-text)',
      background: 'var(--c-pending-bg)',
      borderColor: 'var(--c-pending-bd)',
    },
    dotStyle: { background: 'var(--c-pending)' },
  },
}
