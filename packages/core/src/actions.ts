import {
  evaluateCondition,
  resolveValue,
  type ExpressionInput,
} from './expressions'
import {
  MaybePromise,
  RuntimeContext,
  SDUINode,
  isRecord,
} from './types'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ConfirmConfig {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export interface ActionBase {
  id?: string
  when?: ExpressionInput
  confirm?: ConfirmConfig
  metadata?: Record<string, unknown>
}

export interface ToastAction extends ActionBase {
  type: 'toast'
  title?: string
  message: string
  status?: 'success' | 'error' | 'warning' | 'info'
}

export interface NavigateAction extends ActionBase {
  type: 'navigate'
  to: string
  query?: Record<string, unknown>
}

export interface GoBackAction extends ActionBase {
  type: 'goBack'
}

export interface RefreshScreenAction extends ActionBase {
  type: 'refreshScreen'
}

export interface OpenModalAction extends ActionBase {
  type: 'openModal'
  centered?: boolean
  children: SDUINode | SDUINode[]
}

export interface CloseModalAction extends ActionBase {
  type: 'closeModal'
}

export interface DrawerOpenAction extends ActionBase {
  type: 'drawerOpen'
  drawerId: string
  payload?: unknown
}

export interface DrawerCloseAction extends ActionBase {
  type: 'drawerClose'
  drawerId?: string
}

export type UIAction =
  | ToastAction
  | NavigateAction
  | GoBackAction
  | RefreshScreenAction
  | OpenModalAction
  | CloseModalAction
  | DrawerOpenAction
  | DrawerCloseAction

export interface RequestAction extends ActionBase {
  type: 'request' | 'REQUEST'
  endpoint: string
  method?: HttpMethod
  headers?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: unknown
  payload?: unknown
  success?: SDUIAction
  successUi?: SDUIAction
  error?: SDUIAction
  errorUi?: SDUIAction
  invalidate?: unknown
}

export interface SequenceAction extends ActionBase {
  type: 'sequence' | 'uiSequence'
  actions: SDUIAction[]
}

export interface UIOnlyAction extends ActionBase {
  type: 'UI_ONLY'
  ui: SDUIAction
}

export type CustomAction = ActionBase & {
  type: string
  [key: string]: unknown
}

export type SDUIAction =
  | UIAction
  | RequestAction
  | SequenceAction
  | UIOnlyAction
  | CustomAction

export interface ResolvedRequest {
  endpoint: string
  method: HttpMethod
  headers?: Record<string, unknown>
  params?: unknown
  body?: unknown
  action: RequestAction
}

export type ActionHandler<TAction extends SDUIAction = SDUIAction> = (
  action: TAction,
  context: RuntimeContext,
  runner: ActionRunner,
) => MaybePromise<unknown>

export interface CacheAdapter {
  invalidate(tags: unknown, context: RuntimeContext): MaybePromise<void>
}

export interface ModalAdapter {
  open(action: OpenModalAction, context: RuntimeContext): MaybePromise<void>
  close(action: CloseModalAction, context: RuntimeContext): MaybePromise<void>
}

export interface DrawerAdapter {
  open(action: DrawerOpenAction, context: RuntimeContext): MaybePromise<void>
  close(action: DrawerCloseAction, context: RuntimeContext): MaybePromise<void>
}

export interface ActionAdapters {
  request?: (
    request: ResolvedRequest,
    context: RuntimeContext,
  ) => MaybePromise<unknown>
  ui?: (action: UIAction, context: RuntimeContext) => MaybePromise<unknown>
  toast?: (action: ToastAction, context: RuntimeContext) => MaybePromise<void>
  navigate?: (action: NavigateAction, context: RuntimeContext) => MaybePromise<void>
  goBack?: (action: GoBackAction, context: RuntimeContext) => MaybePromise<void>
  refreshScreen?: (
    action: RefreshScreenAction,
    context: RuntimeContext,
  ) => MaybePromise<void>
  modal?: ModalAdapter
  drawer?: DrawerAdapter
  cache?: CacheAdapter
  confirm?: (config: ConfirmConfig, context: RuntimeContext) => MaybePromise<boolean>
  custom?: Record<string, ActionHandler>
  onUnhandledAction?: ActionHandler
  onError?: (
    error: unknown,
    action: SDUIAction,
    context: RuntimeContext,
  ) => MaybePromise<void>
}

export class ActionRunner {
  private readonly adapters: ActionAdapters

  constructor(adapters: ActionAdapters = {}) {
    this.adapters = adapters
  }

  async run(
    action: SDUIAction | undefined | null,
    context: RuntimeContext = {},
  ): Promise<unknown> {
    if (!action) {
      return undefined
    }

    if (!evaluateCondition(action.when, context, true)) {
      return undefined
    }

    if (action.confirm) {
      const confirmed = await this.confirm(action.confirm, context)

      if (!confirmed) {
        return undefined
      }

      const actionWithoutConfirm = { ...action, confirm: undefined }
      return this.run(actionWithoutConfirm, context)
    }

    try {
      return await this.runWithoutGuards(action, context)
    } catch (error) {
      await this.adapters.onError?.(error, action, context)
      throw error
    }
  }

  async runMany(
    actions: Array<SDUIAction | undefined | null>,
    context: RuntimeContext = {},
  ): Promise<unknown[]> {
    const results: unknown[] = []

    for (const action of actions) {
      results.push(await this.run(action, context))
    }

    return results
  }

  private async runWithoutGuards(
    action: SDUIAction,
    context: RuntimeContext,
  ): Promise<unknown> {
    if (isUIOnlyAction(action)) {
      return this.run(action.ui, context)
    }

    if (isSequenceAction(action)) {
      return this.runMany(action.actions, context)
    }

    if (isRequestAction(action)) {
      return this.runRequest(action, context)
    }

    if (isUIAction(action)) {
      return this.runUI(action, context)
    }

    const customHandler = this.adapters.custom?.[action.type]

    if (customHandler) {
      return customHandler(action, context, this)
    }

    if (this.adapters.onUnhandledAction) {
      return this.adapters.onUnhandledAction(action, context, this)
    }

    throw new Error(`Unhandled SDUI action "${action.type}"`)
  }

  private async runRequest(
    action: RequestAction,
    context: RuntimeContext,
  ): Promise<unknown> {
    if (!this.adapters.request) {
      throw new Error('A request adapter is required to run request actions')
    }

    const request: ResolvedRequest = {
      endpoint: action.endpoint,
      method: action.method ?? 'POST',
      headers: resolveObject(action.headers, context),
      params: resolveValue(action.params, context),
      body: resolveValue(action.body ?? action.payload ?? {}, context),
      action,
    }

    try {
      const response = await this.adapters.request(request, context)
      const responseContext = { ...context, response }

      if (action.invalidate !== undefined) {
        await this.adapters.cache?.invalidate(
          resolveValue(action.invalidate, responseContext),
          responseContext,
        )
      }

      const successAction = action.success ?? action.successUi

      if (successAction) {
        await this.run(successAction, responseContext)
      }

      return response
    } catch (error) {
      const errorContext = { ...context, error }
      const errorAction = action.error ?? action.errorUi

      if (errorAction) {
        await this.run(errorAction, errorContext)
      }

      throw error
    }
  }

  private async runUI(
    action: UIAction,
    context: RuntimeContext,
  ): Promise<unknown> {
    if (this.adapters.ui) {
      return this.adapters.ui(action, context)
    }

    switch (action.type) {
      case 'toast':
        return this.adapters.toast?.(action, context)
      case 'navigate':
        return this.adapters.navigate?.(action, context)
      case 'goBack':
        return this.adapters.goBack?.(action, context)
      case 'refreshScreen':
        return this.adapters.refreshScreen?.(action, context)
      case 'openModal':
        return this.adapters.modal?.open(action, context)
      case 'closeModal':
        return this.adapters.modal?.close(action, context)
      case 'drawerOpen':
        return this.adapters.drawer?.open(action, context)
      case 'drawerClose':
        return this.adapters.drawer?.close(action, context)
    }
  }

  private async confirm(
    config: ConfirmConfig,
    context: RuntimeContext,
  ): Promise<boolean> {
    if (!this.adapters.confirm) {
      return true
    }

    return this.adapters.confirm(config, context)
  }
}

export function createActionRunner(adapters: ActionAdapters = {}): ActionRunner {
  return new ActionRunner(adapters)
}

export function isUIAction(action: SDUIAction): action is UIAction {
  return [
    'toast',
    'navigate',
    'goBack',
    'refreshScreen',
    'openModal',
    'closeModal',
    'drawerOpen',
    'drawerClose',
  ].includes(action.type)
}

export function isRequestAction(action: SDUIAction): action is RequestAction {
  return (
    (action.type === 'request' || action.type === 'REQUEST') &&
    typeof action.endpoint === 'string'
  )
}

export function isSequenceAction(action: SDUIAction): action is SequenceAction {
  return (
    (action.type === 'sequence' || action.type === 'uiSequence') &&
    Array.isArray(action.actions)
  )
}

export function isUIOnlyAction(action: SDUIAction): action is UIOnlyAction {
  return action.type === 'UI_ONLY' && isRecord(action.ui)
}

function resolveObject(
  value: Record<string, unknown> | undefined,
  context: RuntimeContext,
): Record<string, unknown> | undefined {
  const resolved = resolveValue(value, context)
  return isRecord(resolved) ? resolved : undefined
}
