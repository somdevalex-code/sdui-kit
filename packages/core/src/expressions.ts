import { RuntimeContext, isRecord } from './types'

export type ExpressionInput = unknown

export type Expression =
  | { var: string; fallback?: unknown }
  | { eq: [ExpressionInput, ExpressionInput] }
  | { neq: [ExpressionInput, ExpressionInput] }
  | { gt: [ExpressionInput, ExpressionInput] }
  | { gte: [ExpressionInput, ExpressionInput] }
  | { lt: [ExpressionInput, ExpressionInput] }
  | { lte: [ExpressionInput, ExpressionInput] }
  | { and: ExpressionInput[] }
  | { or: ExpressionInput[] }
  | { not: ExpressionInput }
  | { includes: [ExpressionInput, ExpressionInput] }
  | { empty: ExpressionInput }
  | { notEmpty: ExpressionInput }

export function resolveExpression(
  input: ExpressionInput,
  context: RuntimeContext = {},
): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => resolveExpression(item, context))
  }

  if (!isRecord(input)) {
    return input
  }

  if (typeof input.var === 'string') {
    const value = getPath(context, input.var)
    return value === undefined ? input.fallback : value
  }

  if (isOperator(input, 'eq')) {
    return resolveExpression(input.eq[0], context) === resolveExpression(input.eq[1], context)
  }

  if (isOperator(input, 'neq')) {
    return resolveExpression(input.neq[0], context) !== resolveExpression(input.neq[1], context)
  }

  if (isOperator(input, 'gt')) {
    return compare(input.gt, context, (left, right) => left > right)
  }

  if (isOperator(input, 'gte')) {
    return compare(input.gte, context, (left, right) => left >= right)
  }

  if (isOperator(input, 'lt')) {
    return compare(input.lt, context, (left, right) => left < right)
  }

  if (isOperator(input, 'lte')) {
    return compare(input.lte, context, (left, right) => left <= right)
  }

  if (Array.isArray(input.and)) {
    return input.and.every((item) => toBoolean(resolveExpression(item, context)))
  }

  if (Array.isArray(input.or)) {
    return input.or.some((item) => toBoolean(resolveExpression(item, context)))
  }

  if ('not' in input) {
    return !toBoolean(resolveExpression(input.not, context))
  }

  if (isOperator(input, 'includes')) {
    const collection = resolveExpression(input.includes[0], context)
    const value = resolveExpression(input.includes[1], context)

    if (typeof collection === 'string') {
      return collection.includes(String(value))
    }

    if (Array.isArray(collection)) {
      return collection.includes(value)
    }

    return false
  }

  if ('empty' in input) {
    return isEmpty(resolveExpression(input.empty, context))
  }

  if ('notEmpty' in input) {
    return !isEmpty(resolveExpression(input.notEmpty, context))
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      resolveExpression(value, context),
    ]),
  )
}

export function evaluateCondition(
  condition: ExpressionInput | undefined,
  context: RuntimeContext = {},
  defaultValue = true,
): boolean {
  if (condition === undefined) {
    return defaultValue
  }

  return toBoolean(resolveExpression(condition, context))
}

export function resolveValue(value: unknown, context: RuntimeContext = {}): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context))
  }

  if (!isRecord(value)) {
    return value
  }

  if (typeof value.$from === 'string') {
    return getPath(context, value.$from)
  }

  if ('$expr' in value) {
    return resolveExpression(value.$expr, context)
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      resolveValue(nested, context),
    ]),
  )
}

export function getPath(source: unknown, path: string): unknown {
  if (!path) {
    return source
  }

  const segments = path
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)

  let current = source

  for (const segment of segments) {
    if (current == null) {
      return undefined
    }

    if (Array.isArray(current)) {
      current = current[Number(segment)]
      continue
    }

    if (isRecord(current)) {
      current = current[segment]
      continue
    }

    return undefined
  }

  return current
}

function isOperator<K extends string>(
  input: Record<string, unknown>,
  key: K,
): input is Record<K, [ExpressionInput, ExpressionInput]> {
  return Array.isArray(input[key]) && input[key].length === 2
}

function compare(
  operands: [ExpressionInput, ExpressionInput],
  context: RuntimeContext,
  predicate: (left: number, right: number) => boolean,
): boolean {
  const left = Number(resolveExpression(operands[0], context))
  const right = Number(resolveExpression(operands[1], context))

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return false
  }

  return predicate(left, right)
}

function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0
  }

  if (isRecord(value)) {
    return Object.keys(value).length === 0
  }

  return false
}

function toBoolean(value: unknown): boolean {
  return Boolean(value)
}
