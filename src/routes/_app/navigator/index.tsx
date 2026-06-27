import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/navigator/')({
  component: NavigatorWorklist,
})

function NavigatorWorklist() {
  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 0.5rem' }}>
        Worklist
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--c-meta)' }}>
        Risk-stratified member worklist — coming in M2
      </p>
    </div>
  )
}
