import {
  SDUIChildren,
  SDUINode,
  ValidationIssue,
  ValidationResult,
  isRecord,
} from './types'
import {
  SDUIRouteManifest,
  SDUIScreenResponse,
} from './screen'

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

export function validateSDUIScreenResponse(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  validateScreenResponse(input, '$', issues)

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function assertValidSDUIScreenResponse(
  input: unknown,
): asserts input is SDUIScreenResponse {
  const result = validateSDUIScreenResponse(input)

  if (!result.valid) {
    const details = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ')

    throw new Error(`Invalid SDUI screen response: ${details}`)
  }
}

export function validateSDUIRouteManifest(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  validateRouteManifest(input, '$', issues)

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function assertValidSDUIRouteManifest(
  input: unknown,
): asserts input is SDUIRouteManifest {
  const result = validateSDUIRouteManifest(input)

  if (!result.valid) {
    const details = result.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ')

    throw new Error(`Invalid SDUI route manifest: ${details}`)
  }
}

function validateScreenResponse(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'Screen response must be an object' })
    return
  }

  if (typeof input.schemaVersion !== 'string' || !input.schemaVersion.trim()) {
    issues.push({
      path: `${path}.schemaVersion`,
      message: 'schemaVersion must be a non-empty string',
    })
  }

  if ('data' in input && input.data !== undefined && !isRecord(input.data)) {
    issues.push({ path: `${path}.data`, message: 'data must be an object' })
  }

  if ('meta' in input && input.meta !== undefined && !isRecord(input.meta)) {
    issues.push({ path: `${path}.meta`, message: 'meta must be an object' })
  }

  if ('cache' in input && input.cache !== undefined) {
    validateScreenCache(input.cache, `${path}.cache`, issues)
  }

  const hasStatus = 'status' in input && input.status !== undefined

  if (!hasStatus || input.status === 'ok') {
    if (!('node' in input)) {
      issues.push({
        path: `${path}.node`,
        message: 'node is required for render responses',
      })
      return
    }

    validateNodeOrNodeArray(input.node, `${path}.node`, issues)
    return
  }

  if (input.status === 'redirect') {
    if (typeof input.to !== 'string' || !input.to.trim()) {
      issues.push({
        path: `${path}.to`,
        message: 'to must be a non-empty string for redirect responses',
      })
    }

    if ('query' in input && input.query !== undefined && !isRecord(input.query)) {
      issues.push({ path: `${path}.query`, message: 'query must be an object' })
    }

    if (
      'state' in input &&
      input.state !== undefined &&
      !isRecord(input.state)
    ) {
      issues.push({ path: `${path}.state`, message: 'state must be an object' })
    }

    if ('replace' in input && typeof input.replace !== 'boolean') {
      issues.push({
        path: `${path}.replace`,
        message: 'replace must be a boolean',
      })
    }
    return
  }

  if (input.status === 'notFound') {
    if ('message' in input && typeof input.message !== 'string') {
      issues.push({
        path: `${path}.message`,
        message: 'message must be a string',
      })
    }

    if ('node' in input && input.node !== undefined) {
      validateNodeOrNodeArray(input.node, `${path}.node`, issues)
    }
    return
  }

  issues.push({
    path: `${path}.status`,
    message: 'status must be ok, redirect, or notFound when provided',
  })
}

function validateScreenCache(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'cache must be an object' })
    return
  }

  if ('key' in input && typeof input.key !== 'string') {
    issues.push({ path: `${path}.key`, message: 'key must be a string' })
  }

  if ('ttlMs' in input && typeof input.ttlMs !== 'number') {
    issues.push({ path: `${path}.ttlMs`, message: 'ttlMs must be a number' })
  }

  if ('tags' in input && input.tags !== undefined && !Array.isArray(input.tags)) {
    issues.push({ path: `${path}.tags`, message: 'tags must be an array' })
  }
}

function validateRouteManifest(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'Route manifest must be an object' })
    return
  }

  if (typeof input.schemaVersion !== 'string' || !input.schemaVersion.trim()) {
    issues.push({
      path: `${path}.schemaVersion`,
      message: 'schemaVersion must be a non-empty string',
    })
  }

  if (!Array.isArray(input.routes)) {
    issues.push({ path: `${path}.routes`, message: 'routes must be an array' })
    return
  }

  input.routes.forEach((route, index) => {
    validateRouteDefinition(route, `${path}.routes[${index}]`, issues)
  })

  if (
    'metadata' in input &&
    input.metadata !== undefined &&
    !isRecord(input.metadata)
  ) {
    issues.push({
      path: `${path}.metadata`,
      message: 'metadata must be an object',
    })
  }
}

function validateRouteDefinition(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'Route definition must be an object' })
    return
  }

  validateNonEmptyString(input.id, `${path}.id`, 'id', issues)
  validateNonEmptyString(input.path, `${path}.path`, 'path', issues)

  if (
    'screenId' in input &&
    input.screenId !== undefined &&
    (typeof input.screenId !== 'string' || !input.screenId.trim())
  ) {
    issues.push({
      path: `${path}.screenId`,
      message: 'screenId must be a non-empty string',
    })
  }

  if ('title' in input && typeof input.title !== 'string') {
    issues.push({ path: `${path}.title`, message: 'title must be a string' })
  }

  if ('params' in input && input.params !== undefined) {
    validateRouteParams(input.params, `${path}.params`, issues)
  }

  if (
    'metadata' in input &&
    input.metadata !== undefined &&
    !isRecord(input.metadata)
  ) {
    issues.push({
      path: `${path}.metadata`,
      message: 'metadata must be an object',
    })
  }

  if ('children' in input && input.children !== undefined) {
    if (!Array.isArray(input.children)) {
      issues.push({
        path: `${path}.children`,
        message: 'children must be an array',
      })
      return
    }

    input.children.forEach((child, index) => {
      validateRouteDefinition(child, `${path}.children[${index}]`, issues)
    })
  }
}

function validateRouteParams(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'params must be an object' })
    return
  }

  Object.entries(input).forEach(([key, value]) => {
    const paramPath = `${path}.${key}`

    if (!isRecord(value)) {
      issues.push({
        path: paramPath,
        message: 'route params must be definition objects',
      })
      return
    }

    if (
      'type' in value &&
      value.type !== undefined &&
      value.type !== 'string' &&
      value.type !== 'number' &&
      value.type !== 'boolean'
    ) {
      issues.push({
        path: `${paramPath}.type`,
        message: 'type must be string, number, or boolean',
      })
    }

    if ('required' in value && typeof value.required !== 'boolean') {
      issues.push({
        path: `${paramPath}.required`,
        message: 'required must be a boolean',
      })
    }

    if ('description' in value && typeof value.description !== 'string') {
      issues.push({
        path: `${paramPath}.description`,
        message: 'description must be a string',
      })
    }

    if (
      'metadata' in value &&
      value.metadata !== undefined &&
      !isRecord(value.metadata)
    ) {
      issues.push({
        path: `${paramPath}.metadata`,
        message: 'metadata must be an object',
      })
    }
  })
}

function validateNonEmptyString(
  input: unknown,
  path: string,
  fieldName: string,
  issues: ValidationIssue[],
): void {
  if (typeof input !== 'string' || !input.trim()) {
    issues.push({
      path,
      message: `${fieldName} must be a non-empty string`,
    })
  }
}

function validateNodeOrNodeArray(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
  seen: WeakSet<Record<string, unknown>> = new WeakSet(),
): void {
  if (Array.isArray(input)) {
    input.forEach((node, index) =>
      validateNode(node, `${path}[${index}]`, issues, seen),
    )
    return
  }

  validateNode(input, path, issues, seen)
}

function validateNode(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
  seen: WeakSet<Record<string, unknown>> = new WeakSet(),
): void {
  if (!isRecord(input)) {
    issues.push({ path, message: 'Node must be an object' })
    return
  }

  if (seen.has(input)) {
    return
  }
  seen.add(input)

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
    validateChildren(input.children as SDUIChildren, `${path}.children`, issues, seen)
  }

  const props = isRecord(input.props) ? input.props : undefined

  if (props && 'children' in props) {
    validateChildren(
      props.children as SDUIChildren,
      `${path}.props.children`,
      issues,
      seen,
    )
  }

  if (props && 'action' in props) {
    validateAction(props.action, `${path}.props.action`, issues, seen)
  }

  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children' || key === 'action') {
        return
      }

      validateNestedNodes(value, `${path}.props.${key}`, issues, seen)
    })
  }
}

function validateChildren(
  children: SDUIChildren | undefined,
  path: string,
  issues: ValidationIssue[],
  seen: WeakSet<Record<string, unknown>>,
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
      validateNode(child, `${path}[${index}]`, issues, seen)
    })
    return
  }

  validateNode(children, path, issues, seen)
}

function validateNestedNodes(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
  seen: WeakSet<Record<string, unknown>>,
): void {
  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      validateNestedNodes(item, `${path}[${index}]`, issues, seen)
    })
    return
  }

  if (!isRecord(input)) {
    return
  }

  if (isPotentialSDUINode(input)) {
    validateNode(input, path, issues, seen)
    return
  }

  if (seen.has(input)) {
    return
  }
  seen.add(input)

  Object.entries(input).forEach(([key, value]) => {
    validateNestedNodes(value, `${path}.${key}`, issues, seen)
  })
}

function validateAction(
  action: unknown,
  path: string,
  issues: ValidationIssue[],
  seen: WeakSet<Record<string, unknown>> = new WeakSet(),
): void {
  if (!isRecord(action)) {
    issues.push({ path, message: 'action must be an object' })
    return
  }

  if (seen.has(action)) {
    return
  }
  seen.add(action)

  if (typeof action.type !== 'string' || !action.type.trim()) {
    issues.push({ path: `${path}.type`, message: 'type is required' })
  }

  if (
    (action.type === 'request' || action.type === 'REQUEST') &&
    (typeof action.endpoint !== 'string' || !action.endpoint.trim())
  ) {
    issues.push({
      path: `${path}.endpoint`,
      message: 'endpoint is required for request actions',
    })
  }

  if (action.type === 'request' || action.type === 'REQUEST') {
    ;(['success', 'successUi', 'error', 'errorUi'] as const).forEach((key) => {
      if (key in action && action[key] !== undefined) {
        validateAction(action[key], `${path}.${key}`, issues, seen)
      }
    })
  }

  if (action.type === 'sequence' || action.type === 'uiSequence') {
    if (!Array.isArray(action.actions)) {
      issues.push({
        path: `${path}.actions`,
        message: 'actions must be an array for sequence actions',
      })
    } else {
      action.actions.forEach((childAction, index) => {
        validateAction(childAction, `${path}.actions[${index}]`, issues, seen)
      })
    }
  }

  if (action.type === 'UI_ONLY') {
    if (!isRecord(action.ui)) {
      issues.push({
        path: `${path}.ui`,
        message: 'ui is required for UI_ONLY actions',
      })
    } else {
      validateAction(action.ui, `${path}.ui`, issues, seen)
    }
  }

  if (action.type === 'toast') {
    validateNonEmptyString(action.message, `${path}.message`, 'message', issues)
  }

  if (action.type === 'navigate') {
    validateNonEmptyString(action.to, `${path}.to`, 'to', issues)
  }

  if (action.type === 'drawerOpen') {
    validateNonEmptyString(
      action.drawerId,
      `${path}.drawerId`,
      'drawerId',
      issues,
    )
  }

  if (action.type === 'openModal') {
    if (!('children' in action) || action.children === undefined) {
      issues.push({
        path: `${path}.children`,
        message: 'children is required for openModal actions',
      })
    } else {
      validateNodeOrNodeArray(action.children, `${path}.children`, issues, seen)
    }
  }
}

export function collectUnknownComponents(
  node: SDUINode | SDUINode[],
  isKnown: (componentName: string) => boolean,
): string[] {
  const unknown = new Set<string>()
  const seen = new WeakSet<Record<string, unknown>>()

  const visit = (current: Record<string, unknown>): void => {
    if (seen.has(current)) {
      return
    }
    seen.add(current)

    if (
      typeof current.componentName === 'string' &&
      current.componentName.trim() &&
      !isKnown(current.componentName)
    ) {
      unknown.add(current.componentName)
    }

    if ('children' in current) {
      visitNestedComponentNodes(current.children)
    }

    if (isRecord(current.props)) {
      Object.entries(current.props).forEach(([key, value]) => {
        if (key === 'action') {
          visitActionComponentNodes(value)
          return
        }

        visitNestedComponentNodes(value)
      })
    }
  }

  const visitActionComponentNodes = (action: unknown): void => {
    if (!isRecord(action)) {
      return
    }

    if (seen.has(action)) {
      return
    }
    seen.add(action)

    if (action.type === 'request' || action.type === 'REQUEST') {
      ;(['success', 'successUi', 'error', 'errorUi'] as const).forEach((key) => {
        if (key in action && action[key] !== undefined) {
          visitActionComponentNodes(action[key])
        }
      })
      return
    }

    if (action.type === 'sequence' || action.type === 'uiSequence') {
      if (Array.isArray(action.actions)) {
        action.actions.forEach(visitActionComponentNodes)
      }
      return
    }

    if (action.type === 'UI_ONLY') {
      visitActionComponentNodes(action.ui)
      return
    }

    if (action.type === 'openModal') {
      visitNestedComponentNodes(action.children)
    }
  }

  const visitNestedComponentNodes = (input: unknown): void => {
    if (Array.isArray(input)) {
      input.forEach(visitNestedComponentNodes)
      return
    }

    if (!isRecord(input)) {
      return
    }

    if (isPotentialSDUINode(input)) {
      visit(input)
      return
    }

    if (seen.has(input)) {
      return
    }
    seen.add(input)

    Object.values(input).forEach(visitNestedComponentNodes)
  }

  if (Array.isArray(node)) {
    node.forEach(visitNestedComponentNodes)
  } else {
    visitNestedComponentNodes(node)
  }

  return [...unknown]
}

function isPotentialSDUINode(
  input: Record<string, unknown>,
): input is Record<string, unknown> & { componentName?: unknown } {
  return 'componentName' in input
}
