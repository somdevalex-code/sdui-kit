import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SDUI Kit',
  description: 'Framework-agnostic Server-Driven UI runtime',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Recipes', link: '/recipes/forms' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Protocol', link: '/guide/protocol' },
          { text: 'Actions', link: '/guide/actions' },
          { text: 'Forms', link: '/guide/forms' },
          { text: 'Adapters', link: '/guide/adapters' },
        ],
      },
      {
        text: 'Recipes',
        items: [{ text: 'Dynamic Forms', link: '/recipes/forms' }],
      },
    ],
  },
})
