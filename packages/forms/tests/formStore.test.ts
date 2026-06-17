import { describe, expect, it, vi } from 'vitest'
import { ActionRunner } from '@sdui-kit/core'

import { createFormStore } from '../src'

describe('@sdui-kit/forms', () => {
  it('rejects invalid and duplicate field names', () => {
    expect(() =>
      createFormStore({
        id: 'invalid',
        fields: [{ name: ' ' }],
      }),
    ).toThrow('Form field name must be a non-empty string')

    expect(() =>
      createFormStore({
        id: 'duplicate',
        fields: [{ name: 'email' }, { name: 'email' }],
      }),
    ).toThrow('Duplicate form field "email"')
  })

  it('initializes, resets, and protects copied state', () => {
    const store = createFormStore({
      id: 'profile',
      initialValues: { name: 'Ada' },
      fields: [
        { name: 'name', initialValue: 'Grace' },
        { name: 'email', initialValue: 'ada@example.test' },
      ],
    })

    const state = store.getState()
    state.values.name = 'Mutated'
    state.errors.name = ['Bad']
    state.touched.name = true

    expect(store.getState()).toMatchObject({
      id: 'profile',
      values: {
        name: 'Ada',
        email: 'ada@example.test',
      },
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      submitCount: 0,
    })

    store.setValue('name', 'Katherine')
    store.reset({ name: 'Grace', email: 'grace@example.test' })

    expect(store.getState().values).toEqual({
      name: 'Grace',
      email: 'grace@example.test',
    })
    expect(store.getState().touched).toEqual({})
  })

  it('notifies subscribers until they unsubscribe', () => {
    const store = createFormStore({
      id: 'profile',
      fields: [{ name: 'name' }],
    })
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    store.setValue('name', 'Ada')
    unsubscribe()
    store.setValue('name', 'Grace')

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ values: {} }),
    )
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ values: { name: 'Ada' } }),
    )
  })

  it('sets touched state explicitly', () => {
    const store = createFormStore({
      id: 'profile',
      fields: [{ name: 'email' }],
    })

    store.setTouched('email')
    expect(store.getState().touched).toEqual({ email: true })

    store.setTouched('email', false)
    expect(store.getState().touched).toEqual({ email: false })
    expect(() => store.setTouched('missing')).toThrow(
      'Unknown form field "missing"',
    )
  })

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

  it('skips validation for invisible fields when validating directly', () => {
    const store = createFormStore({
      id: 'application',
      initialValues: { applicantType: 'person' },
      fields: [
        { name: 'applicantType' },
        {
          name: 'companyName',
          visibleWhen: { eq: [{ var: 'form.values.applicantType' }, 'company'] },
          validation: { required: true },
        },
      ],
    })

    expect(store.validateField('companyName')).toEqual([])
    expect(store.getState()).toMatchObject({
      errors: {},
      isValid: true,
    })
  })

  it('validates on change and reports field state expressions', () => {
    const store = createFormStore({
      id: 'application',
      validateOnChange: true,
      initialValues: { applicantType: 'person', email: '' },
      fields: [
        { name: 'applicantType' },
        {
          name: 'email',
          disabledWhen: { eq: [{ var: 'form.values.applicantType' }, 'locked'] },
          requiredWhen: { eq: [{ var: 'form.values.applicantType' }, 'person'] },
          validation: { pattern: { value: '^.+@.+$', message: 'Email is invalid' } },
        },
        {
          name: 'companyName',
          visibleWhen: { eq: [{ var: 'form.values.applicantType' }, 'company'] },
          validation: { required: true },
        },
      ],
    })

    store.setValue('email', 'invalid')

    expect(store.getState().errors.email).toEqual(['Email is invalid'])
    expect(store.getFieldState('email')).toMatchObject({
      touched: true,
      visible: true,
      disabled: false,
      required: true,
    })

    store.setValues({ applicantType: 'locked', email: 'ada@example.test' })

    expect(store.getState().errors).toEqual({})
    expect(store.getFieldState('email')).toMatchObject({
      disabled: true,
      required: false,
    })
  })

  it('validates individual fields and unknown field operations', () => {
    const store = createFormStore({
      id: 'application',
      fields: [
        {
          name: 'name',
          validation: { minLength: { value: 3, message: 'Too short' } },
        },
      ],
    })

    store.setValue('name', 'Ad')

    expect(store.validateField('name')).toEqual(['Too short'])
    expect(store.getState()).toMatchObject({
      errors: { name: ['Too short'] },
      isValid: false,
    })
    expect(() => store.setValue('missing', 'value')).toThrow(
      'Unknown form field "missing"',
    )
    expect(() => store.setValues({ missing: 'value' })).toThrow(
      'Unknown form field "missing"',
    )
  })

  it('supports length, pattern, number, and oneOf validation rules', () => {
    const store = createFormStore({
      id: 'filters',
      initialValues: {
        code: 'ab',
        quantity: '11',
        status: 'archived',
      },
      fields: [
        {
          name: 'code',
          validation: {
            minLength: 3,
            maxLength: { value: 4, message: 'Code is too long' },
            pattern: '^[A-Z]+$',
          },
        },
        {
          name: 'quantity',
          validation: {
            min: { value: 1, message: 'Too small' },
            max: 10,
          },
        },
        {
          name: 'status',
          validation: {
            oneOf: { values: ['draft', 'active'], message: 'Bad status' },
          },
        },
      ],
    })

    expect(store.validate()).toBe(false)
    expect(store.getState().errors).toEqual({
      code: ['Must be at least 3 characters', 'Invalid format'],
      quantity: ['Must be less than or equal to 10'],
      status: ['Bad status'],
    })

    store.setValues({ code: 'ABCDE', quantity: 'not-a-number', status: 'active' })
    store.validate()

    expect(store.getState().errors).toEqual({
      code: ['Code is too long'],
      quantity: ['Too small', 'Must be less than or equal to 10'],
    })
  })

  it('uses default messages for min, max, and oneOf validation failures', () => {
    const store = createFormStore({
      id: 'limits',
      initialValues: {
        minOnly: 0,
        maxOnly: 11,
        status: 'archived',
      },
      fields: [
        { name: 'minOnly', validation: { min: 1 } },
        { name: 'maxOnly', validation: { max: 10 } },
        { name: 'status', validation: { oneOf: ['draft', 'active'] } },
      ],
    })

    expect(store.validate()).toBe(false)
    expect(store.getState().errors).toEqual({
      minOnly: ['Must be greater than or equal to 1'],
      maxOnly: ['Must be less than or equal to 10'],
      status: ['Invalid value'],
    })
  })

  it('compacts cleared field errors after validate-on-change updates', () => {
    const store = createFormStore({
      id: 'profile',
      validateOnChange: true,
      fields: [
        {
          name: 'name',
          validation: { minLength: 3 },
        },
      ],
    })

    store.setValue('name', 'Ad')
    expect(store.getState()).toMatchObject({
      errors: { name: ['Must be at least 3 characters'] },
      isValid: false,
    })

    store.setValue('name', 'Ada')
    expect(store.getState()).toMatchObject({
      errors: {},
      isValid: true,
    })
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

  it('submits successfully without an action', async () => {
    const store = createFormStore({
      id: 'application',
      fields: [{ name: 'name' }],
    })

    const result = await store.submit()

    expect(result).toMatchObject({
      ok: true,
      response: undefined,
      state: {
        submitCount: 1,
      },
    })
  })

  it('requires an action runner when submitting an action', async () => {
    const store = createFormStore({
      id: 'application',
      fields: [{ name: 'name' }],
      onSubmit: {
        type: 'request',
        endpoint: '/api/applications',
      },
    })

    await expect(store.submit()).rejects.toThrow(
      'actionRunner is required to submit a form action',
    )
  })

  it('returns validation errors and failed action results from submit', async () => {
    const failingRunner = new ActionRunner({
      request: async () => {
        throw new Error('Save failed')
      },
    })
    const invalid = createFormStore({
      id: 'invalid',
      fields: [{ name: 'name', validation: { required: true } }],
    })
    const valid = createFormStore({
      id: 'valid',
      initialValues: { name: 'Ada' },
      fields: [{ name: 'name', validation: { required: true } }],
      onSubmit: {
        type: 'request',
        endpoint: '/api/applications',
      },
    })

    await expect(invalid.submit()).resolves.toMatchObject({
      ok: false,
      errors: { name: ['Required'] },
    })

    const result = await valid.submit({ actionRunner: failingRunner })

    expect(result.ok).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.state).toMatchObject({
      isSubmitting: false,
      submitCount: 1,
    })
  })

  it('maps server errors back into fields', () => {
    const store = createFormStore({
      id: 'application',
      fields: [{ name: 'email' }],
    })

    store.mapServerErrors([
      { path: 'email', message: 'Email is already used' },
      { name: 'email', message: 'Email is invalid' },
      { message: 'Skipped missing name' },
    ])
    store.mapServerErrors({
      password: ['Password is weak', 'Password is reused'],
      profile: 'Profile is invalid',
    })

    expect(store.getState().errors).toEqual({
      email: ['Email is already used', 'Email is invalid'],
      password: ['Password is weak', 'Password is reused'],
      profile: ['Profile is invalid'],
    })
  })
})
