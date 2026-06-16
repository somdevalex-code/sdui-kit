import { createReactRegistry } from '@sdui-kit/react'

import {
  ApplicationDetails,
  ApplicationItem,
  ApplicationList,
  ApplicationStats,
  StatusBadge,
} from './components/application'
import { Form, FormActions, SelectField, TextField } from './components/form'
import { Card, PageHeader, Section, Shell, Toolbar } from './components/layout'
import { Button, EmptyState, Heading, Text } from './components/primitives'

export function createExampleRegistry() {
  return createReactRegistry({
    applicationDetails: ApplicationDetails,
    applicationItem: ApplicationItem,
    applicationList: ApplicationList,
    applicationStats: ApplicationStats,
    button: Button,
    card: Card,
    emptyState: EmptyState,
    form: Form,
    formActions: FormActions,
    heading: Heading,
    pageHeader: PageHeader,
    section: Section,
    selectField: SelectField,
    shell: Shell,
    statusBadge: StatusBadge,
    text: Text,
    textField: TextField,
    toolbar: Toolbar,
  })
}
