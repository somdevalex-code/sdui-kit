import { useMemo, useState } from 'react'
import { ActionRunner, type SDUINode } from '@sdui-kit/core'
import { SDUIProvider, SDUIRenderer } from '@sdui-kit/react'

import { createExampleRegistry } from './components'

const screen: SDUINode = {
  schemaVersion: '1.0',
  componentName: 'shell',
  props: {
    children: [
      {
        componentName: 'heading',
        props: {
          children: 'Application intake',
        },
      },
      {
        componentName: 'text',
        props: {
          tone: 'muted',
          children:
            'This screen is described by JSON. The project supplies the components and adapters.',
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
            },
            fields: [
              {
                name: 'applicantType',
                validation: { required: true },
              },
              {
                name: 'fullName',
                validation: { required: 'Full name is required' },
              },
              {
                name: 'companyName',
                visibleWhen: {
                  eq: [{ var: 'form.values.applicantType' }, 'company'],
                },
                validation: { required: 'Company name is required' },
              },
            ],
            onSubmit: {
              type: 'request',
              endpoint: '/api/applications',
              method: 'POST',
              body: { $from: 'form.values' },
              success: {
                type: 'toast',
                message: 'Application submitted',
                status: 'success',
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
              },
            },
            {
              componentName: 'textField',
              props: {
                name: 'companyName',
                label: 'Company name',
                placeholder: 'Analytical Engines Ltd',
              },
            },
            {
              componentName: 'button',
              props: {
                kind: 'submit',
                children: 'Submit application',
              },
            },
          ],
        },
      },
    ],
  },
}

export function App() {
  const [messages, setMessages] = useState<string[]>([])
  const registry = useMemo(() => createExampleRegistry(), [])
  const actionRunner = useMemo(
    () =>
      new ActionRunner({
        request: async (request) => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          console.info('SDUI request adapter received:', request)
          return { ok: true }
        },
        toast: (action) => {
          setMessages((current) => [action.message, ...current].slice(0, 3))
        },
      }),
    [],
  )

  return (
    <SDUIProvider registry={registry} actionRunner={actionRunner}>
      <SDUIRenderer node={screen} />
      <div className="toasts" aria-live="polite">
        {messages.map((message, index) => (
          <div className="toast" key={`${message}-${index}`}>
            {message}
          </div>
        ))}
      </div>
    </SDUIProvider>
  )
}
