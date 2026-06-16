import type { ReactNode } from 'react'

export function Shell({ children }: { children?: ReactNode }) {
  return <main className="app-shell">{children}</main>
}

export function Toolbar({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="toolbar">
      <div className="toolbar__title">{title}</div>
      {children && <div className="toolbar__actions">{children}</div>}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header__content">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className="section">
      {(title || description) && (
        <div className="section__header">
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Card({ children }: { children?: ReactNode }) {
  return <div className="card">{children}</div>
}
