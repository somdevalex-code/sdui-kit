import {
  ActionRunner,
  ExpressionInput,
  RuntimeContext,
  SDUIAction,
} from '@sdui-kit/core'

export type FormValues = Record<string, unknown>
export type FormErrors = Record<string, string[]>
export type FormTouched = Record<string, boolean>

export interface LengthRule {
  value: number
  message?: string
}

export interface PatternRule {
  value: string
  message?: string
}

export interface NumberRule {
  value: number
  message?: string
}

export interface OneOfRule {
  values: unknown[]
  message?: string
}

export interface FieldValidation {
  required?: boolean | string
  minLength?: number | LengthRule
  maxLength?: number | LengthRule
  pattern?: string | PatternRule
  min?: number | NumberRule
  max?: number | NumberRule
  oneOf?: unknown[] | OneOfRule
}

export interface FieldDefinition {
  name: string
  kind?: string
  label?: string
  initialValue?: unknown
  validation?: FieldValidation
  visibleWhen?: ExpressionInput
  disabledWhen?: ExpressionInput
  requiredWhen?: ExpressionInput
  metadata?: Record<string, unknown>
}

export interface FormDefinition {
  id: string
  fields: FieldDefinition[]
  initialValues?: FormValues
  validateOnChange?: boolean
  onSubmit?: SDUIAction
}

export interface FieldState {
  name: string
  value: unknown
  errors: string[]
  touched: boolean
  visible: boolean
  disabled: boolean
  required: boolean
}

export interface FormState {
  id: string
  values: FormValues
  errors: FormErrors
  touched: FormTouched
  isSubmitting: boolean
  isValid: boolean
  submitCount: number
}

export interface FormSubmitOptions {
  actionRunner?: ActionRunner
  action?: SDUIAction
  context?: RuntimeContext
}

export type FormSubmitResult =
  | {
      ok: true
      response: unknown
      state: FormState
    }
  | {
      ok: false
      error?: unknown
      errors: FormErrors
      state: FormState
    }

export type FormListener = (state: FormState) => void

export type ServerErrors =
  | Record<string, string | string[]>
  | Array<{ name?: string; path?: string; message: string }>
