import { describe, expect, it, vi } from 'vitest'

import {
  ActionRunner,
  evaluateCondition,
  resolveExpression,
  validateSDUINode,
} from '../src'

describe('@sdui-kit/core', () => {
  it('resolves expressions against runtime context', () => {
    expect(
      resolveExpression(
        { and: [{ eq: [{ var: 'form.values.type' }, 'company'] }, { notEmpty: { var: 'form.values.name' } }] },
        { form: { values: { type: 'company', name: 'Acme' } } },
      ),
    ).toBe(true)

    expect(
      evaluateCondition(
        { includes: [{ var: 'user.roles' }, 'admin'] },
        { user: { roles: ['admin'] } },
      ),
    ).toBe(true)
  })

  it('runs request actions with resolved payload and success action', async () => {
    const toasts: string[] = []
    const request = vi.fn(async () => ({ id: 'created' }))
    const runner = new ActionRunner({
      request,
      toast: (action) => {
        toasts.push(action.message)
      },
    })

    const response = await runner.run(
      {
        type: 'request',
        endpoint: '/api/applications',
        method: 'POST',
        body: { $from: 'form.values' },
        success: {
          type: 'toast',
          message: 'Created',
          status: 'success',
        },
      },
      { form: { values: { name: 'Ada' } } },
    )

    expect(response).toEqual({ id: 'created' })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/applications',
        method: 'POST',
        body: { name: 'Ada' },
      }),
      expect.any(Object),
    )
    expect(toasts).toEqual(['Created'])
  })

  it('validates SDUI nodes', () => {
    expect(
      validateSDUINode({
        schemaVersion: '1.0',
        componentName: 'button',
        props: {
          children: 'Submit',
          action: { type: 'toast', message: 'Done' },
        },
      }).valid,
    ).toBe(true)

    expect(validateSDUINode({ props: {} }).issues).toContainEqual({
      path: '$.componentName',
      message: 'componentName must be a non-empty string',
    })
  })
})
