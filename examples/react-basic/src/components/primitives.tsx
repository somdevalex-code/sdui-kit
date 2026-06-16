import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export function Heading({
  level = 2,
  children,
}: {
  level?: 1 | 2 | 3
  children?: ReactNode
}) {
  const Component = `h${level}` as const

  return <Component>{children}</Component>
}

export function Text({
  children,
  tone,
}: {
  children?: ReactNode
  tone?: 'default' | 'muted' | 'danger'
}) {
  return <p className={tone ? `text text--${tone}` : 'text'}>{children}</p>
}

export function Button({
  children,
  kind = 'button',
  variant = 'primary',
  onClick,
  disabled,
}: {
  children?: ReactNode
  kind?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  variant?: ButtonVariant
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  disabled?: boolean
}) {
  return (
    <button
      className={`button button--${variant}`}
      type={kind}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__mark" aria-hidden="true" />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading screen' }: { label?: string }) {
  return (
    <main className="app-shell app-shell--fallback">
      <div className="loading-state" role="status">
        <span className="loading-state__spinner" aria-hidden="true" />
        {label}
      </div>
    </main>
  )
}
