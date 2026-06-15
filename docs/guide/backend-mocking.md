# Backend Mocking

Use MSW when you want local backend emulation for app development, Storybook or preview environments, e2e-like flows, and tests that should not depend on a real backend.

SDUI Kit does not depend on MSW. Keep MSW in the consuming app layer and point SDUI screen loaders and request executors at the mocked endpoints.

## Install

Install MSW as an app dev dependency:

::: code-group

```sh [npm]
npm install msw --save-dev
```

```sh [pnpm]
pnpm add msw --save-dev
```

```sh [yarn]
yarn add msw --dev
```

```sh [bun]
bun add msw --dev
```

:::

## Mock SDUI Screens

Define handlers in the app. The screen endpoint can read the requested route from a query parameter and return the same `SDUIScreenResponse` shape your real backend returns.

```ts
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import type { SDUIScreenResponse } from '@sdui-kit/core'

const applications = [
  { id: '42', name: 'Ada Lovelace', status: 'approved' },
  { id: '43', name: 'Grace Hopper', status: 'review' },
]

export const handlers = [
  http.get('/api/screens', ({ request }) => {
    const url = new URL(request.url)
    const path = url.searchParams.get('path') ?? '/applications'

    if (path === '/applications') {
      return HttpResponse.json<SDUIScreenResponse>({
        schemaVersion: '1.0',
        node: {
          componentName: 'ApplicationList',
          props: { applications },
        },
        data: { total: applications.length },
        cache: {
          key: 'screen:/applications',
          ttlMs: 30000,
          tags: [{ type: 'ApplicationList' }],
        },
      })
    }

    const detailsMatch = path.match(/^\/applications\/([^/]+)$/)
    const application = detailsMatch
      ? applications.find((item) => item.id === detailsMatch[1])
      : undefined

    if (application) {
      return HttpResponse.json<SDUIScreenResponse>({
        schemaVersion: '1.0',
        node: {
          componentName: 'ApplicationDetails',
          props: { application },
        },
        data: { id: application.id },
        cache: {
          key: `screen:/applications/${application.id}`,
          ttlMs: 30000,
          tags: [{ type: 'Application', id: application.id }],
        },
      })
    }

    return HttpResponse.json<SDUIScreenResponse>(
      {
        schemaVersion: '1.0',
        status: 'notFound',
        message: `No mocked screen for ${path}`,
      },
    )
  }),
]
```

## Connect ScreenLoader

The app `ScreenLoader` can call the mocked endpoint exactly like it would call the real backend. Pass through `signal` so route changes can cancel stale screen requests.

```ts
import type { ScreenLoader, SDUIScreenResponse } from '@sdui-kit/core'

export const screenLoader: ScreenLoader = async ({ route, signal }) => {
  const params = new URLSearchParams({ path: route.path })
  const response = await fetch(`/api/screens?${params}`, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load screen: ${response.status}`)
  }

  return response.json() as Promise<SDUIScreenResponse>
}
```

## Mock Request Actions

Request actions use the same network boundary. Mock the action endpoint with MSW, then configure `ActionRunner` to call `fetch`.

```ts
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('/api/applications', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>

    return HttpResponse.json(
      {
        id: '44',
        status: 'submitted',
        ...body,
      },
      { status: 201 },
    )
  }),
]
```

```ts
import { ActionRunner } from '@sdui-kit/core'

export const actionRunner = new ActionRunner({
  request: async ({ endpoint, method, body, params, headers, signal }) => {
    const url = new URL(endpoint, window.location.origin)
    const requestHeaders = new Headers()
    requestHeaders.set('Content-Type', 'application/json')

    if (params && typeof params === 'object') {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (value != null) {
          requestHeaders.set(key, String(value))
        }
      }
    }

    const hasBody = body != null && method !== 'GET' && method !== 'HEAD'
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response.json()
  },
})
```

Backend-provided actions stay framework-neutral:

```json
{
  "type": "request",
  "endpoint": "/api/applications",
  "method": "POST",
  "body": { "$from": "form.values" },
  "invalidate": [{ "type": "ApplicationList" }]
}
```

## Browser Dev Setup

Create a browser worker from the shared handlers:

```ts
// mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

Start it from the app entrypoint only in local mock mode:

```ts
async function enableMocks() {
  if (!import.meta.env.DEV || import.meta.env.VITE_MOCK_API !== 'true') {
    return
  }

  const { worker } = await import('./mocks/browser')
  await worker.start()
}

enableMocks().then(() => {
  renderApp()
})
```

MSW needs its browser worker file in the app public directory. In consuming apps, initialize it with the MSW CLI, for example `npx msw init public/`.

## Node/Vitest Setup

For Node-based tests, reuse the same handlers through `setupServer`:

```ts
// mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

Wire the server in a Vitest setup file:

```ts
// vitest.setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './mocks/node'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

This is app test configuration, not SDUI Kit runtime configuration.

## Route Manifest Mock

If your app loads a route manifest, mock it with the same handler list. The manifest remains framework-neutral and can be consumed by any router adapter.

```ts
import { http, HttpResponse } from 'msw'
import type { SDUIRouteManifest } from '@sdui-kit/core'

export const routeHandlers = [
  http.get('/api/routes', () =>
    HttpResponse.json<SDUIRouteManifest>({
      schemaVersion: '1.0',
      routes: [
        {
          id: 'applications.list',
          path: '/applications',
          screenId: 'applications.list',
          title: 'Applications',
        },
        {
          id: 'applications.details',
          path: '/applications/:id',
          screenId: 'applications.details',
          title: 'Application details',
          params: {
            id: { type: 'string', required: true },
          },
        },
      ],
    }),
  ),
]
```

Include `...routeHandlers` in the worker or server setup when the app needs manifest-backed navigation tests.
