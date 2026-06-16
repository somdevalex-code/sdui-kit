import type { MouseEventHandler, ReactNode } from 'react'

import {
  type ApplicationStatus,
  type DemoApplication,
  getApplicationDisplayName,
  getStatusLabel,
} from '../demoData'

interface ApplicationStat {
  label: string
  value: string | number
  detail?: string
}

const amountFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function ApplicationStats({ stats }: { stats: ApplicationStat[] }) {
  return (
    <section className="stats-grid" aria-label="Application summary">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          {stat.detail && <p>{stat.detail}</p>}
        </div>
      ))}
    </section>
  )
}

export function ApplicationList({ children }: { children?: ReactNode }) {
  return <div className="application-list">{children}</div>
}

export function ApplicationItem({
  application,
  onClick,
}: {
  application: DemoApplication
  onClick?: MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      className="application-item"
      type="button"
      onClick={onClick}
      aria-label={`Open application ${application.id}`}
    >
      <span className="application-item__main">
        <span className="application-item__name">
          {getApplicationDisplayName(application)}
        </span>
        <span className="application-item__meta">
          #{application.id} · {formatDate(application.submittedAt)}
        </span>
      </span>
      <span className="application-item__aside">
        <span className="application-item__amount">
          {formatAmount(application.requestedAmount)}
        </span>
        <StatusBadge status={application.status}>
          {getStatusLabel(application.status)}
        </StatusBadge>
      </span>
    </button>
  )
}

export function ApplicationDetails({
  application,
}: {
  application: DemoApplication
}) {
  const rows = [
    ['Applicant', application.applicantName],
    [
      'Applicant type',
      application.applicantType === 'company' ? 'Company' : 'Person',
    ],
    ['Company', application.companyName ?? 'Not provided'],
    ['Email', application.contactEmail],
    ['Requested amount', formatAmount(application.requestedAmount)],
    ['Submitted', formatDate(application.submittedAt)],
  ]

  return (
    <section className="application-details">
      <div className="application-details__summary">
        <span>Current status</span>
        <StatusBadge status={application.status}>
          {getStatusLabel(application.status)}
        </StatusBadge>
      </div>
      <dl className="detail-grid">
        {rows.map(([label, value]) => (
          <div className="detail-grid__row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function StatusBadge({
  status,
  children,
}: {
  status: ApplicationStatus
  children?: ReactNode
}) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {children ?? getStatusLabel(status)}
    </span>
  )
}

function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}
