import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SDUI Kit',
  description: 'Framework-agnostic Server-Driven UI runtime',
  cleanUrls: true,
  themeConfig: {
    search: {
      provider: 'local',
    },
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Protocol', link: '/guide/protocol' },
      { text: 'Runtime', link: '/guide/navigation-screens' },
      { text: 'Integrations', link: '/integrations/tanstack-query' },
      { text: 'Recipes', link: '/recipes/layouts' },
      { text: 'Examples', link: '/examples/react-basic' },
    ],
    sidebar: [
      {
        text: 'Start Here',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Component Registry', link: '/guide/registry' },
          { text: 'Backend Contract', link: '/guide/backend-contract' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Protocol', link: '/guide/protocol' },
          { text: 'Actions', link: '/guide/actions' },
          { text: 'Expressions', link: '/guide/expressions' },
          { text: 'Forms', link: '/guide/forms' },
          { text: 'Navigation & Screens', link: '/guide/navigation-screens' },
          { text: 'Data & Cache Adapters', link: '/guide/data-cache-adapters' },
          { text: 'Adapters', link: '/guide/adapters' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'TanStack Query', link: '/integrations/tanstack-query' },
          { text: 'React Router', link: '/integrations/react-router' },
          { text: 'Next App Router', link: '/integrations/next' },
          { text: 'Browser History', link: '/integrations/browser-history' },
          { text: 'RTK Query Pattern', link: '/integrations/rtk-query' },
        ],
      },
      {
        text: 'Recipes',
        items: [
          { text: 'Layouts & Cards', link: '/recipes/layouts' },
          { text: 'Action Flows', link: '/recipes/actions' },
          { text: 'Modals & Drawers', link: '/recipes/modals-drawers' },
          { text: 'Dynamic Forms', link: '/recipes/forms' },
          { text: 'Server Errors', link: '/recipes/server-errors' },
        ],
      },
      {
        text: 'Examples',
        items: [{ text: 'React Basic', link: '/examples/react-basic' }],
      },
    ],
  },
})
