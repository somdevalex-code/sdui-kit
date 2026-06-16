export type ApplicantType = 'person' | 'company'

export type ApplicationStatus = 'submitted' | 'inReview' | 'approved'

export interface DemoApplication {
  id: string
  applicantType: ApplicantType
  applicantName: string
  companyName?: string
  contactEmail: string
  requestedAmount: number
  status: ApplicationStatus
  submittedAt: string
  summary: string
}

export interface CreateApplicationInput {
  applicantType: ApplicantType
  fullName: string
  companyName?: string
  contactEmail: string
  requestedAmount: number
}

export const seedApplications: DemoApplication[] = [
  {
    id: '101',
    applicantType: 'person',
    applicantName: 'Ada Lovelace',
    contactEmail: 'ada@example.test',
    requestedAmount: 12500,
    status: 'inReview',
    submittedAt: '2026-05-28T09:40:00.000Z',
    summary: 'Working capital request for an independent analytics practice.',
  },
  {
    id: '102',
    applicantType: 'company',
    applicantName: 'Grace Hopper',
    companyName: 'Compiler Works LLC',
    contactEmail: 'grace@compiler.test',
    requestedAmount: 48000,
    status: 'submitted',
    submittedAt: '2026-06-03T15:15:00.000Z',
    summary: 'Equipment financing for a small engineering services company.',
  },
  {
    id: '103',
    applicantType: 'person',
    applicantName: 'Katherine Johnson',
    contactEmail: 'katherine@example.test',
    requestedAmount: 22000,
    status: 'approved',
    submittedAt: '2026-06-11T12:05:00.000Z',
    summary: 'Bridge funding for a contract expansion.',
  },
]

export function createDemoApplicationStore(
  initialApplications: DemoApplication[] = seedApplications,
) {
  let applications = initialApplications.map(copyApplication)
  let nextId = getNextApplicationId(applications)

  return {
    listApplications() {
      return [...applications]
        .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
        .map(copyApplication)
    },

    getApplication(id: string) {
      const application = applications.find((item) => item.id === id)
      return application ? copyApplication(application) : undefined
    },

    createApplication(input: CreateApplicationInput) {
      const application: DemoApplication = {
        id: String(nextId),
        applicantType: input.applicantType,
        applicantName: input.fullName,
        companyName:
          input.applicantType === 'company' ? input.companyName : undefined,
        contactEmail: input.contactEmail,
        requestedAmount: input.requestedAmount,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        summary: createApplicationSummary(input),
      }

      nextId += 1
      applications = [application, ...applications]

      return copyApplication(application)
    },
  }
}

export function readCreateApplicationInput(value: unknown): CreateApplicationInput {
  const input = isRecord(value) ? value : {}
  const applicantType =
    input.applicantType === 'company' ? 'company' : 'person'
  const fullName = readText(input.fullName, 'Unnamed applicant')
  const companyName = readText(input.companyName, '')
  const contactEmail = readText(input.contactEmail, 'applicant@example.test')
  const requestedAmount = readAmount(input.requestedAmount)

  return {
    applicantType,
    fullName,
    companyName: applicantType === 'company' ? companyName : undefined,
    contactEmail,
    requestedAmount,
  }
}

export function getApplicationDisplayName(application: DemoApplication): string {
  return application.companyName ?? application.applicantName
}

export function getStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'inReview':
      return 'In review'
    case 'submitted':
      return 'Submitted'
  }
}

function createApplicationSummary(input: CreateApplicationInput): string {
  if (input.applicantType === 'company' && input.companyName) {
    return `${input.companyName} submitted a financing request through intake.`
  }

  return `${input.fullName} submitted a personal financing request through intake.`
}

function getNextApplicationId(applications: DemoApplication[]): number {
  const highestId = applications.reduce((highest, application) => {
    const numericId = Number(application.id)
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest
  }, 100)

  return highestId + 1
}

function copyApplication(application: DemoApplication): DemoApplication {
  return { ...application }
}

function readText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function readAmount(value: unknown): number {
  const amount =
    typeof value === 'number' ? value : Number(String(value ?? '').trim())

  return Number.isFinite(amount) && amount > 0 ? amount : 10000
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
