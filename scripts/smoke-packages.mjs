import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const workspaceDir = dirname(rootDir)

const packages = [
  ['@sdui-kit/core', 'packages/core'],
  ['@sdui-kit/react', 'packages/react'],
  ['@sdui-kit/vue', 'packages/vue'],
  ['@sdui-kit/forms', 'packages/forms'],
  ['@sdui-kit/browser-history', 'packages/browser-history'],
  ['@sdui-kit/next', 'packages/next'],
  ['@sdui-kit/react-router', 'packages/react-router'],
  ['@sdui-kit/vue-router', 'packages/vue-router'],
  ['@sdui-kit/tanstack-query', 'packages/tanstack-query'],
  ['@sdui-kit/tanstack-router', 'packages/tanstack-router'],
]

for (const [packageName, packagePath] of packages) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `import(${JSON.stringify(packageName)}).then((mod) => console.log(${JSON.stringify(packageName)}, Object.keys(mod).length))`,
    ],
    {
      cwd: join(workspaceDir, packagePath),
      encoding: 'utf8',
      stdio: 'pipe',
    },
  )

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.stderr.write(result.stdout)
    process.exit(result.status ?? 1)
  }

  process.stdout.write(result.stdout)
}
