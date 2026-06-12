import {
  SDUIChildren,
  SDUINode,
  ValidationIssue,
  ValidationResult,
  isRecord,
  isSDUINode,
} from './types'

export function validateSDUINode(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  validateNode(input, '$', issues)

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function assertValidSDUINode(input: unknown): asserts input is SDUINode {
  const result = validateSDUINode(input)

  if (!result.valid) {
    const details = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ')

    throw new Error(`Invalid SDUI node: ${details}`)
  }
}

function validateNode(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'Node must be an object' })
    return
  }

  if (typeof input.componentName !== 'string' || !input.componentName.trim()) {
    issues.push({
      path: `${path}.componentName`,
      message: 'componentName must be a non-empty string',
    })
  }

  if ('schemaVersion' in input && typeof input.schemaVersion !== 'string') {
    issues.push({
      path: `${path}.schemaVersion`,
      message: 'schemaVersion must be a string when provided',
    })
  }

  if ('id' in input && typeof input.id !== 'string') {
    issues.push({ path: `${path}.id`, message: 'id must be a string' })
  }

  if ('props' in input && input.props !== undefined && !isRecord(input.props)) {
    issues.push({ path: `${path}.props`, message: 'props must be an object' })
  }

  if ('children' in input) {
    validateChildren(input.children as SDUIChildren, `${path}.children`, issues)
  }

  if (isRecord(input.props) && 'children' in input.props) {
    validateChildren(
      input.props.children as SDUIChildren,
      `${path}.props.children`,
      issues,
    )
  }

  if (isRecord(input.props) && 'action' in input.props) {
    validateAction(input.props.action, `${path}.props.action`, issues)
  }
}

function validateChildren(
  children: SDUIChildren | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (
    children == null ||
    typeof children === 'string' ||
    typeof children === 'number' ||
    typeof children === 'boolean'
  ) {
    return
  }

  if (Array.isArray(children)) {
    children.forEach((child, index) => {
      validateNode(child, `${path}[${index}]`, issues)
    })
    return
  }

  validateNode(children, path, issues)
}

function validateAction(
  action: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(action)) {
    issues.push({ path, message: 'action must be an object' })
    return
  }

  if (typeof action.type !== 'string' || !action.type.trim()) {
    issues.push({ path: `${path}.type`, message: 'type is required' })
  }

  if (
    (action.type === 'request' || action.type === 'REQUEST') &&
    typeof action.endpoint !== 'string'
  ) {
    issues.push({
      path: `${path}.endpoint`,
      message: 'endpoint is required for request actions',
    })
  }

  if (
    (action.type === 'sequence' || action.type === 'uiSequence') &&
    !Array.isArray(action.actions)
  ) {
    issues.push({
      path: `${path}.actions`,
      message: 'actions must be an array for sequence actions',
    })
  }

  if (action.type === 'UI_ONLY' && !isRecord(action.ui)) {
    issues.push({
      path: `${path}.ui`,
      message: 'ui is required for UI_ONLY actions',
    })
  }
}

export function collectUnknownComponents(
  node: SDUINode | SDUINode[],
  isKnown: (componentName: string) => boolean,
): string[] {
  const unknown = new Set<string>()
  const visit = (current: SDUINode): void => {
    if (!isKnown(current.componentName)) {
      unknown.add(current.componentName)
    }

    const children = current.props?.children ?? current.children

    if (Array.isArray(children)) {
      children.filter(isSDUINode).forEach(visit)
      return
    }

    if (isSDUINode(children)) {
      visit(children)
    }
  }

  if (Array.isArray(node)) {
    node.forEach(visit)
  } else {
    visit(node)
  }

  return [...unknown]
}
