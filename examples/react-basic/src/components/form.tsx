import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import {
  createFormStore,
  type FieldState,
  type FormDefinition,
  type FormState,
  type FormStore,
} from '@sdui-kit/forms'
import { useSDUI } from '@sdui-kit/react'

const FormContext = createContext<FormStore | null>(null)

type Option = {
  label: string
  value: string
}

export function Form({
  definition,
  children,
}: {
  definition: FormDefinition
  children?: ReactNode
}) {
  const { actionRunner } = useSDUI()
  const store = useMemo(() => createFormStore(definition), [definition])
  const [state, setState] = useState(store.getState())
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => store.subscribe(setState), [store])

  return (
    <FormContext.Provider value={store}>
      <form
        className="form"
        aria-busy={state.isSubmitting}
        onSubmit={(event) => {
          event.preventDefault()

          if (state.isSubmitting) {
            return
          }

          void store.submit({ actionRunner }).then((result) => {
            if (!result.ok) {
              setSubmitError(
                result.error
                  ? 'The request failed before the application was created.'
                  : null,
              )
            }
          })
        }}
      >
        <div className="form__fields">{children}</div>
        {state.submitCount > 0 && !state.isValid && (
          <div className="form-error">Please fix the highlighted fields.</div>
        )}
        {submitError && <div className="form-error">{submitError}</div>}
      </form>
    </FormContext.Provider>
  )
}

export function FormActions({ children }: { children?: ReactNode }) {
  return <div className="form-actions">{children}</div>
}

export function TextField({
  name,
  label,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  name: string
  label: string
  placeholder?: string
  type?: InputHTMLAttributes<HTMLInputElement>['type']
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
}) {
  const { store, state, field } = useField(name)
  const errorId = `${state.id}-${name}-error`

  if (!field.visible) {
    return null
  }

  return (
    <label className="field">
      <span>
        {label}
        {field.required && <span aria-hidden="true"> *</span>}
      </span>
      <input
        value={String(field.value ?? '')}
        placeholder={placeholder}
        disabled={field.disabled || state.isSubmitting}
        aria-invalid={field.errors.length > 0}
        aria-describedby={field.errors.length > 0 ? errorId : undefined}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onBlur={() => validateTouchedField(store, name)}
        onChange={(event) => updateFieldValue(store, state, name, event.target.value)}
      />
      <FieldErrors field={field} formState={state} id={errorId} />
    </label>
  )
}

export function SelectField({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Option[]
}) {
  const { store, state, field } = useField(name)
  const errorId = `${state.id}-${name}-error`

  if (!field.visible) {
    return null
  }

  return (
    <label className="field">
      <span>
        {label}
        {field.required && <span aria-hidden="true"> *</span>}
      </span>
      <select
        value={String(field.value ?? '')}
        disabled={field.disabled || state.isSubmitting}
        aria-invalid={field.errors.length > 0}
        aria-describedby={field.errors.length > 0 ? errorId : undefined}
        onBlur={() => validateTouchedField(store, name)}
        onChange={(event) => updateFieldValue(store, state, name, event.target.value)}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldErrors field={field} formState={state} id={errorId} />
    </label>
  )
}

function FieldErrors({
  field,
  formState,
  id,
}: {
  field: FieldState
  formState: FormState
  id: string
}) {
  if (
    field.errors.length === 0 ||
    (!field.touched && formState.submitCount === 0)
  ) {
    return null
  }

  return (
    <span className="field-error" id={id}>
      {field.errors[0]}
    </span>
  )
}

function useField(name: string) {
  const store = useContext(FormContext)

  if (!store) {
    throw new Error('Field components must be rendered inside the form component')
  }

  const [state, setState] = useState(store.getState())

  useEffect(() => store.subscribe(setState), [store])

  return {
    store,
    state,
    field: store.getFieldState(name),
  }
}

function validateTouchedField(store: FormStore, name: string) {
  store.setTouched(name)
  store.validateField(name)
}

function updateFieldValue(
  store: FormStore,
  state: FormState,
  name: string,
  value: string,
) {
  store.setValue(name, value)

  if (state.submitCount > 0) {
    store.validate()
  }
}
