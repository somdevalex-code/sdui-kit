import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createFormStore,
  type FieldState,
  type FormDefinition,
  type FormStore,
} from '@sdui-kit/forms'
import { createReactRegistry, useSDUI } from '@sdui-kit/react'

const FormContext = createContext<FormStore | null>(null)

type Option = {
  label: string
  value: string
}

export function createExampleRegistry() {
  return createReactRegistry({
    shell: Shell,
    heading: Heading,
    text: Text,
    form: Form,
    textField: TextField,
    selectField: SelectField,
    button: Button,
  })
}

function Shell({ children }: { children?: React.ReactNode }) {
  return <main className="shell">{children}</main>
}

function Heading({ children }: { children?: React.ReactNode }) {
  return <h1>{children}</h1>
}

function Text({
  children,
  tone,
}: {
  children?: React.ReactNode
  tone?: 'muted'
}) {
  return <p className={tone === 'muted' ? 'muted' : undefined}>{children}</p>
}

function Form({
  definition,
  children,
}: {
  definition: FormDefinition
  children?: React.ReactNode
}) {
  const { actionRunner } = useSDUI()
  const store = useMemo(() => createFormStore(definition), [definition])
  const [state, setState] = useState(store.getState())

  useEffect(() => store.subscribe(setState), [store])

  return (
    <FormContext.Provider value={store}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          void store.submit({ actionRunner })
        }}
      >
        {children}
        {!state.isValid && (
          <div className="form-error">Please fix the highlighted fields.</div>
        )}
      </form>
    </FormContext.Provider>
  )
}

function TextField({
  name,
  label,
  placeholder,
}: {
  name: string
  label: string
  placeholder?: string
}) {
  const { store, field } = useField(name)

  if (!field.visible) {
    return null
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={String(field.value ?? '')}
        placeholder={placeholder}
        disabled={field.disabled}
        aria-invalid={field.errors.length > 0}
        onChange={(event) => store.setValue(name, event.target.value)}
      />
      <FieldErrors field={field} />
    </label>
  )
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Option[]
}) {
  const { store, field } = useField(name)

  if (!field.visible) {
    return null
  }

  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={String(field.value ?? '')}
        disabled={field.disabled}
        onChange={(event) => store.setValue(name, event.target.value)}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldErrors field={field} />
    </label>
  )
}

function Button({
  children,
  kind,
  onClick,
}: {
  children?: React.ReactNode
  kind?: 'submit' | 'button'
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <button className="button" type={kind ?? 'button'} onClick={onClick}>
      {children}
    </button>
  )
}

function FieldErrors({ field }: { field: FieldState }) {
  if (field.errors.length === 0) {
    return null
  }

  return <span className="field-error">{field.errors[0]}</span>
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
