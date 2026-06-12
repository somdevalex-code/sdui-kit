export interface ComponentRegistration<TComponent> {
  component: TComponent
  metadata?: Record<string, unknown>
}

export type ComponentRegistryInput<TComponent> = Record<
  string,
  TComponent | ComponentRegistration<TComponent>
>

export class ComponentRegistry<TComponent> {
  private readonly components = new Map<
    string,
    ComponentRegistration<TComponent>
  >()

  constructor(entries?: ComponentRegistryInput<TComponent>) {
    if (entries) {
      Object.entries(entries).forEach(([name, registration]) => {
        if (isRegistration(registration)) {
          this.register(name, registration.component, registration.metadata)
          return
        }

        this.register(name, registration)
      })
    }
  }

  register(
    name: string,
    component: TComponent,
    metadata?: Record<string, unknown>,
  ): this {
    assertComponentName(name)
    this.components.set(name, { component, metadata })
    return this
  }

  get(name: string): ComponentRegistration<TComponent> | undefined {
    return this.components.get(name)
  }

  require(name: string): ComponentRegistration<TComponent> {
    const registration = this.get(name)

    if (!registration) {
      throw new Error(`SDUI component "${name}" is not registered`)
    }

    return registration
  }

  has(name: string): boolean {
    return this.components.has(name)
  }

  entries(): Array<[string, ComponentRegistration<TComponent>]> {
    return [...this.components.entries()]
  }

  merge(registry: ComponentRegistry<TComponent>): this {
    registry.entries().forEach(([name, registration]) => {
      this.register(name, registration.component, registration.metadata)
    })

    return this
  }
}

export function createRegistry<TComponent>(
  entries?: ComponentRegistryInput<TComponent>,
): ComponentRegistry<TComponent> {
  return new ComponentRegistry(entries)
}

function isRegistration<TComponent>(
  value: TComponent | ComponentRegistration<TComponent>,
): value is ComponentRegistration<TComponent> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'component' in value
  )
}

function assertComponentName(name: string): void {
  if (!name.trim()) {
    throw new Error('SDUI component name must be a non-empty string')
  }
}
