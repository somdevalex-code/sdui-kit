import type { SDUIScreenResponse } from '@sdui-kit/core'

import {
  type DemoApplication,
  getApplicationDisplayName,
  getStatusLabel,
} from './demoData'

const schemaVersion = '1.0'

export function createApplicationsListScreen(
  applications: DemoApplication[],
): SDUIScreenResponse {
  return {
    schemaVersion,
    cache: {
      key: 'screen:/applications',
      tags: ['Applications'],
    },
    data: {
      applicationCount: applications.length,
    },
    node: {
      schemaVersion,
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'toolbar',
            props: {
              title: 'SDUI Kit Reference',
              children: [
                {
                  componentName: 'button',
                  props: {
                    variant: 'secondary',
                    children: 'Refresh',
                    action: { type: 'refreshScreen' },
                  },
                },
              ],
            },
          },
          {
            componentName: 'pageHeader',
            props: {
              eyebrow: 'Applications',
              title: 'Application review',
              description:
                'Review submitted financing requests and open a routed detail screen.',
              children: [
                {
                  componentName: 'button',
                  props: {
                    children: 'New application',
                    action: {
                      type: 'navigate',
                      to: '/applications/new',
                    },
                  },
                },
              ],
            },
          },
          {
            componentName: 'applicationStats',
            props: {
              stats: createApplicationStats(applications),
            },
          },
          {
            componentName: 'section',
            props: {
              title: 'Recent applications',
              description: 'Newest submissions appear first.',
              children:
                applications.length > 0
                  ? [
                      {
                        componentName: 'applicationList',
                        props: {
                          children: applications.map((application) => ({
                            componentName: 'applicationItem',
                            props: {
                              application,
                              action: {
                                type: 'navigate',
                                to: `/applications/${application.id}`,
                              },
                            },
                          })),
                        },
                      },
                    ]
                  : [
                      {
                        componentName: 'emptyState',
                        props: {
                          title: 'No applications',
                          description: 'Create the first intake request.',
                        },
                      },
                    ],
            },
          },
        ],
      },
    },
  }
}

export function createApplicationDetailsScreen(
  id: string,
  application: DemoApplication | undefined,
): SDUIScreenResponse {
  if (!application) {
    return createApplicationNotFoundScreen(id)
  }

  return {
    schemaVersion,
    cache: {
      key: `screen:/applications/${application.id}`,
      tags: [{ type: 'Application', id: application.id }],
    },
    data: {
      applicationId: application.id,
      status: application.status,
    },
    node: {
      schemaVersion,
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'toolbar',
            props: {
              title: 'SDUI Kit Reference',
              children: [
                {
                  componentName: 'button',
                  props: {
                    variant: 'secondary',
                    children: 'Refresh',
                    action: { type: 'refreshScreen' },
                  },
                },
              ],
            },
          },
          {
            componentName: 'pageHeader',
            props: {
              eyebrow: `Application ${application.id}`,
              title: getApplicationDisplayName(application),
              description: application.summary,
              children: [
                {
                  componentName: 'statusBadge',
                  props: {
                    status: application.status,
                    children: getStatusLabel(application.status),
                  },
                },
                {
                  componentName: 'button',
                  props: {
                    variant: 'secondary',
                    children: 'Back',
                    action: {
                      type: 'navigate',
                      to: '/applications',
                    },
                  },
                },
              ],
            },
          },
          {
            componentName: 'applicationDetails',
            props: {
              application,
            },
          },
        ],
      },
    },
  }
}

export function createApplicationFormScreen(): SDUIScreenResponse {
  return {
    schemaVersion,
    cache: {
      key: 'screen:/applications/new',
      tags: ['Applications'],
    },
    node: {
      schemaVersion,
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'toolbar',
            props: {
              title: 'SDUI Kit Reference',
              children: [
                {
                  componentName: 'button',
                  props: {
                    variant: 'secondary',
                    children: 'Back',
                    action: {
                      type: 'navigate',
                      to: '/applications',
                    },
                  },
                },
              ],
            },
          },
          {
            componentName: 'pageHeader',
            props: {
              eyebrow: 'New application',
              title: 'Intake form',
              description:
                'Collect the applicant details required for an initial review.',
            },
          },
          {
            componentName: 'form',
            props: {
              definition: {
                id: 'applicationForm',
                initialValues: {
                  applicantType: 'person',
                  fullName: '',
                  companyName: '',
                  contactEmail: '',
                  requestedAmount: '',
                },
                fields: [
                  {
                    name: 'applicantType',
                    validation: { required: true },
                  },
                  {
                    name: 'fullName',
                    validation: {
                      required: 'Full name is required',
                      minLength: {
                        value: 3,
                        message: 'Enter at least 3 characters',
                      },
                    },
                  },
                  {
                    name: 'companyName',
                    visibleWhen: {
                      eq: [{ var: 'form.values.applicantType' }, 'company'],
                    },
                    validation: { required: 'Company name is required' },
                  },
                  {
                    name: 'contactEmail',
                    validation: {
                      required: 'Email is required',
                      pattern: {
                        value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                        message: 'Enter a valid email',
                      },
                    },
                  },
                  {
                    name: 'requestedAmount',
                    validation: {
                      required: 'Requested amount is required',
                      min: {
                        value: 1,
                        message: 'Amount must be greater than 0',
                      },
                    },
                  },
                ],
                onSubmit: {
                  type: 'request',
                  endpoint: '/api/applications',
                  method: 'POST',
                  body: { $from: 'form.values' },
                  invalidate: ['Applications'],
                  success: {
                    type: 'sequence',
                    actions: [
                      {
                        type: 'toast',
                        message: 'Application submitted',
                        status: 'success',
                      },
                      {
                        type: 'navigateToCreatedApplication',
                      },
                    ],
                  },
                  error: {
                    type: 'toast',
                    message: 'Application could not be submitted',
                    status: 'error',
                  },
                },
              },
              children: [
                {
                  componentName: 'selectField',
                  props: {
                    name: 'applicantType',
                    label: 'Applicant type',
                    options: [
                      { label: 'Person', value: 'person' },
                      { label: 'Company', value: 'company' },
                    ],
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'fullName',
                    label: 'Full name',
                    placeholder: 'Ada Lovelace',
                    autoComplete: 'name',
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'companyName',
                    label: 'Company name',
                    placeholder: 'Analytical Engines Ltd',
                    autoComplete: 'organization',
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'contactEmail',
                    label: 'Email',
                    placeholder: 'ada@example.test',
                    type: 'email',
                    autoComplete: 'email',
                  },
                },
                {
                  componentName: 'textField',
                  props: {
                    name: 'requestedAmount',
                    label: 'Requested amount',
                    placeholder: '25000',
                    inputMode: 'decimal',
                  },
                },
                {
                  componentName: 'formActions',
                  props: {
                    children: [
                      {
                        componentName: 'button',
                        props: {
                          kind: 'submit',
                          children: 'Submit application',
                        },
                      },
                      {
                        componentName: 'button',
                        props: {
                          variant: 'secondary',
                          children: 'Cancel',
                          action: {
                            type: 'navigate',
                            to: '/applications',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  }
}

export function createRouteNotFoundScreen(path: string): SDUIScreenResponse {
  return {
    schemaVersion,
    status: 'notFound',
    message: `No example route for ${path}`,
    node: {
      schemaVersion,
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'toolbar',
            props: {
              title: 'SDUI Kit Reference',
            },
          },
          {
            componentName: 'emptyState',
            props: {
              title: 'Route not found',
              description: `The fake backend has no screen for ${path}.`,
              children: [
                {
                  componentName: 'button',
                  props: {
                    children: 'Back to applications',
                    action: {
                      type: 'navigate',
                      to: '/applications',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  }
}

function createApplicationNotFoundScreen(id: string): SDUIScreenResponse {
  return {
    schemaVersion,
    status: 'notFound',
    message: `Application ${id} was not found`,
    node: {
      schemaVersion,
      componentName: 'shell',
      props: {
        children: [
          {
            componentName: 'toolbar',
            props: {
              title: 'SDUI Kit Reference',
              children: [
                {
                  componentName: 'button',
                  props: {
                    variant: 'secondary',
                    children: 'Refresh',
                    action: { type: 'refreshScreen' },
                  },
                },
              ],
            },
          },
          {
            componentName: 'emptyState',
            props: {
              title: 'Application not found',
              description: `There is no application with id ${id}.`,
              children: [
                {
                  componentName: 'button',
                  props: {
                    children: 'Back to applications',
                    action: {
                      type: 'navigate',
                      to: '/applications',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  }
}

function createApplicationStats(applications: DemoApplication[]) {
  const submitted = applications.filter(
    (application) => application.status === 'submitted',
  ).length
  const inReview = applications.filter(
    (application) => application.status === 'inReview',
  ).length
  const approved = applications.filter(
    (application) => application.status === 'approved',
  ).length

  return [
    {
      label: 'Total',
      value: applications.length,
      detail: 'All requests',
    },
    {
      label: 'Submitted',
      value: submitted,
      detail: 'Awaiting review',
    },
    {
      label: 'In review',
      value: inReview,
      detail: 'Active checks',
    },
    {
      label: 'Approved',
      value: approved,
      detail: 'Ready for funding',
    },
  ]
}
