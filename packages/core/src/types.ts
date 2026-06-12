export type JsonPrimitive = string | number | boolean | null

export type JsonObject = {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export type MaybePromise<T> = T | Promise<T>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type InvalidationTag =
  | string
  | {
      type: string
      id?: string | number
    }

export type SDUIChildren =
  | string
  | number
  | boolean
  | null
  | SDUINode
  | SDUINode[]

export interface SDUINode {
  schemaVersion?: string
  id?: string
  componentName: string
  props?: Record<string, unknown>
  children?: SDUIChildren
  metadata?: Record<string, unknown>
}

export interface RuntimeContext {
  data?: Record<string, unknown>
  state?: Record<string, unknown>
  event?: unknown
  response?: unknown
  [key: string]: unknown
}

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSDUINode(value: unknown): value is SDUINode {
  return isRecord(value) && typeof value.componentName === 'string'
}
