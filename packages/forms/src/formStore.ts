import {
  evaluateCondition,
  type RuntimeContext,
  type SDUIAction,
} from '@sdui-kit/core'

import {
  FieldDefinition,
  FieldState,
  FieldValidation,
  FormDefinition,
  FormErrors,
  FormListener,
  FormState,
  FormSubmitOptions,
  FormSubmitResult,
  FormTouched,
  FormValues,
  ServerErrors,
} from './types.js'

export class FormStore {
  private readonly definition: FormDefinition
  private readonly fields = new Map<string, FieldDefinition>()
  private readonly listeners = new Set<FormListener>()
  private state: FormState

  constructor(definition: FormDefinition) {
    this.definition = definition

    definition.fields.forEach((field) => {
      if (!field.name.trim()) {
        throw new Error('Form field name must be a non-empty string')
      }

      if (this.fields.has(field.name)) {
        throw new Error(`Duplicate form field "${field.name}"`)
      }

      this.fields.set(field.name, field)
    })

    this.state = {
      id: definition.id,
      values: createInitialValues(definition),
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      submitCount: 0,
    }
  }

  getState(): FormState {
    return copyState(this.state)
  }

  subscribe(listener: FormListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())

    return () => {
      this.listeners.delete(listener)
    }
  }

  setValue(name: string, value: unknown): void {
    this.assertField(name)
    const values = { ...this.state.values, [name]: value }
    const touched = { ...this.state.touched, [name]: true }
    const errors = this.definition.validateOnChange
      ? { ...this.state.errors, [name]: this.validateFieldValue(name, value) }
      : this.state.errors

    this.setState({
      ...this.state,
      values,
      touched,
      errors: compactErrors(errors),
      isValid: Object.keys(compactErrors(errors)).length === 0,
    })
  }

  setValues(values: FormValues): void {
    Object.keys(values).forEach((name) => this.assertField(name))

    this.setState({
      ...this.state,
      values: { ...this.state.values, ...values },
    })

    if (this.definition.validateOnChange) {
      this.validate()
    }
  }

  setTouched(name: string, touched = true): void {
    this.assertField(name)
    this.setState({
      ...this.state,
      touched: { ...this.state.touched, [name]: touched },
    })
  }

  getFieldState(name: string, context: RuntimeContext = {}): FieldState {
    const field = this.assertField(name)
    const fieldContext = this.createFieldContext(field, context)
    const requiredByRule = Boolean(field.validation?.required)
    const requiredByExpression = evaluateCondition(
      field.requiredWhen,
      fieldContext,
      false,
    )

    return {
      name,
      value: this.state.values[name],
      errors: this.state.errors[name] ?? [],
      touched: Boolean(this.state.touched[name]),
      visible: evaluateCondition(field.visibleWhen, fieldContext, true),
      disabled: evaluateCondition(field.disabledWhen, fieldContext, false),
      required: requiredByRule || requiredByExpression,
    }
  }

  validate(context: RuntimeContext = {}): boolean {
    const errors: FormErrors = {}

    this.fields.forEach((field, name) => {
      const fieldState = this.getFieldState(name, context)

      if (!fieldState.visible) {
        return
      }

      const fieldErrors = this.validateFieldValue(
        name,
        this.state.values[name],
        context,
      )

      if (fieldErrors.length > 0) {
        errors[name] = fieldErrors
      }
    })

    this.setState({
      ...this.state,
      errors,
      isValid: Object.keys(errors).length === 0,
    })

    return Object.keys(errors).length === 0
  }

  validateField(name: string, context: RuntimeContext = {}): string[] {
    const errors = this.validateFieldValue(name, this.state.values[name], context)
    const nextErrors = compactErrors({ ...this.state.errors, [name]: errors })

    this.setState({
      ...this.state,
      errors: nextErrors,
      isValid: Object.keys(nextErrors).length === 0,
    })

    return errors
  }

  reset(values?: FormValues): void {
    this.setState({
      id: this.definition.id,
      values: values ?? createInitialValues(this.definition),
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      submitCount: 0,
    })
  }

  mapServerErrors(errors: ServerErrors): void {
    const normalized: FormErrors = {}

    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        const name = error.name ?? error.path

        if (!name) {
          return
        }

        normalized[name] = [...(normalized[name] ?? []), error.message]
      })
    } else {
      Object.entries(errors).forEach(([name, message]) => {
        normalized[name] = Array.isArray(message) ? message : [message]
      })
    }

    this.setState({
      ...this.state,
      errors: compactErrors({ ...this.state.errors, ...normalized }),
      isValid: false,
    })
  }

  async submit(options: FormSubmitOptions = {}): Promise<FormSubmitResult> {
    const context = this.createFormContext(options.context)
    const action: SDUIAction | undefined = options.action ?? this.definition.onSubmit

    this.setState({
      ...this.state,
      submitCount: this.state.submitCount + 1,
    })

    if (!this.validate(context)) {
      return {
        ok: false,
        errors: this.getState().errors,
        state: this.getState(),
      }
    }

    if (!action) {
      return {
        ok: true,
        response: undefined,
        state: this.getState(),
      }
    }

    if (!options.actionRunner) {
      throw new Error('actionRunner is required to submit a form action')
    }

    this.setState({ ...this.state, isSubmitting: true })

    try {
      const response = await options.actionRunner.run(
        action,
        this.createFormContext(options.context),
      )

      this.setState({ ...this.state, isSubmitting: false })

      return {
        ok: true,
        response,
        state: this.getState(),
      }
    } catch (error) {
      this.setState({ ...this.state, isSubmitting: false })

      return {
        ok: false,
        error,
        errors: this.getState().errors,
        state: this.getState(),
      }
    }
  }

  private validateFieldValue(
    name: string,
    value: unknown,
    context: RuntimeContext = {},
  ): string[] {
    const field = this.assertField(name)
    const fieldState = this.getFieldState(name, context)

    if (!fieldState.visible) {
      return []
    }

    return validateValue(value, field.validation, fieldState.required)
  }

  private createFieldContext(
    field: FieldDefinition,
    context: RuntimeContext,
  ): RuntimeContext {
    return {
      ...context,
      form: this.getState(),
      field: {
        name: field.name,
        value: this.state.values[field.name],
      },
    }
  }

  private createFormContext(context: RuntimeContext = {}): RuntimeContext {
    return {
      ...context,
      form: this.getState(),
    }
  }

  private assertField(name: string): FieldDefinition {
    const field = this.fields.get(name)

    if (!field) {
      throw new Error(`Unknown form field "${name}"`)
    }

    return field
  }

  private setState(state: FormState): void {
    this.state = copyState(state)
    this.listeners.forEach((listener) => listener(this.getState()))
  }
}

export function createFormStore(definition: FormDefinition): FormStore {
  return new FormStore(definition)
}

function createInitialValues(definition: FormDefinition): FormValues {
  const values: FormValues = { ...(definition.initialValues ?? {}) }

  definition.fields.forEach((field) => {
    if (!(field.name in values) && 'initialValue' in field) {
      values[field.name] = field.initialValue
    }
  })

  return values
}

function validateValue(
  value: unknown,
  validation: FieldValidation | undefined,
  required: boolean,
): string[] {
  const errors: string[] = []

  if (required && isEmpty(value)) {
    errors.push(requiredMessage(validation?.required))
    return errors
  }

  if (isEmpty(value) || !validation) {
    return errors
  }

  const text = String(value)

  if (validation.minLength !== undefined) {
    const rule = toLengthRule(validation.minLength)

    if (text.length < rule.value) {
      errors.push(rule.message ?? `Must be at least ${rule.value} characters`)
    }
  }

  if (validation.maxLength !== undefined) {
    const rule = toLengthRule(validation.maxLength)

    if (text.length > rule.value) {
      errors.push(rule.message ?? `Must be no more than ${rule.value} characters`)
    }
  }

  if (validation.pattern !== undefined) {
    const rule = toPatternRule(validation.pattern)
    const regexp = new RegExp(rule.value)

    if (!regexp.test(text)) {
      errors.push(rule.message ?? 'Invalid format')
    }
  }

  if (validation.min !== undefined) {
    const rule = toNumberRule(validation.min)
    const numberValue = Number(value)

    if (Number.isNaN(numberValue) || numberValue < rule.value) {
      errors.push(rule.message ?? `Must be greater than or equal to ${rule.value}`)
    }
  }

  if (validation.max !== undefined) {
    const rule = toNumberRule(validation.max)
    const numberValue = Number(value)

    if (Number.isNaN(numberValue) || numberValue > rule.value) {
      errors.push(rule.message ?? `Must be less than or equal to ${rule.value}`)
    }
  }

  if (validation.oneOf !== undefined) {
    const rule = Array.isArray(validation.oneOf)
      ? { values: validation.oneOf }
      : validation.oneOf

    if (!rule.values.includes(value)) {
      errors.push(rule.message ?? 'Invalid value')
    }
  }

  return errors
}

function compactErrors(errors: FormErrors): FormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, messages]) => messages.length > 0),
  )
}

function copyState(state: FormState): FormState {
  return {
    ...state,
    values: { ...state.values },
    errors: Object.fromEntries(
      Object.entries(state.errors).map(([key, value]) => [key, [...value]]),
    ),
    touched: { ...state.touched },
  }
}

function isEmpty(value: unknown): boolean {
  return value == null || value === ''
}

function requiredMessage(required: FieldValidation['required']): string {
  return typeof required === 'string' ? required : 'Required'
}

function toLengthRule(rule: number | { value: number; message?: string }) {
  return typeof rule === 'number' ? { value: rule } : rule
}

function toPatternRule(rule: string | { value: string; message?: string }) {
  return typeof rule === 'string' ? { value: rule } : rule
}

function toNumberRule(rule: number | { value: number; message?: string }) {
  return typeof rule === 'number' ? { value: rule } : rule
}
