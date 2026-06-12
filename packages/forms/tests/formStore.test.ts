import { describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '@sdui-kit/core'

import { createFormStore } from '../src'

describe('@sdui-kit/forms', () => {
  it('validates fields and skips hidden fields', () => {
    const store = createFormStore({
      id: 'application',
      initialValues: { applicantType: 'person' },
      fields: [
        {
          name: 'applicantType',
        },
        {
          name: 'name',
          validation: { required: 'Name is required' },
        },
        {
          name: 'companyName',
          visibleWhen: { eq: [{ var: 'form.values.applicantType' }, 'company'] },
          validation: { required: true },
        },
      ],
    })

    expect(store.validate()).toBe(false)
    expect(store.getState().errors).toEqual({ name: ['Name is required'] })

    store.setValue('name', 'Ada')
    expect(store.validate()).toBe(true)

    store.setValue('applicantType', 'company')
    expect(store.validate()).toBe(false)
    expect(store.getState().errors.companyName).toEqual(['Required'])
  })

  it('submits form values through the core action runner', async () => {
    const request = vi.fn(async () => ({ ok: true }))
    const runner = new ActionRunner({ request })
    const store = createFormStore({
      id: 'application',
      initialValues: { name: 'Ada' },
      fields: [{ name: 'name', validation: { required: true } }],
      onSubmit: {
        type: 'request',
        endpoint: '/api/applications',
        body: { $from: 'form.values' },
      },
    })

    const result = await store.submit({ actionRunner: runner })

    expect(result.ok).toBe(true)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { name: 'Ada' },
      }),
      expect.any(Object),
    )
  })

  it('maps server errors back into fields', () => {
    const store = createFormStore({
      id: 'application',
      fields: [{ name: 'email' }],
    })

    store.mapServerErrors([{ path: 'email', message: 'Email is already used' }])

    expect(store.getState().errors.email).toEqual(['Email is already used'])
  })
})
